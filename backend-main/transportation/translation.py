from modeltranslation.translator import register, TranslationOptions
from .models import TransportationTask


@register(TransportationTask)
class TransportationTaskTranslationOptions(TranslationOptions):
    fields = ("description",)