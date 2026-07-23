from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.drf_permissions import ModulePermission

from .models import Culture, CultureVariety
from .serializers import (
    CultureSerializerRead,
    CultureSerializerWrite,
    CultureVarietySerializerRead,
    CultureVarietySerializerWrite,
    CultureVarietyCustomByCultureRequestSerializer,
    CultureVarietyCustomByCultureResponseSerializer
)

from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema


class CultureViewSet(viewsets.ModelViewSet):
    queryset = Culture.objects.all().prefetch_related('varieties').order_by("id")
    module_key = "culture"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return CultureSerializerRead
        return CultureSerializerWrite


class CultureVarietyViewSet(viewsets.ModelViewSet):
    queryset = CultureVariety.objects.select_related("culture").all().order_by("id")
    module_key = "culture"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return CultureVarietySerializerRead
        return CultureVarietySerializerWrite

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        ids = [v.id for v in page]

        serializer = self.get_serializer(
            page,
            many=True,
            context={**self.get_serializer_context(), "ids": ids}
        )
        return self.get_paginated_response(serializer.data)


class CultureVarietyCustomViewSet(viewsets.GenericViewSet):
    module_key = "culture"
    permission_classes = [IsAuthenticated, ModulePermission]
    @extend_schema(
        parameters=[CultureVarietyCustomByCultureRequestSerializer],
        responses=CultureVarietyCustomByCultureResponseSerializer,
    )
    @action(detail=False, methods=["get"], url_path="by-culture")
    def by_culture_variety(self, request):
        q = CultureVarietyCustomByCultureRequestSerializer(data=request.query_params)
        q.is_valid(raise_exception=True)

        qs = CultureVariety.objects.filter(culture_id=q.validated_data["id"]).prefetch_related("condition_set__field__operation")

        ser = CultureVarietyCustomByCultureResponseSerializer({"results": qs})
        return Response(ser.data)