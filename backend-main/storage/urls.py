from django.urls import path
from .views import (
    StorageListView, StorageDetailView,
    StorageSensorView, StorageChemistryView,
    StorageStatsView, StorageChemistryImportView,
    StorageChemistryTemplateView, SensorDeviceListView,
    SensorDeviceDetailView
)

urlpatterns = [
    path('', StorageListView.as_view(), name='storage-list'),
    path('stats/', StorageStatsView.as_view(), name='storage-stats'),
    path('chemistry/template/', StorageChemistryTemplateView.as_view(), name='storage-chemistry-template'),
    path('<int:pk>/', StorageDetailView.as_view(), name='storage-detail'),
    path('<int:pk>/sensors/', StorageSensorView.as_view(), name='storage-sensors'),
    path('<int:pk>/chemistry/', StorageChemistryView.as_view(), name='storage-chemistry'),
    path('<int:pk>/chemistry/import/', StorageChemistryImportView.as_view(), name='storage-chemistry-import'),
    path('<int:pk>/devices/', SensorDeviceListView.as_view(), name='storage-devices'),
    path('<int:pk>/devices/<int:device_pk>/', SensorDeviceDetailView.as_view(), name='storage-device-detail'),
]