from django.urls import path
from .views import DroneUploadView, NdviHistoryView, NdviMapView, SentinelDownloadView

urlpatterns = [
    path("upload/", DroneUploadView.as_view(), name="ndvi-upload"),
    path("map/", NdviMapView.as_view(), name="ndvi-map"),
    path("history/", NdviHistoryView.as_view(), name="ndvi-history"),
    path("sentinel/", SentinelDownloadView.as_view(), name="ndvi-sentinel"),
]