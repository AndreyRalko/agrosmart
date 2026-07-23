from datetime import date, datetime, timedelta
from decimal import Decimal
import random

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from agro_operation.models import Condition, Field as AgroField, Operation
from animal.models import Animal, Breed, MilkQuality
from culture.models import Culture, CultureVariety
from field.models import Field
from integration.models import (
    Integration,
    IntegrationDataField,
    IntegrationField,
    IntegrationLog,
    IntegrationSource,
)
from machinery.models import Brand, Machinery, Type
from notification.models import Notification, NotificationSetting, NotificationType
from personal.models import Department, Person, Position
from task.models import Task
from transportation.models import TransportationOperation, TransportationTask


MAP_LAT = Decimal("53.132131")
MAP_LON = Decimal("68.987030")


def _field_corners(lat: Decimal, lon: Decimal, delta: Decimal = Decimal("0.004")):
    return {
        "pos_top_left_lat": lat + delta,
        "pos_top_left_lon": lon - delta,
        "pos_top_right_lat": lat + delta,
        "pos_top_right_lon": lon + delta,
        "pos_bottom_left_lat": lat - delta,
        "pos_bottom_left_lon": lon - delta,
        "pos_bottom_right_lat": lat - delta,
        "pos_bottom_right_lon": lon + delta,
    }


