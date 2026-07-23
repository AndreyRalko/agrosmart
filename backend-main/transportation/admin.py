from django.contrib import admin
from .models import TransportationOperation, TransportationTask


@admin.register(TransportationOperation)
class TransportationOperationAdmin(admin.ModelAdmin):
    list_display = ("id", "operation")
    search_fields = ("operation__name",)
    raw_id_fields = ("operation",)


@admin.register(TransportationTask)
class TransportationTaskAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "machinery", "from_place_name", "from_place_x", "from_place_y", "to_place_name", "to_place_x", "to_place_y")
    search_fields = ("task__id", "machinery__name", "from_place_name", "to_place_name")
    list_filter = ("machinery",)
    raw_id_fields = ("task", "machinery")