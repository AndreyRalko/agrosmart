from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework import mixins

from core.drf_permissions import ModulePermission
from .filters import PersonFilter
from .serializers import PersonSerializer, DepartmentSerializer, PositionSerializer
from .models import Person, Department, Position
from .permissions_service import build_user_permissions_response


class DepartmentViewSet(ModelViewSet):
    queryset = Department.objects.all().order_by("id")
    serializer_class = DepartmentSerializer
    module_key = "departments"
    permission_classes = [IsAuthenticated, ModulePermission]


class PositionViewSet(ModelViewSet):
    queryset = Position.objects.prefetch_related("module_permissions").order_by("id")
    serializer_class = PositionSerializer
    module_key = "positions"
    permission_classes = [IsAuthenticated, ModulePermission]


class PersonalCreateListView(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    GenericAPIView
):
    queryset = Person.objects.all().order_by("id")
    serializer_class = PersonSerializer
    module_key = "persons"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class PersonalRetrieveUpdateDeleteView(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    GenericAPIView
):
    queryset = Person.objects.all().order_by("id")
    filter_backends = (DjangoFilterBackend,)
    filter_class = PersonFilter

    serializer_class = PersonSerializer
    module_key = "persons"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class MePermissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(build_user_permissions_response(request.user))
