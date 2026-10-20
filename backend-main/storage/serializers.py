from decimal import Decimal, InvalidOperation
from django.utils import timezone
from rest_framework import serializers
from .models import StorageObject, SensorDevice, StorageSensor, FeedChemistry


class SensorDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorDevice
        fields = ['id', 'storage', 'name', 'device_id', 'is_active', 'created_at', 'last_seen']
        read_only_fields = ['created_at', 'last_seen']


class StorageSensorSerializer(serializers.ModelSerializer):
    status = serializers.ReadOnlyField()
    device = SensorDeviceSerializer(read_only=True)

    name = serializers.CharField(write_only=True, required=False)
    type = serializers.CharField(write_only=True, required=False)
    value = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = StorageSensor
        fields = ['id', 'temperature', 'humidity', 'status', 'device', 'name', 'type', 'value', 'created_at']
        extra_kwargs = {
            'temperature': {'required': False, 'max_digits': 6, 'decimal_places': 2},
            'humidity': {'required': False, 'max_digits': 6, 'decimal_places': 2},
        }

    def validate_type(self, value):
        if value not in ('temperature', 'humidity'):
            raise serializers.ValidationError(f"Unsupported type '{value}'")
        return value

    def validate_value(self, value):
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            raise serializers.ValidationError("value must be a number")

    def validate(self, attrs):
        # Either name/type/value format OR temperature/humidity format
        has_sensor_format = 'name' in attrs and 'type' in attrs and 'value' in attrs
        has_direct_format = 'temperature' in attrs or 'humidity' in attrs

        if not has_sensor_format and not has_direct_format:
            raise serializers.ValidationError(
                "Provide either {name, type, value} or {temperature, humidity}"
            )
        return attrs

    def create(self, validated_data):
        storage = validated_data.get('storage')

        if 'name' in validated_data:
            name = validated_data.pop('name')
            reading_type = validated_data.pop('type')
            value = validated_data.pop('value')

            device, _ = SensorDevice.objects.get_or_create(
                device_id=name,
                defaults={'storage': storage, 'name': name}
            )
            device.last_seen = timezone.now()
            device.save(update_fields=['last_seen'])

            validated_data['device'] = device
            validated_data[reading_type] = value

        # Set default 0 for missing field
        if 'temperature' not in validated_data:
            validated_data['temperature'] = Decimal('0')
        if 'humidity' not in validated_data:
            validated_data['humidity'] = Decimal('0')

        return super().create(validated_data)


class FeedChemistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedChemistry
        fields = [
            'id', 'sample_name', 'dry_matter', 'protein', 'fat', 'fiber',
            'ash', 'starch', 'sugar', 'energy', 'notes', 'created_at'
        ]


class StorageObjectSerializer(serializers.ModelSerializer):
    status = serializers.ReadOnlyField()
    latest_sensor = serializers.SerializerMethodField()

    class Meta:
        model = StorageObject
        fields = [
            'id', 'name', 'location', 'feed_type', 'culture', 'unit',
            'current_amount', 'max_capacity', 'notes',
            'status', 'latest_sensor', 'created_at'
        ]

    def get_latest_sensor(self, obj):
        sensor = obj.sensors.first()
        if sensor:
            return StorageSensorSerializer(sensor).data
        return None


class StorageObjectWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageObject
        fields = [
            'id', 'name', 'location', 'feed_type', 'culture', 'unit',
            'current_amount', 'max_capacity', 'notes'
        ]