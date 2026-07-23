from django.utils.translation import gettext_lazy as _

from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import Brand, Type, Machinery
from core.serializer import TranslationSerializerReqLangMixinV2, TranslationSerializerMixin


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ("id", "name")


class TypeSerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    class Meta:
        model = Type
        fields = ("id", "name")


class TypeSerializerWrite(TranslationSerializerMixin, serializers.ModelSerializer):
    required_translation_fields = {
        "name": True,
    }

    class Meta:
        model = Type
        fields = ("id", "name")


class MachinerySerializerRead(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    type = TypeSerializerRead(read_only=True)

    class Meta:
        model = Machinery
        fields = ("id", "brand", "type", "year_production", "gov_num")


class MachinerySerializerWrite(serializers.ModelSerializer):
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(),
        source="brand",
        write_only=True
    )
    type_id = serializers.PrimaryKeyRelatedField(
        queryset=Type.objects.all(),
        source="type",
        write_only=True
    )

    gov_num = serializers.CharField(
        max_length=100,
        validators=[
            UniqueValidator(
                queryset=Machinery.objects.all(),
                message=_("Machinery with this government number already exists.")
            )
        ],
        trim_whitespace=True
    )

    class Meta:
        model = Machinery
        fields = ("id", "brand_id", "type_id", "year_production", "gov_num")
