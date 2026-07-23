from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from core.serializer import TranslationSerializerReqLangMixinV2, TranslationSerializerMixin  # :contentReference[oaicite:1]{index=1}
from personal.serializers import PersonShortSerializer
from .models import Breed, Animal, MilkQuality

from django.utils.translation import gettext_lazy as _



# ---------- Breed ----------
class BreedSerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    class Meta:
        model = Breed
        fields = ("id", "name")


class BreedSerializerWrite(TranslationSerializerMixin, serializers.ModelSerializer):
    required_translation_fields = {"name": True}

    class Meta:
        model = Breed
        fields = ("id", "name")


# ---------- Animal ----------
class AnimalSerializerRead(serializers.ModelSerializer):
    breed = BreedSerializerRead(read_only=True)

    class Meta:
        model = Animal
        fields = ("id", "breed", "birthday", "tag", "daily_yield_litre")


class AnimalSerializerWrite(serializers.ModelSerializer):
    breed_id = serializers.PrimaryKeyRelatedField(
        queryset=Breed.objects.all(),
        source="breed",
        write_only=True
    )

    tag = serializers.CharField(
        max_length=255,
        validators=[
            UniqueValidator(queryset=Animal.objects.all(), message=_("Animal with this tag already exists."))
        ],
        trim_whitespace=True,
    )

    class Meta:
        model = Animal
        fields = ("id", "breed_id", "birthday", "tag", "daily_yield_litre")


# ---------- MilkQuality ----------
class MilkQualitySerializerRead(serializers.ModelSerializer):
    animal = AnimalSerializerRead(read_only=True)
    person_created = PersonShortSerializer(read_only=True)
    person_updated = PersonShortSerializer(read_only=True)

    class Meta:
        model = MilkQuality
        fields = (
            "id",
            "animal",
            "person_created",
            "person_updated",
            "report_date",
            "fat_percent",
            "protein_percent",
            "created_at",
            "updated_at",
        )


class MilkQualitySerializerWrite(serializers.ModelSerializer):
    animal_id = serializers.PrimaryKeyRelatedField(
        queryset=Animal.objects.all(),
        source="animal",
        write_only=True
    )

    class Meta:
        model = MilkQuality
        fields = (
            "id",
            "animal_id",
            "report_date",
            "fat_percent",
            "protein_percent",
        )

    def create(self, validated_data):
        return super().create(validated_data)
