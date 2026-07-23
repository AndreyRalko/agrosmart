from modeltranslation.translator import register, TranslationOptions
from .models import Integration, IntegrationField


@register(Integration)
class IntegrationTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(IntegrationField)
class IntegrationFieldTranslationOptions(TranslationOptions):
    fields = ('name',)

