from modeltranslation.translator import register, TranslationOptions
from .models import TaskFieldValue


@register(TaskFieldValue)
class TaskFieldValueTranslationOptions(TranslationOptions):
    fields = ('field_name',)

