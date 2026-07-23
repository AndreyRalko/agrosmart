from django.contrib.auth.models import User
from django.urls import reverse
from django_celery_beat.models import PeriodicTask
from rest_framework import status
from rest_framework.test import APITestCase

from agro_operation.models import Condition, Field as AgroField, Operation
from culture.models import Culture, CultureVariety
from field.models import Field
from personal.models import Department, Person, Position

from .models import Notification, NotificationSetting
from .tasks import run_notification_setting_check


class NotificationTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pass")
        department = Department.objects.create(name="dep")
        position = Position.objects.create(name="pos")
        self.person = Person.objects.create(
            user=self.user,
            lastname="Tester",
            firstname="User",
            patronymic="",
            birth_date="1990-01-01",
            position=position,
            department=department,
            hiring_date="2024-01-01",
        )
        self.client.force_authenticate(self.user)

        self.field = Field.objects.create(
            no="F-1",
            square=100,
            pos_top_left_lat=0,
            pos_top_left_lon=0,
            pos_top_right_lat=0,
            pos_top_right_lon=1,
            pos_bottom_left_lat=1,
            pos_bottom_left_lon=0,
            pos_bottom_right_lat=1,
            pos_bottom_right_lon=1,
        )
        self.operation = Operation.objects.create(
            name="Посев",
            name_ru="Посев",
            name_kk="Егу",
        )
        self.agro_field = AgroField.objects.create(
            name="Температура",
            name_ru="Температура",
            name_kk="Температура",
            operation=self.operation,
            integration=None,
            integration_field=None,
            type=AgroField.Type.START,
            required=True,
        )
        self.culture = Culture.objects.create(
            name="Пшеница",
            name_ru="Пшеница",
            name_kk="Бидай",
        )
        self.culture_variety = CultureVariety.objects.create(
            culture=self.culture,
            name="Яровая",
            name_ru="Яровая",
            name_kk="Жаздық",
        )

    def test_create_setting_creates_periodic_task(self):
        response = self.client.post(
            reverse("notification-setting-list"),
            data={
                "type": "optimal_conditions",
                "params": {
                    "field_id": self.field.id,
                    "culture_variety_id": self.culture_variety.id,
                    "operation_id": self.operation.id,
                },
                "every_minute": 30,
                "min_look_ahead_hours": 1,
                "look_ahead_hours": 6,
                "active_from_hour": 4,
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        setting = NotificationSetting.objects.get(id=response.data["id"])

        periodic_task = PeriodicTask.objects.get(name=f"notification-setting-{setting.id}")
        self.assertEqual(periodic_task.task, "notification.tasks.run_notification_setting_check")
        self.assertEqual(periodic_task.interval.every, 30)

    def test_run_check_creates_notification_for_matching_setting(self):
        Condition.objects.create(
            field=self.agro_field,
            culture_variety=self.culture_variety,
            values={"gte": 10},
        )
        setting = NotificationSetting.objects.create(
            person=self.person,
            type="optimal_conditions",
            params={
                "field_id": self.field.id,
                "culture_variety_id": self.culture_variety.id,
                "operation_id": self.operation.id,
            },
            every_minute=60,
            min_look_ahead_hours=1,
            look_ahead_hours=6,
            active_from_hour=0,
            is_active=True,
        )

        result = run_notification_setting_check(setting.id)

        self.assertTrue(result["created"])
        notification = Notification.objects.get(setting=setting)
        self.assertEqual(notification.person, self.person)
        self.assertTrue(notification.title_ru)
        self.assertTrue(notification.title_kk)
        self.assertIn("F-1", notification.msg)
        self.assertTrue(notification.msg_ru)
        self.assertTrue(notification.msg_kk)

    def test_run_check_does_not_duplicate_unread_notification(self):
        Condition.objects.create(
            field=self.agro_field,
            culture_variety=self.culture_variety,
            values={"gte": 10},
        )
        setting = NotificationSetting.objects.create(
            person=self.person,
            type="optimal_conditions",
            params={
                "field_id": self.field.id,
                "culture_variety_id": self.culture_variety.id,
                "operation_id": self.operation.id,
            },
            every_minute=60,
            min_look_ahead_hours=1,
            look_ahead_hours=6,
            active_from_hour=0,
            is_active=True,
        )

        first_result = run_notification_setting_check(setting.id)
        second_result = run_notification_setting_check(setting.id)

        self.assertTrue(first_result["created"])
        self.assertEqual(second_result["reason"], "duplicate")
        self.assertEqual(Notification.objects.filter(setting=setting).count(), 1)

    def test_run_check_skips_when_operation_not_matching_culture(self):
        setting = NotificationSetting.objects.create(
            person=self.person,
            type="optimal_conditions",
            params={
                "field_id": self.field.id,
                "culture_variety_id": self.culture_variety.id,
                "operation_id": self.operation.id,
            },
            every_minute=60,
            min_look_ahead_hours=1,
            look_ahead_hours=6,
            active_from_hour=0,
            is_active=True,
        )

        result = run_notification_setting_check(setting.id)

        self.assertFalse(result["created"])
        self.assertEqual(result["reason"], "not_matching")
        self.assertFalse(Notification.objects.filter(setting=setting).exists())
