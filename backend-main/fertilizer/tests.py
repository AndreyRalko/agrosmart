from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from culture.models import Culture, CultureVariety


class FertilizerDoseTests(APITestCase):
    endpoint = "/fertilizer/dose/"

    def setUp(self):
        self.user = User.objects.create_user(username="tester")
        self.client.force_authenticate(self.user)
        self.culture = Culture.objects.create(name="Wheat")

    def test_calculates_fertilizer_dose_for_all_nutrients(self):
        culture_variety = CultureVariety.objects.create(
            culture=self.culture,
            name="Wheat variety",
            options={
                "npk-removal": {
                    "N": 4.27,
                    "P2O5": 1.24,
                    "K2O": 2.05,
                }
            },
        )

        response = self.client.post(
            self.endpoint,
            {
                "culture_variety": culture_variety.id,
                "planned_yield": 1.7,
                "nutrients": {
                    "N": {
                        "available_soil_content": 36,
                        "soil_utilization_coefficient": 0.3,
                        "mineral_fertilizer_utilization_coefficient": 0.6,
                    },
                    "P2O5": {
                        "available_soil_content": 90,
                        "soil_utilization_coefficient": 0.2,
                        "mineral_fertilizer_utilization_coefficient": 0.2,
                    },
                    "K2O": {
                        "available_soil_content": 12.6,
                        "soil_utilization_coefficient": 0.4,
                        "mineral_fertilizer_utilization_coefficient": 0.7,
                    },
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertAlmostEqual(response.data["nutrients"]["N"]["nutrient_removal"], 42.7)
        self.assertAlmostEqual(response.data["nutrients"]["N"]["total_requirement"], 72.59)
        self.assertAlmostEqual(response.data["nutrients"]["N"]["from_soil"], 10.8)
        self.assertAlmostEqual(response.data["nutrients"]["N"]["deficit"], 61.79)
        self.assertAlmostEqual(response.data["nutrients"]["N"]["active_substance_dose"], 102.98333333333333)

    def test_returns_stage_error_when_npk_removal_is_not_filled(self):
        culture_variety = CultureVariety.objects.create(
            culture=self.culture,
            name="Wheat variety",
            options={"npk-removal": {"N": 4.27, "P2O5": 1.24}},
        )

        response = self.client.post(
            self.endpoint,
            self._payload(culture_variety.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["nutrients"]["K2O"][0]["stage"],
            "npk_removal",
        )

    def test_returns_stage_error_when_fertilizer_coefficient_is_zero(self):
        culture_variety = CultureVariety.objects.create(
            culture=self.culture,
            name="Wheat variety",
            options={
                "npk-removal": {
                    "N": 4.27,
                    "P2O5": 1.24,
                    "K2O": 2.05,
                }
            },
        )
        payload = self._payload(culture_variety.id)
        payload["nutrients"]["N"]["mineral_fertilizer_utilization_coefficient"] = 0

        response = self.client.post(self.endpoint, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["nutrients"]["N"][0]["stage"],
            "active_substance_dose",
        )

    def _payload(self, culture_variety_id):
        nutrient_input = {
            "available_soil_content": 10,
            "soil_utilization_coefficient": 0.2,
            "mineral_fertilizer_utilization_coefficient": 0.5,
        }
        return {
            "culture_variety": culture_variety_id,
            "planned_yield": 1,
            "nutrients": {
                "N": nutrient_input.copy(),
                "P2O5": nutrient_input.copy(),
                "K2O": nutrient_input.copy(),
            },
        }
