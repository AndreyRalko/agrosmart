from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from rest_framework import serializers
from django.db import transaction
from .models import Person, Position, Department, PositionModulePermission
from personal.modules import MODULE_KEYS
from personal.permissions_service import serialize_position_permissions, sync_position_permissions

from core.serializer import TranslationSerializerReqLangMixinV2, TranslationSerializerMixin

STATUS_CHOICES = (
    (Person.Status.WORKING, _("working")),
    (Person.Status.VACATION, _("vacation")),
    (Person.Status.FIRED, _("fired")),
)


class PositionSerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = (
            "id", "name",
        )


class DepartmentSerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = (
            "id", "name",
        )


class PositionModulePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PositionModulePermission
        fields = ("module", "can_view", "can_create", "can_edit", "can_delete")


class PositionSerializer(TranslationSerializerMixin, serializers.ModelSerializer):
    required_translation_fields = {
        "name": True,
    }
    module_permissions = PositionModulePermissionSerializer(many=True, required=False)

    class Meta:
        model = Position
        fields = (
            "id",
            "name",
            "module_permissions",
        )

    def validate_module_permissions(self, value):
        if value is None:
            return value
        seen = set()
        for item in value:
            module = item.get("module")
            if module not in MODULE_KEYS:
                raise serializers.ValidationError(
                    _("Unknown module: %(module)s") % {"module": module}
                )
            if module in seen:
                raise serializers.ValidationError(
                    _("Duplicate module: %(module)s") % {"module": module}
                )
            seen.add(module)
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["module_permissions"] = serialize_position_permissions(instance)
        return data

    @transaction.atomic
    def create(self, validated_data):
        module_permissions = validated_data.pop("module_permissions", None)
        position = super().create(validated_data)
        sync_position_permissions(position, module_permissions)
        return position

    @transaction.atomic
    def update(self, instance, validated_data):
        module_permissions = validated_data.pop("module_permissions", None)
        position = super().update(instance, validated_data)
        if module_permissions is not None:
            sync_position_permissions(position, module_permissions)
        return position


class DepartmentSerializer(TranslationSerializerMixin, serializers.ModelSerializer):
    required_translation_fields = {
        "name": True,
    }

    class Meta:
        model = Department
        fields = (
            "id", "name",
        )

class PersonShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = (
            "id",
            "lastname",
            "firstname",
            "patronymic",
        )

class PersonSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)

    password = serializers.CharField(write_only=True, allow_null=False, source="user.password")
    email = serializers.EmailField(required=True, allow_null=False, source="user.email")

    lastname = serializers.CharField(max_length=100, allow_null=False)
    firstname = serializers.CharField(max_length=100, allow_null=False)
    patronymic = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    birth_date = serializers.DateField(allow_null=False)

    position = PositionSerializerRead(read_only=True)
    position_id = serializers.PrimaryKeyRelatedField(queryset=Position.objects.all(), allow_null=False,
                                                     source="position",
                                                     write_only=True)

    department = DepartmentSerializerRead(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), allow_null=False,
                                                       source="department",
                                                       write_only=True)

    hiring_date = serializers.DateField(allow_null=False)
    firing_date = serializers.DateField(allow_null=True, required=False)
    status = serializers.ChoiceField(STATUS_CHOICES, required=False)

    def validate_email(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(_("email already exists"))
        return value

    def validate_password(self, value):
        try:
            user = self.instance.user if self.instance is not None else None
            if user is not None and user.check_password(value):
                raise serializers.ValidationError(_("password is same as previous password"))
            validate_password(value, user=user)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))

        return value

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data["user"]
        user = User.objects.create_user(
            username=user_data["email"],
            password=user_data["password"],
            email=user_data["email"],
        )

        person = Person.objects.create(
            user=user,
            lastname=validated_data["lastname"],
            firstname=validated_data["firstname"],
            patronymic=validated_data.get("patronymic"),
            birth_date=validated_data["birth_date"],
            position=validated_data["position"],
            department=validated_data["department"],
            hiring_date=validated_data["hiring_date"],
            status=Person.Status.WORKING
        )

        return person

    def validate(self, attrs):
        """
        attrs содержит только присланные поля (особенно при PATCH).
        Поэтому "итоговое состояние" считаем как:
        value = attrs.get(field, instance.field)
        """
        instance: Person | None = getattr(self, "instance", None)

        # Текущее/итоговое значение (учитываем PATCH)
        hiring_date = attrs.get("hiring_date", instance.hiring_date if instance else None)
        firing_date = attrs.get("firing_date", instance.firing_date if instance else None)
        status = attrs.get("status", instance.status if instance else Person.Status.WORKING)

        # 1) Нельзя firing_date раньше hiring_date
        if hiring_date and firing_date and firing_date < hiring_date:
            raise serializers.ValidationError({
                "firing_date": _("Firing date cannot be earlier than hiring date.")
            })

        # 2) Если явно ставят FIRED, но firing_date отсутствует (и не задана ни в attrs, ни в instance)
        # (т.е. итоговое firing_date = None)
        if status == Person.Status.FIRED and firing_date is None:
            raise serializers.ValidationError({
                "status": _("Status FIRED requires firing_date.")
            })

        # 3) Если firing_date пытаются сделать None, а статус в итоге FIRED → ошибка
        # (это ловит кейс "разуволить", но оставить FIRED)
        if firing_date is None and status == Person.Status.FIRED:
            # уже обработано выше, но оставим читаемость (можно убрать)
            raise serializers.ValidationError({
                "firing_date": _("FIRED status cannot have empty firing_date.")
            })

        # 4) Если firing_date задана → статус обязан быть FIRED
        if firing_date is not None and status != Person.Status.FIRED:
            raise serializers.ValidationError({
                "status": _("If firing_date is set, status must be FIRED."),
            })

        if instance and instance.status == Person.Status.FIRED:
            forbidden = {"position", "department", "hiring_date"}
            changed_forbidden = forbidden.intersection(attrs.keys())
            if changed_forbidden:
                raise serializers.ValidationError({
                    "detail": _("Cannot change %(fields)s for a fired employee.") % {
                        "fields": ", ".join(sorted(changed_forbidden))}
                })

        user_data = attrs.get("user", None)
        if user_data:
            if "password" in user_data:
                password = user_data["password"]
                self.validate_password(password)

        return attrs

    @transaction.atomic
    def update(self, instance: Person, validated_data):
        user_data = validated_data.pop("user", None)
        if user_data:
            update_fields = []
            email = user_data.get("email")
            if email is not None:
                instance.user.email = email
                update_fields.append('email')

            password = user_data.get("password")
            if password is not None:
                try:
                    validate_password(password, user=instance.user)
                except ValidationError as e:
                    raise serializers.ValidationError(list(e.messages))
                instance.user.set_password(password)
                update_fields.append('password')

            if update_fields:
                instance.user.save(update_fields=update_fields)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
