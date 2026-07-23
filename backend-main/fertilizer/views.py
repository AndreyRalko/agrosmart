from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.drf_permissions import ModulePermission

from culture.models import CultureVariety
from .serializers import (
    FertilizerDoseRequestSerializer,
    FertilizerDoseResponseSerializer,
)


NPK_REMOVAL_STAGE = "npk_removal"
ACTIVE_SUBSTANCE_DOSE_STAGE = "active_substance_dose"


class FertilizerDoseViewSet(viewsets.GenericViewSet):
    module_key = "fertilizer"
    permission_classes = [IsAuthenticated, ModulePermission]
    @extend_schema(
        request=FertilizerDoseRequestSerializer,
        responses=FertilizerDoseResponseSerializer,
    )
    @action(detail=False, methods=["post"], url_path="dose")
    def dose(self, request):
        serializer = FertilizerDoseRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        culture_variety = serializer.validated_data["culture_variety"]
        planned_yield = serializer.validated_data["planned_yield"]
        nutrients_input = serializer.validated_data["nutrients"]

        results = {}
        errors = {}
        npk_removal = (culture_variety.options or {}).get(
            CultureVariety.OptionKeys.npk_removal,
            {},
        )

        for nutrient_key, nutrient_input in nutrients_input.items():
            nutrient_errors = []
            removal = self._get_nutrient_removal(
                npk_removal=npk_removal,
                nutrient_key=nutrient_key,
                errors=nutrient_errors,
            )

            fertilizer_coefficient = nutrient_input[
                "mineral_fertilizer_utilization_coefficient"
            ]
            if fertilizer_coefficient == 0:
                nutrient_errors.append({
                    "stage": ACTIVE_SUBSTANCE_DOSE_STAGE,
                    "detail": _(
                        "Mineral fertilizer utilization coefficient cannot be zero."
                    ),
                })

            if nutrient_errors:
                errors[nutrient_key] = nutrient_errors
                continue

            total_requirement = planned_yield * removal
            from_soil = (
                nutrient_input["available_soil_content"]
                * nutrient_input["soil_utilization_coefficient"]
            )
            deficit = max(
                total_requirement
                - from_soil
                - nutrient_input.get("organic_supply", 0),
                0,
            )

            results[nutrient_key] = {
                "nutrient_removal": removal,
                "total_requirement": total_requirement,
                "from_soil": from_soil,
                "deficit": deficit,
                "active_substance_dose": deficit / fertilizer_coefficient,
            }

        if errors:
            raise ValidationError({"nutrients": errors})

        response_serializer = FertilizerDoseResponseSerializer({
            "culture_variety": culture_variety.id,
            "planned_yield": planned_yield,
            "nutrients": results,
        })
        return Response(response_serializer.data)

    def _get_nutrient_removal(self, npk_removal, nutrient_key, errors):
        if not isinstance(npk_removal, dict):
            errors.append({
                "stage": NPK_REMOVAL_STAGE,
                "detail": _("NPK removal must be an object."),
            })
            return None

        value = npk_removal.get(nutrient_key)
        if value in (None, ""):
            errors.append({
                "stage": NPK_REMOVAL_STAGE,
                "detail": _(
                    "NPK removal for %(nutrient)s is not filled."
                ) % {"nutrient": nutrient_key},
            })
            return None

        try:
            return float(value) * 10
        except (TypeError, ValueError):
            errors.append({
                "stage": NPK_REMOVAL_STAGE,
                "detail": _(
                    "NPK removal for %(nutrient)s must be a number."
                ) % {"nutrient": nutrient_key},
            })
            return None
