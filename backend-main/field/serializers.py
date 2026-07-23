from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Field
from django.utils.translation import gettext_lazy as _


class FieldSerializerShort(serializers.ModelSerializer):
    class Meta:
        model = Field
        fields =  (
            "id",
            "no",
        )

class FieldSerializerRead(serializers.ModelSerializer):
    class Meta:
        model = Field
        fields = (
            "id",
            "no",
            "square",
            "pos_top_left_lat",
            "pos_top_left_lon",
            "pos_top_right_lat",
            "pos_top_right_lon",
            "pos_bottom_left_lat",
            "pos_bottom_left_lon",
            "pos_bottom_right_lat",
            "pos_bottom_right_lon",
        )


class FieldSerializerWrite(serializers.ModelSerializer):
    no = serializers.CharField(
        max_length=255,
        validators=[
            UniqueValidator(
                queryset=Field.objects.all(),
                message=_("Field with this number already exists.")
            )
        ]
    )

    class Meta:
        model = Field
        fields = (
            "id",
            "no",
            "square",
            "pos_top_left_lat",
            "pos_top_left_lon",
            "pos_top_right_lat",
            "pos_top_right_lon",
            "pos_bottom_left_lat",
            "pos_bottom_left_lon",
            "pos_bottom_right_lat",
            "pos_bottom_right_lon",
        )