class Command(BaseCommand):
    help = "Заполняет БД демонстрационными данными для локальной разработки"

    def add_arguments(self, parser):
        parser.add_argument(
            "--refresh-integration",
            action="store_true",
            help="Пересоздать тестовые данные интеграций (погода и почва)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(42)
        summary = []

        summary.append(self._seed_org())
        summary.append(self._seed_machinery())
        summary.append(self._seed_animals())
        summary.append(self._seed_fields())
        summary.append(self._seed_cultures())
        summary.append(self._seed_integrations())
        summary.append(self._seed_integration_data(force=options["refresh_integration"]))
        summary.append(self._seed_agro_operations())
        summary.append(self._seed_tasks())
        summary.append(self._seed_notifications())

        self.stdout.write(self.style.SUCCESS("Демо-данные загружены:"))
        for line in summary:
            self.stdout.write(f"  • {line}")

    def _seed_org(self):
        dept, _ = Department.objects.get_or_create(
            name_ru="Агрономический отдел",
            defaults={"name_kk": "Агрономиялық бөлім"},
        )
        pos_mgr, _ = Position.objects.get_or_create(
            name_ru="Главный агроном",
            defaults={"name_kk": "Басты агроном"},
        )
        pos_op, _ = Position.objects.get_or_create(
            name_ru="Механизатор",
            defaults={"name_kk": "Механизатор"},
        )

        demo_user, created = User.objects.get_or_create(
            username="demo",
            defaults={"email": "demo@agrosmart.local", "first_name": "Демо"},
        )
        if created:
            demo_user.set_password("demo12345")
            demo_user.save()

        agr_user, created = User.objects.get_or_create(
            username="agronom",
            defaults={"email": "agronom@agrosmart.local", "first_name": "Айгуль"},
        )
        if created:
            agr_user.set_password("demo12345")
            agr_user.save()

        today = date.today()
        Person.objects.get_or_create(
            user=demo_user,
            defaults={
                "lastname": "Иванов",
                "firstname": "Демо",
                "patronymic": "Тестович",
                "birth_date": date(1985, 5, 12),
                "position": pos_mgr,
                "department": dept,
                "hiring_date": date(2020, 3, 1),
                "status": Person.Status.WORKING,
            },
        )
        Person.objects.get_or_create(
            user=agr_user,
            defaults={
                "lastname": "Касымова",
                "firstname": "Айгуль",
                "patronymic": "Сериковна",
                "birth_date": date(1990, 8, 20),
                "position": pos_op,
                "department": dept,
                "hiring_date": date(2022, 6, 15),
                "status": Person.Status.WORKING,
            },
        )
        return f"персонал: {Person.objects.count()} чел. (demo / agronom, пароль demo12345)"

    def _seed_machinery(self):
        brand, _ = Brand.objects.get_or_create(name="John Deere")
        mtype, _ = Type.objects.get_or_create(
            name_ru="Трактор",
            defaults={"name_kk": "Трактор"},
        )
        for i, (gov, year) in enumerate(
            [("A123BC01", 2019), ("B456DE02", 2021), ("C789FG03", 2018)], start=1
        ):
            Machinery.objects.get_or_create(
                gov_num=gov,
                defaults={"brand": brand, "type": mtype, "year_production": year},
            )
        return f"техника: {Machinery.objects.count()} ед."

    def _seed_animals(self):
        breed, _ = Breed.objects.get_or_create(
            name_ru="Голштинская",
            defaults={"name_kk": "Голштин"},
        )
        person = Person.objects.first()
        for i in range(1, 11):
            tag = f"KZ-DEMO-{i:03d}"
            Animal.objects.get_or_create(
                tag=tag,
                defaults={
                    "breed": breed,
                    "birthday": date(2020, 1, 1) + timedelta(days=i * 40),
                    "daily_yield_litre": 18 + (i % 7),
                },
            )

        if person:
            for animal in Animal.objects.all()[:5]:
                MilkQuality.objects.get_or_create(
                    animal=animal,
                    report_date=date.today(),
                    defaults={
                        "person_created": person,
                        "fat_percent": 38 + animal.id % 5,
                        "protein_percent": 32 + animal.id % 4,
                    },
                )
        return f"животные: {Animal.objects.count()} голов, анализы молока: {MilkQuality.objects.count()}"

    def _seed_fields(self):
        specs = [
            ("П-001", 120, MAP_LAT, MAP_LON),
            ("П-002", 85, MAP_LAT + Decimal("0.02"), MAP_LON + Decimal("0.015")),
            ("П-003", 200, MAP_LAT - Decimal("0.018"), MAP_LON - Decimal("0.012")),
            ("П-004", 64, MAP_LAT + Decimal("0.01"), MAP_LON - Decimal("0.02")),
        ]
        for no, square, lat, lon in specs:
            Field.objects.get_or_create(
                no=no,
                defaults={"square": square, **_field_corners(lat, lon)},
            )
        return f"поля: {Field.objects.count()} шт."

    def _seed_cultures(self):
        cultures = [
            ("Пшеница", "Бидай", [("Саратовская 29", {"N": 4.27, "P2O5": 1.24, "K2O": 2.05})]),
            ("Кукуруза", "Жүгері", [("ДКС 3511", {"N": 3.8, "P2O5": 1.5, "K2O": 3.1})]),
            ("Подсолнечник", "Күнбағыс", [("Лакомка", {"N": 5.2, "P2O5": 2.1, "K2O": 8.4})]),
        ]
        for name_ru, name_kk, varieties in cultures:
            culture, _ = Culture.objects.get_or_create(
                name_ru=name_ru,
                defaults={"name_kk": name_kk},
            )
            for variety_name, npk in varieties:
                CultureVariety.objects.get_or_create(
                    culture=culture,
                    name_ru=variety_name,
                    defaults={
                        "name_kk": variety_name,
                        "options": {"npk-removal": npk},
                    },
                )
        return f"культуры: {Culture.objects.count()}, сорта: {CultureVariety.objects.count()}"

    def _seed_integrations(self):
        tomorrow, _ = Integration.objects.get_or_create(
            api=IntegrationSource.TOMORROW_IO,
            defaults={
                "name": "Погода Tomorrow.io",
                "name_ru": "Погода Tomorrow.io",
                "name_kk": "Tomorrow.io ауа райы",
                "icon": "🌤️",
                "type": 0,
                "every_minute": 15,
                "headers_hard": {"apikey": "demo-tomorrow-key", "accept": "application/json"},
                "body_hard": {
                    "fields": ["temperature", "humidity", "windSpeed", "pressureSurfaceLevel"],
                    "units": "metric",
                    "timesteps": ["1h"],
                },
            },
        )
        stormglass, _ = Integration.objects.get_or_create(
            api=IntegrationSource.STORMGLASS,
            defaults={
                "name": "Почва Stormglass",
                "name_ru": "Почва Stormglass",
                "name_kk": "Stormglass топырағы",
                "icon": "🌱",
                "type": 0,
                "every_minute": 15,
                "headers_hard": {"Authorization": "demo-stormglass-key", "Accept": "application/json"},
            },
        )

        weather_fields = [
            ("Температура", "temperature_c"),
            ("Влажность", "humidity_percent"),
            ("Ветер", "wind_speed_m_s"),
            ("Давление", "pressure_hpa"),
        ]
        for label, key in weather_fields:
            IntegrationField.objects.get_or_create(
                integration=tomorrow,
                field_name=key,
                defaults={"name_ru": label, "name_kk": label},
            )

        soil_fields = [
            ("Влажность почвы", "soilMoisture"),
            ("Температура почвы", "soilTemperature"),
            ("Влажность 10 см", "soilMoisture10cm"),
            ("Температура 10 см", "soilTemperature10cm"),
        ]
        for label, key in soil_fields:
            IntegrationField.objects.get_or_create(
                integration=stormglass,
                field_name=key,
                defaults={"name_ru": label, "name_kk": label},
            )

        return f"интеграции: Tomorrow.io #{tomorrow.id}, Stormglass #{stormglass.id}"

    def _seed_integration_data(self, force=False):
        tomorrow = Integration.objects.filter(api=IntegrationSource.TOMORROW_IO).first()
        stormglass = Integration.objects.filter(api=IntegrationSource.STORMGLASS).first()
        fields = list(Field.objects.all())
        if not fields:
            return "данные интеграций: пропущено (нет полей)"

        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        created = 0

        if tomorrow:
            if force:
                IntegrationDataField.objects.filter(integration=tomorrow).delete()
            if IntegrationDataField.objects.filter(integration=tomorrow).count() < len(fields) * 6:
                created += self._fill_weather_data(tomorrow, fields, now)

        if stormglass:
            if force:
                IntegrationDataField.objects.filter(integration=stormglass).delete()
            if force or IntegrationDataField.objects.filter(integration=stormglass).count() < len(fields) * 6:
                created += self._fill_soil_data(stormglass, fields, now)
            else:
                created += self._patch_soil_temperatures(stormglass)

        return f"данные интеграций: +{created} записей (всего {IntegrationDataField.objects.count()})"

    def _fill_weather_data(self, integration, fields, now):
        log = IntegrationLog.objects.create(
            integration=integration,
            status=IntegrationLog.Status.OK,
            http_status=200,
            result={"source": "seed_demo"},
        )
        rows = []
        for field in fields:
            for hour in range(24):
                t = now - timedelta(hours=hour)
                base = 18 + (hour % 10) * 0.4
                rows.append(
                    IntegrationDataField(
                        integration=integration,
                        field=field,
                        integration_log=log,
                        time=t,
                        data={
                            "temperature_c": round(base + random.uniform(-2, 2), 1),
                            "humidity_percent": round(45 + random.uniform(0, 30), 1),
                            "wind_speed_m_s": round(2 + random.uniform(0, 5), 1),
                            "pressure_hpa": round(1010 + random.uniform(-8, 8), 1),
                            "precipitation_probability_percent": round(random.uniform(0, 60), 1),
                            "precipitation_intensity_mm_hr": round(random.uniform(0, 2), 2),
                        },
                    )
                )
        IntegrationDataField.objects.bulk_create(rows, ignore_conflicts=True)
        return len(rows)

    def _fill_soil_data(self, integration, fields, now):
        log = IntegrationLog.objects.create(
            integration=integration,
            status=IntegrationLog.Status.OK,
            http_status=200,
            result={"source": "seed_demo"},
        )
        rows = []
        for field in fields:
            for hour in range(24):
                t = now - timedelta(hours=hour)
                temp_base = 16 + (hour % 12) * 0.3
                rows.append(
                    IntegrationDataField(
                        integration=integration,
                        field=field,
                        integration_log=log,
                        time=t,
                        data={
                            "soilMoisture": round(0.22 + random.uniform(0, 0.12), 3),
                            "soilMoisture10cm": round(0.25 + random.uniform(0, 0.1), 3),
                            "soilMoisture40cm": round(0.28 + random.uniform(0, 0.08), 3),
                            "soilMoisture100cm": round(0.30 + random.uniform(0, 0.06), 3),
                            "soilTemperature": round(temp_base, 1),
                            "soilTemperature10cm": round(temp_base - 0.8, 1),
                            "soilTemperature40cm": round(temp_base - 1.5, 1),
                            "soilTemperature100cm": round(temp_base - 2.2, 1),
                        },
                    )
                )
        IntegrationDataField.objects.bulk_create(rows, ignore_conflicts=True)
        return len(rows)

    def _patch_soil_temperatures(self, integration):
        updated = 0
        for row in IntegrationDataField.objects.filter(integration=integration):
            data = dict(row.data)
            if data.get("soilTemperature") is not None:
                continue
            hour = row.time.hour if isinstance(row.time, datetime) else 12
            temp_base = 16 + (hour % 12) * 0.3
            data["soilTemperature"] = round(temp_base, 1)
            data["soilTemperature10cm"] = round(temp_base - 0.8, 1)
            data["soilTemperature40cm"] = round(temp_base - 1.5, 1)
            data["soilTemperature100cm"] = round(temp_base - 2.2, 1)
            data.setdefault("soilMoisture10cm", round(0.25 + random.uniform(0, 0.1), 3))
            row.data = data
            row.save(update_fields=["data"])
            updated += 1
        return updated

    def _seed_agro_operations(self):
        tomorrow = Integration.objects.filter(api=IntegrationSource.TOMORROW_IO).first()
        temp_field = (
            IntegrationField.objects.filter(integration=tomorrow, field_name="temperature_c").first()
            if tomorrow
            else None
        )
        variety = CultureVariety.objects.first()

        op_sow, _ = Operation.objects.get_or_create(
            name_ru="Посев",
            defaults={"name_kk": "Егу"},
        )
        op_spray, _ = Operation.objects.get_or_create(
            name_ru="Опрыскивание",
            defaults={"name_kk": "Шашу"},
        )

        temp_agro_field, _ = AgroField.objects.get_or_create(
            operation=op_sow,
            name_ru="Температура воздуха",
            defaults={
                "name_kk": "Ауа температурасы",
                "type": AgroField.Type.START,
                "required": True,
                "integration": tomorrow,
                "integration_field": temp_field,
            },
        )

        AgroField.objects.get_or_create(
            operation=op_sow,
            name_ru="Глубина заделки, см",
            defaults={
                "name_kk": "Енгізу тереңдігі, см",
                "type": AgroField.Type.FINISH,
                "required": True,
            },
        )

        if variety:
            Condition.objects.get_or_create(
                field=temp_agro_field,
                culture_variety=variety,
                defaults={"values": {"gte": 5, "lte": 30}},
            )

        TransportationOperation.objects.get_or_create(operation=op_spray)
        return f"агро-операции: {Operation.objects.count()} операций"

    def _seed_tasks(self):
        creator = Person.objects.filter(user__username="demo").first() or Person.objects.first()
        responsible = Person.objects.filter(user__username="agronom").first() or creator
        operation = Operation.objects.first()
        variety = CultureVariety.objects.first()
        physical_field = Field.objects.first()
        machinery = Machinery.objects.first()

        if not all([creator, responsible, operation, variety, physical_field]):
            return "задачи: пропущено (не хватает связанных данных)"

        task, created = Task.objects.get_or_create(
            operation=operation,
            culture_variety=variety,
            physical_field=physical_field,
            defaults={
                "creator": creator,
                "responsible": responsible,
                "status": Task.Status.IN_PROGRESS,
                "deadline": timezone.now() + timedelta(days=3),
                "note": "Демо-задача: проверка условий посева",
            },
        )

        if created and machinery and operation.name_ru == "Опрыскивание":
            TransportationTask.objects.get_or_create(
                task=task,
                defaults={
                    "machinery": machinery,
                    "from_place_name": "Склад ГСМ",
                    "to_place_name": physical_field.no,
                    "description": "Доставка СЗР на поле",
                },
            )

        Task.objects.get_or_create(
            operation=operation,
            culture_variety=variety,
            physical_field=Field.objects.exclude(id=physical_field.id).first() or physical_field,
            defaults={
                "creator": creator,
                "responsible": responsible,
                "status": Task.Status.CREATED,
                "deadline": timezone.now() + timedelta(days=7),
                "note": "Запланированная демо-задача",
            },
        )
        return f"задачи: {Task.objects.count()} шт."

    def _seed_notifications(self):
        person = Person.objects.first()
        field = Field.objects.first()
        variety = CultureVariety.objects.first()
        operation = Operation.objects.first()
        if not all([person, field, variety, operation]):
            return "уведомления: пропущено"

        setting, _ = NotificationSetting.objects.get_or_create(
            person=person,
            type=NotificationType.OPTIMAL_CONDITIONS,
            defaults={
                "params": {
                    "field_id": field.id,
                    "culture_variety_id": variety.id,
                    "operation_id": operation.id,
                },
                "every_minute": 60,
                "is_active": True,
            },
        )

        op_name = getattr(operation, "name_ru", None) or operation.name
        if not Notification.objects.filter(person=person, setting=setting).exists():
            Notification.objects.create(
                person=person,
                setting=setting,
                type=NotificationType.OPTIMAL_CONDITIONS,
                title_ru="Оптимальные условия для посева",
                title_kk="Егуге оңтайлы жағдай",
                msg_ru=f"На поле {field.no} условия подходят для операции «{op_name}».",
                msg_kk=f"{field.no} өрісінде «{op_name}» операциясына жағдай қолайлы.",
                payload={"field_id": field.id, "demo": True},
            )
        return f"уведомления: {Notification.objects.count()} шт."
