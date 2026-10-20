from django.contrib import admin
from .models import StorageObject, StorageSensor, FeedChemistry

admin.site.register(StorageObject)
admin.site.register(StorageSensor)
admin.site.register(FeedChemistry)