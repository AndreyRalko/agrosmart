from modeltranslation.admin import TranslationAdmin
from django.contrib import admin

from core.translate import TranslatedListDisplayMixin
from .models import Department, Position, PositionModulePermission


@admin.register(Department)
class DepartmentAdminClass(TranslatedListDisplayMixin, TranslationAdmin):
    list_display = ["pk", "name"]

@admin.register(Position)
class PositionAdminClass(TranslatedListDisplayMixin, TranslationAdmin):
    list_display = ["pk", "name"]


@admin.register(PositionModulePermission)
class PositionModulePermissionAdmin(admin.ModelAdmin):
    list_display = ["id", "position", "module", "can_view", "can_create", "can_edit", "can_delete"]
    list_filter = ["module", "position"]