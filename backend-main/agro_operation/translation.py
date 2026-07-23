from modeltranslation.translator import register, TranslationOptions
from .models import Operation, Field


@register(Operation)
class OperationTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(Field)
class FieldTranslationOptions(TranslationOptions):
    fields = ('name',)