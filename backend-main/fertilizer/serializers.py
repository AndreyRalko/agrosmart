from rest_framework import serializers

from culture.models import CultureVariety


class FertilizerDoseNutrientInputSerializer(serializers.Serializer):
    available_soil_content = serializers.FloatField(min_value=0)
    soil_utilization_coefficient = serializers.FloatField(min_value=0)
    mineral_fertilizer_utilization_coefficient = serializers.FloatField(min_value=0)
    organic_supply = serializers.FloatField(min_value=0, required=False, default=0)


class FertilizerDoseNutrientsInputSerializer(serializers.Serializer):
    N = FertilizerDoseNutrientInputSerializer()
    P2O5 = FertilizerDoseNutrientInputSerializer()
    K2O = FertilizerDoseNutrientInputSerializer()


class FertilizerDoseRequestSerializer(serializers.Serializer):
    culture_variety = serializers.PrimaryKeyRelatedField(
        queryset=CultureVariety.objects.all()
    )
    planned_yield = serializers.FloatField(min_value=0)
    nutrients = FertilizerDoseNutrientsInputSerializer()


class FertilizerDoseNutrientResultSerializer(serializers.Serializer):
    nutrient_removal = serializers.FloatField()
    total_requirement = serializers.FloatField()
    from_soil = serializers.FloatField()
    deficit = serializers.FloatField()
    active_substance_dose = serializers.FloatField()


class FertilizerDoseNutrientsResultSerializer(serializers.Serializer):
    N = FertilizerDoseNutrientResultSerializer()
    P2O5 = FertilizerDoseNutrientResultSerializer()
    K2O = FertilizerDoseNutrientResultSerializer()


class FertilizerDoseResponseSerializer(serializers.Serializer):
    culture_variety = serializers.IntegerField()
    planned_yield = serializers.FloatField()
    nutrients = FertilizerDoseNutrientsResultSerializer()
