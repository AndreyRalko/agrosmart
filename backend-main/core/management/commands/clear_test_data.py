from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import connection, transaction

from agro_operation.models import AlertOperationToCulture, Condition, Field as AgroField, Operation
from animal.models import Animal, Breed, MilkQuality
from culture.models import Culture, CultureVariety
from field.models import Field
from integration.models import (
    Integration,
    IntegrationDataField,
    IntegrationField,
    IntegrationLog,
    IntegrationSource,
    IntegrationTemperatureField,
)
from notification.models import Notification, NotificationSetting
from personal.models import Department, Person, Position
from task.models import Task


def _raw_delete(table: str):
    with connection.cursor() as cursor:
        cursor.execute(f"DELETE FROM {table}")


class Command(BaseCommand):
    help = "Удаляет тестовые данные, оставляя только интеграцию Stormglass и её записи"

    @transaction.atomic
    def handle(self, *args, **options):
        stormglass_api = IntegrationSource.STORMGLASS
        stormglass = Integration.objects.filter(api=stormglass_api).first()

        if not stormglass:
            self.stdout.write(self.style.WARNING("Интеграция Stormglass не найдена — будут удалены все данные интеграций"))

        field_ids_with_stormglass = set(
            IntegrationDataField.objects.filter(integration__api=stormglass_api).values_list("field_id", flat=True)
        )

        Task.objects.all().delete()
        _raw_delete("transportation_transportationtask")

        Notification.objects.all().delete()
        NotificationSetting.objects.all().delete()

        Condition.objects.all().delete()
        AlertOperationToCulture.objects.all().delete()
        AgroField.objects.all().delete()
        _raw_delete("transportation_transportationoperation")
        Operation.objects.all().delete()

        MilkQuality.objects.all().delete()
        Animal.objects.all().delete()
        Breed.objects.all().delete()

        _raw_delete("transportation_transportationtask")
        _raw_delete("machinery_machinery")
        _raw_delete("machinery_brand")
        _raw_delete("machinery_type")

        CultureVariety.objects.all().delete()
        Culture.objects.all().delete()

        IntegrationTemperatureField.objects.exclude(integration__api=stormglass_api).delete()
        IntegrationDataField.objects.exclude(integration__api=stormglass_api).delete()
        IntegrationLog.objects.exclude(integration__api=stormglass_api).delete()
        IntegrationField.objects.exclude(integration__api=stormglass_api).delete()
        deleted_integrations = Integration.objects.exclude(api=stormglass_api).delete()

        if field_ids_with_stormglass:
            removed_fields, _ = Field.objects.exclude(id__in=field_ids_with_stormglass).delete()
        else:
            removed_fields, _ = Field.objects.all().delete()

        Person.objects.filter(user__username__in=["demo", "agronom"]).delete()
        User.objects.filter(username__in=["demo", "agronom"]).delete()

        Department.objects.filter(name_ru="Агрономический отдел").delete()
        Position.objects.filter(name_ru__in=["Главный агроном", "Механизатор"]).delete()

        sg_rows = IntegrationDataField.objects.filter(integration__api=stormglass_api).count()
        sg_fields = Field.objects.filter(id__in=field_ids_with_stormglass).count()

        self.stdout.write(self.style.SUCCESS("Тестовые данные удалены."))
        self.stdout.write(f"  Stormglass: интеграция #{stormglass.id if stormglass else '—'}")
        self.stdout.write(f"  Записей почвы: {sg_rows}")
        self.stdout.write(f"  Полей с данными Stormglass: {sg_fields}")
        self.stdout.write(f"  Удалено интеграций: {deleted_integrations[0]}")
        self.stdout.write(f"  Удалено полей без Stormglass: {removed_fields}")
