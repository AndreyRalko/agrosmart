from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.drf_permissions import ModulePermission

from .filters import MachineryFilter
from .models import Brand, Type, Machinery
from .serializers import (
    BrandSerializer,
    TypeSerializerRead, TypeSerializerWrite,
    MachinerySerializerRead, MachinerySerializerWrite
)


class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all().order_by("id")
    serializer_class = BrandSerializer
    module_key = "machinery"
    permission_classes = [IsAuthenticated, ModulePermission]


class TypeViewSet(viewsets.ModelViewSet):
    queryset = Type.objects.all().order_by("id")
    module_key = "machinery"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return TypeSerializerRead
        return TypeSerializerWrite


class MachineryViewSet(viewsets.ModelViewSet):
    queryset = Machinery.objects.select_related("brand", "type").all().order_by("id")
    filter_backends = [DjangoFilterBackend]
    filterset_class = MachineryFilter
    module_key = "machinery"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return MachinerySerializerRead
        return MachinerySerializerWrite

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        read_serializer = MachinerySerializerRead(
            instance,
            context=self.get_serializer_context()
        )
        return Response(read_serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        read_serializer = MachinerySerializerRead(
            instance,
            context=self.get_serializer_context()
        )
        return Response(read_serializer.data)
