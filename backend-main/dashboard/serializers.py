from rest_framework import serializers


class DashboardItemMetric(serializers.Serializer):
    min = serializers.FloatField()
    max = serializers.FloatField()
    avg = serializers.FloatField()


class DashboardMilkQualityItem(serializers.Serializer):
    collected = serializers.IntegerField(required=True)
    left_to_collect = serializers.IntegerField(required=True)

    fat = DashboardItemMetric(required=True)
    protein = DashboardItemMetric(required=True)



class DashboardMilkQualitySerializer(serializers.Serializer):
    today = DashboardMilkQualityItem(required=True)
    yesterday = DashboardMilkQualityItem(required=True)


class DashboardAnimalSerializer(serializers.Serializer):
    total = serializers.IntegerField(required=True)
    milk_quality = DashboardMilkQualitySerializer(required=True)


class DashboardPersonSerializer(serializers.Serializer):
    total_working = serializers.IntegerField(required=True)
    total_vacation = serializers.IntegerField(required=True)
    today_birthday = serializers.IntegerField(required=True)

    hired_last_7d = serializers.IntegerField(required=True)
    hired_last_30d = serializers.IntegerField(required=True)

    fired_last_7d = serializers.IntegerField(required=True)
    fired_last_30d = serializers.IntegerField(required=True)


class DashboardMachinerySerializer(serializers.Serializer):
    total = serializers.IntegerField(required=True)
    year_production = DashboardItemMetric(required=True)


class DashboardSerializer(serializers.Serializer):
    animal = DashboardAnimalSerializer(required=True)
    person = DashboardPersonSerializer(required=True)
    machinery = DashboardMachinerySerializer(required=True)
