from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.drf_permissions import ModulePermission

from .filters import AnimalFilter
from .models import Breed, Animal, MilkQuality
from .serializers import (
    BreedSerializerRead,
    BreedSerializerWrite,
    AnimalSerializerRead,
    AnimalSerializerWrite,
    MilkQualitySerializerRead,
    MilkQualitySerializerWrite,
)


class BreedViewSet(viewsets.ModelViewSet):
    queryset = Breed.objects.all().order_by("id")
    module_key = "animal"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return BreedSerializerRead
        return BreedSerializerWrite


class AnimalViewSet(viewsets.ModelViewSet):
    queryset = Animal.objects.select_related("breed").all().order_by("id")
    filter_backends = [DjangoFilterBackend]
    filterset_class = AnimalFilter
    module_key = "animal"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return AnimalSerializerRead
        return AnimalSerializerWrite

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        return Response(
            AnimalSerializerRead(
                instance,
                context=self.get_serializer_context()
            ).data,
            status=201
        )

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

        return Response(
            AnimalSerializerRead(
                instance,
                context=self.get_serializer_context()
            ).data
        )


class MilkQualityViewSet(viewsets.ModelViewSet):
    queryset = MilkQuality.objects.select_related(
        "animal",
        "animal__breed",
        "person_created",
        "person_updated",
    ).all().order_by("id")

    filter_backends = [DjangoFilterBackend]
    module_key = "animal"
    permission_classes = [IsAuthenticated, ModulePermission]
    filterset_fields = {
        "report_date": ["exact", "gte", "lte"],
        "animal": ["exact"],
        "id": ["exact"],
    }

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return MilkQualitySerializerRead
        return MilkQualitySerializerWrite

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        instance = serializer.save(person_created=request.user.person)

        return Response(
            MilkQualitySerializerRead(
                instance,
                context=self.get_serializer_context()
            ).data,
            status=201
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(person_updated=request.user.person)

        return Response(
            MilkQualitySerializerRead(
                instance,
                context=self.get_serializer_context()
            ).data
        )
