from rest_framework import serializers
from storage.models import StorageObject
from .models import Feed, NutritionNorm, Ration, RationFeed, feed_for_storage


class FeedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feed
        fields = [
            'id', 'name', 'dry_matter', 'energy', 'protein', 'fiber',
            'fat', 'ndf', 'starch', 'calcium', 'phosphorus', 'price_per_kg', 'created_at'
        ]


class NutritionNormSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionNorm
        fields = '__all__'


class RationFeedSerializer(serializers.ModelSerializer):
    feed = FeedSerializer(read_only=True)
    feed_id = serializers.PrimaryKeyRelatedField(
        queryset=Feed.objects.all(), source='feed', write_only=True, required=False,
    )
    storage_id = serializers.PrimaryKeyRelatedField(
        queryset=StorageObject.objects.all(), source='storage', required=False, allow_null=True,
    )
    storage_name = serializers.SerializerMethodField()

    class Meta:
        model = RationFeed
        fields = ['id', 'feed', 'feed_id', 'storage_id', 'storage_name', 'quantity_kg']

    def get_storage_name(self, obj):
        return obj.storage.name if obj.storage_id else None

    def validate_quantity_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError('Укажите количество больше 0')
        return value

    def validate(self, attrs):
        storage = attrs.get('storage', serializers.empty)
        feed = attrs.get('feed', serializers.empty)
        if self.instance is None and storage is serializers.empty and feed is serializers.empty:
            raise serializers.ValidationError({'storage_id': 'Выберите склад'})
        ration = self.context.get('ration') or (self.instance.ration if self.instance else None)
        chosen = storage if storage is not serializers.empty else None
        if chosen is not None and ration is not None:
            clash = RationFeed.objects.filter(ration=ration, storage=chosen)
            if self.instance is not None:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({'storage_id': 'Этот склад уже есть в рационе'})
        return attrs

    def create(self, validated_data):
        storage = validated_data.get('storage')
        if storage is not None:
            validated_data['feed'] = feed_for_storage(storage)
        elif 'feed' not in validated_data:
            raise serializers.ValidationError({'storage_id': 'Выберите склад'})
        return super().create(validated_data)

    def update(self, instance, validated_data):
        storage = validated_data.get('storage')
        if storage is not None:
            validated_data['feed'] = feed_for_storage(storage)
        return super().update(instance, validated_data)


class RationSerializer(serializers.ModelSerializer):
    ration_feeds = RationFeedSerializer(many=True, read_only=True)
    nutrition = serializers.SerializerMethodField()
    deviations = serializers.SerializerMethodField()
    deviation_count = serializers.SerializerMethodField()

    class Meta:
        model = Ration
        fields = [
            'id', 'name', 'ration_type', 'animal_group', 'animal_count',
            'date_start', 'date_end', 'notes', 'is_active',
            'ration_feeds', 'nutrition', 'deviations', 'deviation_count', 'created_at'
        ]

    def get_nutrition(self, obj):
        return obj.get_nutrition()

    def get_deviations(self, obj):
        return obj.get_deviations()

    def get_deviation_count(self, obj):
        return len(obj.get_deviations())


class RationStorageLineSerializer(serializers.Serializer):
    storage_id = serializers.PrimaryKeyRelatedField(queryset=StorageObject.objects.all())
    quantity_kg = serializers.DecimalField(max_digits=8, decimal_places=3)

    def validate_quantity_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError('Укажите количество больше 0')
        return value


class RationWriteSerializer(serializers.ModelSerializer):
    items = RationStorageLineSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Ration
        fields = [
            'id', 'name', 'ration_type', 'animal_group', 'animal_count',
            'date_start', 'date_end', 'notes', 'is_active', 'items',
        ]

    def validate_items(self, items):
        ids = [line['storage_id'].pk for line in items]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError('Один склад нельзя добавить дважды')
        return items

    def create(self, validated_data):
        items = validated_data.pop('items', [])
        ration = super().create(validated_data)
        RationFeed.objects.bulk_create([
            RationFeed(
                ration=ration,
                storage=line['storage_id'],
                feed=feed_for_storage(line['storage_id']),
                quantity_kg=line['quantity_kg'],
            )
            for line in items
        ])
        return ration

    def update(self, instance, validated_data):
        validated_data.pop('items', None)
        return super().update(instance, validated_data)