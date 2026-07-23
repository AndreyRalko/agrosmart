from django.urls import path
from .views import DroneUploadView, SentinelDownloadView

urlpatterns = [
    path("upload/", DroneUploadView.as_view(), name="ndvi-upload"),
    path("sentinel/", SentinelDownloadView.as_view(), name="ndvi-sentinel")
]