from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.drf_permissions import ModulePermission

from .filters import FieldFilter
from .models import Field
from .serializers import FieldSerializerRead, FieldSerializerWrite


class FieldViewSet(viewsets.ModelViewSet):
    queryset = Field.objects.all().order_by("id")
    filter_backends = [DjangoFilterBackend]
    filterset_class = FieldFilter
    module_key = "fields"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return FieldSerializerRead
        return FieldSerializerWrite

    def _write_then_read(self, request, instance=None, partial=False, status_code=200):
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()

        return Response(
            FieldSerializerRead(obj, context=self.get_serializer_context()).data,
            status=status_code
        )

    def create(self, request, *args, **kwargs):
        return self._write_then_read(request, instance=None, partial=False, status_code=201)

    def update(self, request, *args, **kwargs):
        return self._write_then_read(request, instance=self.get_object(), partial=False)

    def partial_update(self, request, *args, **kwargs):
        return self._write_then_read(request, instance=self.get_object(), partial=True)
