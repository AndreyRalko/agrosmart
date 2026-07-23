from datetime import date, timedelta

from django.db import connection
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.drf_permissions import ModulePermission
from .serializers import DashboardSerializer
from . import sqls


class DashboardView(APIView):
    http_method_names = ["get"]
    serializer_class = DashboardSerializer
    module_key = "dashboard"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get(self, request):
        return Response(
            self.serializer_class(
                dict(
                    animal=self.get_animal(),
                    person=self.get_person(),
                    machinery=self.get_machinery(),
                )
            ).data
        )

    def get_animal(self):
        with connection.cursor() as cursor:
            cursor.execute(sqls.sql_animal_total)
            animals_data = cursor.fetchone()

            dt = date.today()
            cursor.execute(sqls.sql_milk_quality, [dt])
            milk_quality_today_data = cursor.fetchone()

            dt_yesterday = dt - timedelta(days=1)
            cursor.execute(sqls.sql_milk_quality, [dt_yesterday])
            milk_quality_yesterday_data = cursor.fetchone()

        return dict(
            total=animals_data[0],
            milk_quality=dict(
                today=sqls.get_milk_quality_metrics(milk_quality_today_data),
                yesterday=sqls.get_milk_quality_metrics(milk_quality_yesterday_data),
            )
        )

    def get_person(self):
        with connection.cursor() as cursor:
            cursor.execute(sqls.get_sql_person(connection.vendor))
            data = cursor.fetchone()

        return dict(
            total_working=data[0],
            total_vacation=data[1],
            today_birthday=data[2],
            hired_last_7d=data[3],
            hired_last_30d=data[4],
            fired_last_7d=data[5],
            fired_last_30d=data[6],
        )

    def get_machinery(self):
        with connection.cursor() as cursor:
            cursor.execute(sqls.sql_machinery)
            data = cursor.fetchone()

        return dict(
            total=data[0],
            year_production=dict(
                min=data[1],
                avg=data[2],
                max=data[3],
            )
        )