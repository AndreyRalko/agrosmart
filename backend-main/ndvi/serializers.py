from rest_framework import serializers
from field.models import Field
from .models import DroneUpload


class DroneUploadSerializer(serializers.ModelSerializer):
    field_no = serializers.CharField(source='field.no', read_only=True)
    ndvi_image_url = serializers.SerializerMethodField()

    class Meta:
        model = DroneUpload
        fields = [
            'id',
            'field',
            'field_no',
            'flight_date',
            'uploaded_at',
            'original_filename',
            'file_size_mb',
            'file_type',
            'ndvi_mean',
            'ndvi_min',
            'ndvi_max',
            'ndvi_std',
            'ndvi_image_url',
        ]

    def get_ndvi_image_url(self, obj):
        request = self.context.get('request')
        if obj.ndvi_image and request:
            return request.build_absolute_uri(obj.ndvi_image.url)
        return None


class DroneUploadCreateSerializer(serializers.Serializer):
    field = serializers.PrimaryKeyRelatedField(queryset=Field.objects.all())
    flight_date = serializers.DateField()
    file = serializers.FileField()