from django.conf import settings
from modeltranslation.translator import translator


class TranslatedListDisplayMixin:
    def get_list_display(self, request):
        model = self.__getattribute__('model')
        list_display = self.__getattribute__('list_display')

        translation_opts = translator.get_options_for_model(model)

        expanded_fields = []

        for field in list_display:
            if field in translation_opts.fields:
                for lang_code, _ in settings.LANGUAGES:
                    expanded_fields.append(f'{field}_{lang_code}')
            else:
                expanded_fields.append(field)

        return expanded_fields