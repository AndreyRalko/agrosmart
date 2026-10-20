from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework import routers


from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

import core.views
import integration.views
import personal.views
import machinery.views
import animal.views
import field.views
import dashboard.views
import agro_operation.views
import culture.views
import fertilizer.views
import notification.views
import task.views
import transportation.views

router = routers.DefaultRouter()
router.register(r"department", personal.views.DepartmentViewSet)
router.register(r"position", personal.views.PositionViewSet)

router.register(r"machinery/brand", machinery.views.BrandViewSet)
router.register(r"machinery/type", machinery.views.TypeViewSet)
router.register(r"machinery", machinery.views.MachineryViewSet)

router.register(r"animal/breed", animal.views.BreedViewSet)
router.register(r"animal/milk-quality", animal.views.MilkQualityViewSet)
router.register(r"animal", animal.views.AnimalViewSet)

router.register(r"field", field.views.FieldViewSet)
router.register(r"integration", integration.views.IntegrationViewSet)
router.register(r"integration-logs", integration.views.IntegrationLogViewSet, basename="integration-log")
router.register(r"integration-temperatures", integration.views.IntegrationTemperatureFieldViewSet, basename="integration-temperature")
router.register(r"integration-data-field", integration.views.IntegrationDataFieldViewSet, basename="integration-data-field")


router.register(r"agro-op/operation", agro_operation.views.OperationViewSet, basename="operations")
router.register(r"agro-op/operation-custom", agro_operation.views.OperationCustomViewSet, basename="operations-custom")
router.register(r"agro-op/field", agro_operation.views.FieldViewSet, basename="fields")
router.register(r"agro-op/alert-operation-to-culture", agro_operation.views.AlertOperationToCultureViewSet, basename="alert-operation-to-culture")


router.register(r"culture/variety", culture.views.CultureVarietyViewSet, basename="culture-variety")
router.register(r"culture", culture.views.CultureViewSet, basename="culture")
router.register(r"culture-custom", culture.views.CultureVarietyCustomViewSet, basename="culture-custom")
router.register(r"fertilizer", fertilizer.views.FertilizerDoseViewSet, basename="fertilizer")

router.register(r"task", task.views.TaskViewSet, basename="task")
router.register(r"transportation/operation", transportation.views.TransportationOperationViewSet, basename="transportation-operation")
router.register(r"transportation/task", transportation.views.TransportationTaskViewSet, basename="transportation-task")
router.register(r"notification/setting", notification.views.NotificationSettingViewSet, basename="notification-setting")
router.register(r"notification/status", notification.views.NotificationStatusViewSet, basename="notification-status")
router.register(r"notification", notification.views.NotificationViewSet, basename="notification")

urlpatterns = [
    path("", core.views.home_page, name="home"),
    path("admin/", admin.site.urls),

    path('health/', core.views.health_check, name='health_check'),

    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token', TokenObtainPairView.as_view(), name='token_obtain_pair_no_slash'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh_no_slash'),
    path('personal/', personal.views.PersonalCreateListView.as_view(), name='personal-list'),
    path('personal/<int:pk>', personal.views.PersonalRetrieveUpdateDeleteView.as_view(), name='personal-item'),
    path('me/permissions/', personal.views.MePermissionsView.as_view(), name='me-permissions'),
    path("dashboard/", dashboard.views.DashboardView.as_view(), name="dashboard"),
    path("api/ndvi/", include("ndvi.urls")),
    path("api/storage/", include("storage.urls")),
    path("api/ration/", include("ration.urls")),
    *router.urls,
]
