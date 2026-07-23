from django.db.models import Prefetch, OuterRef, Exists
from django.db.models.deletion import ProtectedError
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.drf_permissions import ModulePermission

from .errors_wrapper import (
    by_culture_variety_set_conditions_not_all_req_fields,
    by_culture_variety_set_conditions__msg__not_all_req_fields,
    by_culture_variety_set_conditions__msg__unknown_fields,
    by_culture_variety_set_conditions_unknown_fields
)
from .filters import FieldFilter
from .models import Operation, Field, Condition, AlertOperationToCulture
from .serializers import (
    OperationSerializerRead, OperationSerializerWrite,
    FieldSerializerRead, FieldSerializerWrite,
    AlertOperationToCultureReadSerializer
)

from .reqresp import (
    OperationByCultureVarietyRequestSerializer,
    OperationByCultureVarietyResponseSerializer,
    OperationByCultureConditionsUpdateRequestSerializer,
    OperationByCultureConditionsUpdateResponseSerializer
)

from rest_framework.decorators import action

from integration.metric_units import normalize_condition_values

from task.models import Task

from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse


class OperationViewSet(viewsets.ModelViewSet):
    module_key = "agro_operations"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_queryset(self):
        return (
            Operation.objects.all()
            .prefetch_related(
                Prefetch(
                    "field_set",
                    queryset=Field.objects.select_related("integration", "integration_field"),
                )
            )
            .order_by("id")
        )

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return OperationSerializerRead
        return OperationSerializerWrite

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if Task.objects.filter(operation=instance).exists():
            return Response(
                {"detail": "Нельзя удалить операцию: по ней есть задания."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"detail": "Нельзя удалить операцию: есть связанные записи в системе."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class OperationCustomViewSet(viewsets.GenericViewSet):
    serializer_class = OperationSerializerRead
    module_key = "agro_operations"
    permission_classes = [IsAuthenticated, ModulePermission]
    
    @extend_schema(
        parameters=[OperationByCultureVarietyRequestSerializer],
        responses=OperationByCultureVarietyResponseSerializer,
    )
    @action(detail=False, methods=["get"], url_path="by-culture-variety")
    def by_culture_variety(self, request):
        q = OperationByCultureVarietyRequestSerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        cv = q.validated_data["culture_variety"]

        cond_exists = Condition.objects.filter(
            field_id=OuterRef("pk"),
            culture_variety_id=cv,
        )

        fields_qs = (
            Field.objects
            .annotate(has_cv=Exists(cond_exists))
            .filter(has_cv=True)
            .select_related("integration")
            .prefetch_related(
                Prefetch(
                    "condition_set",
                    queryset=Condition.objects.filter(culture_variety_id=cv),
                )
            )
        )

        qs = (
            Operation.objects
            .filter(field__condition__culture_variety_id=cv)
            .distinct()
            .prefetch_related(Prefetch("field_set", queryset=fields_qs))
        )

        ser = OperationByCultureVarietyResponseSerializer({"results": qs})
        return Response(ser.data)

    @extend_schema(
        parameters=[OperationByCultureConditionsUpdateRequestSerializer],
        responses={
            200: OperationByCultureConditionsUpdateResponseSerializer,
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Validation error (shape depends on case)",
            ),
        },
        examples=[
            OpenApiExample(
                name=by_culture_variety_set_conditions__msg__not_all_req_fields,
                status_codes=[400],
                value=by_culture_variety_set_conditions_not_all_req_fields(
                    fields=[
                        Field(id=1, name="example-1"),
                        Field(id=2, name="example-2"),
                    ]
                ),
            ),
            OpenApiExample(
                name=by_culture_variety_set_conditions__msg__unknown_fields,
                status_codes=[400],
                value=by_culture_variety_set_conditions_unknown_fields(
                    fields=[1, 2, 3]
                ),
            ),

        ],
    )
    @action(
        detail=False,
        methods=["patch"],
        url_path="by-culture-variety/set-conditions",
    )
    def by_culture_variety_set_conditions(self, request):
        q = OperationByCultureConditionsUpdateRequestSerializer(data=request.data)
        q.is_valid(raise_exception=True)

        fields = Field.objects.filter(operation_id=q.data['operation']).select_related("integration_field").all()

        passed_fields_ids = set(x['field'] for x in q.data['conditions'])

        all_fields_ids = dict()
        required_fields_ids = dict()

        for field in fields:
            required_fields_ids[field.id] = field
            all_fields_ids[field.id] = field

        not_passed_fields = [f for id, f in required_fields_ids.items() if id not in passed_fields_ids]
        if len(not_passed_fields) > 0:
            return Response(
                by_culture_variety_set_conditions_not_all_req_fields(not_passed_fields),
                status=status.HTTP_400_BAD_REQUEST,
            )

        unknown_fields_ids = [id for id in passed_fields_ids if id not in all_fields_ids]
        if len(unknown_fields_ids) > 0:
            return Response(
                by_culture_variety_set_conditions_unknown_fields(unknown_fields_ids),
                status=status.HTTP_400_BAD_REQUEST,
            )

        conditions_to_save = []
        for item in q.data['conditions']:
            field = all_fields_ids[item['field']]
            metric_key = field.integration_field.field_name if field.integration_field else None
            conditions_to_save.append({
                "values": normalize_condition_values(item['values'], metric_key),
                "field": item['field'],
            })

        Condition.objects.bulk_create(
            [
                Condition(values=x['values'], field_id=x['field'], culture_variety_id=q.data['culture_variety'])
                for x in conditions_to_save
            ],
            update_conflicts=True,
            unique_fields=["field_id", "culture_variety_id"],
            update_fields=["values", ],
        )

        return Response({"msg": "ok"})



class FieldViewSet(viewsets.ModelViewSet):
    queryset = (
        Field.objects.select_related("operation", "integration")
        .prefetch_related("condition_set")
        .order_by("id")
    )

    filter_backends = [DjangoFilterBackend]
    filterset_class = FieldFilter
    module_key = "agro_operations"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return FieldSerializerRead
        return FieldSerializerWrite


class AlertOperationToCultureViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        AlertOperationToCulture.objects.select_related("operation", "culture_variety")
        .order_by("id")
    )
    module_key = "agro_operations"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = AlertOperationToCultureReadSerializer
