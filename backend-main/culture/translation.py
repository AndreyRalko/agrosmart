from modeltranslation.translator import register, TranslationOptions
from .models import Culture, CultureVariety


@register(Culture)
class CultureTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(CultureVariety)
class CultureVarietyTranslationOptions(TranslationOptions):
    fields = ('name',)