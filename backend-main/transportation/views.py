from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from core.drf_permissions import ModulePermission
from .models import TransportationOperation, TransportationTask
from .serializers import TransportationOperationSerializer, TransportationTaskSerializer


class TransportationOperationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "tasks"
    queryset = TransportationOperation.objects.select_related("operation").order_by("id")
    serializer_class = TransportationOperationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["operation"]


class TransportationTaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "tasks"
    queryset = TransportationTask.objects.select_related(
        "task", "machinery"
    ).order_by("-id")
    serializer_class = TransportationTaskSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["machinery"]
