from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.drf_permissions import ModulePermission

from .filters import IntegrationDataFieldFilter, IntegrationLogFilter
from .models import Integration, IntegrationLog, IntegrationTemperatureField, IntegrationDataField
from .serializers import IntegrationSerializerRead, IntegrationSerializerWrite, IntegrationLogSerializerRead, \
    IntegrationTemperatureFieldSerializerRead, IntegrationTemperatureFieldLastQuerySerializer, \
    IntegrationDataFieldSerializerRead, IntegrationDataFieldLastQuerySerializer

from .services import TomorrowIoIntegrationRepo, IntegrationDataFieldRepo
from .tasks import run_integration_for_all_fields

# Create your views here.
class IntegrationViewSet(viewsets.ModelViewSet):
    queryset = Integration.objects.all().order_by("id").prefetch_related("fields")
    module_key = "integration"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return IntegrationSerializerRead
        return IntegrationSerializerWrite

    @action(detail=True, methods=["post"], url_path="run-task")
    def run_task(self, request, pk=None):
        integration = self.get_object()

        async_result = run_integration_for_all_fields.delay(integration.id)

        payload = {
            "message": "Task triggered successfully",
            "integration_id": integration.id,
            "task_id": async_result.id,
        }

        if async_result.ready():
            if async_result.failed():
                raise async_result.result
            payload["result"] = async_result.result
            payload["message"] = "Data collection completed"
            return Response(payload, status=status.HTTP_200_OK)

        return Response(payload, status=status.HTTP_202_ACCEPTED)

class IntegrationLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = IntegrationLog.objects.select_related("integration").order_by("-created_at")
    serializer_class = IntegrationLogSerializerRead
    filter_backends = [DjangoFilterBackend]
    filterset_class = IntegrationLogFilter
    module_key = "integration"
    permission_classes = [IsAuthenticated, ModulePermission]


class IntegrationTemperatureFieldViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        IntegrationTemperatureField.objects
        .select_related("integration", "field", "integration_log")
        .order_by("-time")
    )
    serializer_class = IntegrationTemperatureFieldSerializerRead
    module_key = "integration"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        return IntegrationTemperatureFieldSerializerRead

    @extend_schema(
        parameters=[IntegrationTemperatureFieldLastQuerySerializer],
        responses={200: IntegrationTemperatureFieldSerializerRead},
    )
    @action(detail=False, methods=["get"], url_path="last")
    def last(self, request):
        query_serializer = IntegrationTemperatureFieldLastQuerySerializer(
            data=request.query_params
        )
        query_serializer.is_valid(raise_exception=True)

        obj = TomorrowIoIntegrationRepo.get_last_by_field(
            integration_id=query_serializer.validated_data["integration_id"],
            field_id=query_serializer.validated_data["field_id"],
            dt=query_serializer.validated_data["dt"],
        )

        if obj is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(obj)
        return Response(serializer.data)

class IntegrationDataFieldViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        IntegrationDataField.objects
        .select_related("integration", "field", "integration_log")
        .order_by("-time")
    )
    serializer_class = IntegrationDataFieldSerializerRead

    filter_backends = [DjangoFilterBackend]
    filterset_class = IntegrationDataFieldFilter
    module_key = "integration"
    permission_classes = [IsAuthenticated, ModulePermission]

    @extend_schema(
        parameters=[IntegrationDataFieldLastQuerySerializer],
        responses={200: IntegrationDataFieldSerializerRead},
    )
    @action(detail=False, methods=["get"], url_path="last")
    def last(self, request):
        query_serializer = IntegrationDataFieldLastQuerySerializer(
            data=request.query_params
        )
        query_serializer.is_valid(raise_exception=True)

        obj = IntegrationDataFieldRepo.get_last_by_field(
            integration_id=query_serializer.validated_data["integration_id"],
            field_id=query_serializer.validated_data["field_id"],
            dt=query_serializer.validated_data["dt"],
        )

        if obj is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(obj)
        return Response(serializer.data)