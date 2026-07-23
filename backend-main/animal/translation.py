from modeltranslation.translator import register, TranslationOptions
from .models import Breed


@register(Breed)
class TypeTranslationOptions(TranslationOptions):
    fields = ('name',)
