from django.conf import settings
from django.utils import translation
from rest_framework import serializers
from modeltranslation.translator import translator
from django.utils.translation import gettext_lazy as _


class TranslationSerializerReqLangMixinOld(serializers.ModelSerializer):
    """
    A mixin that returns translatable fields as a dictionary with all language versions.
    Non-translatable fields remain unchanged.
    """

    def to_representation(self, instance):
        data = super().to_representation(instance)
        model_class = self.Meta.model

        # Get translatable fields for the model
        translation_options = translator.get_options_for_model(model_class)
        translatable_fields = translation_options.fields

        meta_fields = set(self.fields)
        model_fields = set(translation_options.fields)
        cross_fields = meta_fields.intersection(model_fields)

        current_lang = translation.get_language()
        supported_langs = set([code for code, _ in settings.LANGUAGES])

        # если вдруг current_lang типа "ru-ru" — нормализуем до "ru"
        if current_lang and current_lang not in supported_langs and "-" in current_lang:
            current_lang = current_lang.split("-")[0]

        default_lang = getattr(settings, "LANGUAGE_CODE", "en")
        if default_lang and "-" in default_lang:
            default_lang = default_lang.split("-")[0]

        for field in cross_fields:
            # 1) текущий язык
            value = getattr(instance, f"{field}_{current_lang}", None) if current_lang else None

            # 2) фолбэк на дефолтный язык проекта
            if value in (None, "") and default_lang in supported_langs:
                value = getattr(instance, f"{field}_{default_lang}", None)

            # 3) фолбэк на первый непустой перевод
            if value in (None, ""):
                for code in supported_langs:
                    v = getattr(instance, f"{field}_{code}", None)
                    if v not in (None, ""):
                        value = v
                        break

            data[field] = value

        return data

class TranslationSerializerReqLangMixinV2(serializers.ModelSerializer):
    """
    A mixin that returns translatable fields as a dictionary with all language versions.
    Non-translatable fields remain unchanged.
    """

    def get_fields(self):
        fields = super().get_fields()

        translation_options = translator.get_options_for_model(self.Meta.model)

        meta_fields = set(self.Meta.fields)
        model_fields = set(translation_options.fields)
        cross_fields = meta_fields.intersection(model_fields)
        supported_langs = set([code for code, _ in settings.LANGUAGES])

        for field in cross_fields:
            for lang in supported_langs:
                field_name = f"{field}_{lang}"
                fields[field_name] = serializers.CharField()

        return fields



class TranslationSerializerMixin(serializers.ModelSerializer):
    required_translation_fields = {}

    def _get_translatable_fields(self):
        opts = translator.get_options_for_model(self.Meta.model)
        return tuple(opts.fields)

    def _get_lang_codes(self):
        return [code for code, _ in settings.LANGUAGES]

    def get_required_langs(self):
        return self._get_lang_codes()

    def get_default_lang_for_base(self):
        return settings.LANGUAGE_CODE

    def get_fields(self):
        fields = super().get_fields()

        translatable = self._get_translatable_fields()
        lang_codes = self._get_lang_codes()
        required_translation_fields = getattr(self, 'required_translation_fields', {})

        # 1) Убираем базовые поля (name, title, ...)
        for base_field in translatable:
            fields.pop(base_field, None)

        for base_field in translatable:
            for lang in lang_codes:
                f_name = f"{base_field}_{lang}"
                if f_name in fields:
                    continue
                fields[f_name] = serializers.CharField(required=required_translation_fields.get(base_field), allow_blank=False)

        return fields

    def validate(self, attrs):
        attrs = super().validate(attrs)

        request = self.context.get("request")
        method = getattr(request, "method", "").upper()

        is_create = self.instance is None
        is_patch = method == "PATCH"
        is_put = method == "PUT"

        langs = self.get_required_langs()
        # POST/PUT: требуем полностью
        if is_create or is_put:
            missing = {}
            for base_field in self.required_translation_fields:
                for lang in langs:
                    key = f"{base_field}_{lang}"
                    if not attrs.get(key):
                        missing[key] = [_("This field is required.")]
            if missing:
                raise serializers.ValidationError(missing)
            return attrs

        # PATCH: не требуем всё, но не даём "сломать" обязательность
        if is_patch and self.instance and self.required_translation_fields:
            errors = {}

            for base_field in self.required_translation_fields:
                # если пользователь патчит хотя бы один язык этого поля
                patched_any = any(f"{base_field}_{lang}" in attrs for lang in langs)
                if not patched_any:
                    continue

                # смотрим итоговые значения (patched value, иначе текущее из instance)
                for lang in langs:
                    key = f"{base_field}_{lang}"
                    value_after = attrs.get(key, getattr(self.instance, key, None))
                    if not value_after:
                        errors[key] = [_("This field cannot be empty for required translations.")]

            if errors:
                raise serializers.ValidationError(errors)

        return attrs

    def _fill_base_fields_from_default_lang(self, validated_data):
        """
        Проставляет базовое поле (name) из name_{get_default_lang_for_base()}.
        """
        translatable = self._get_translatable_fields()
        default_lang = self.get_default_lang_for_base()

        for base_field in translatable:
            lang_key = f"{base_field}_{default_lang}"
            if lang_key in validated_data and validated_data.get(lang_key):
                validated_data[base_field] = validated_data[lang_key]

        # если клиент всё-таки прислал 'name' — игнорируем
        for base_field in translatable:
            validated_data.pop(base_field, None)
            # но мы выше заново положили base_field; вернем обратно:
            # (сделаем аккуратно)
        for base_field in translatable:
            lang_key = f"{base_field}_{default_lang}"
            if lang_key in validated_data and validated_data.get(lang_key):
                validated_data[base_field] = validated_data[lang_key]

        return validated_data

    def create(self, validated_data):
        validated_data = self._fill_base_fields_from_default_lang(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._fill_base_fields_from_default_lang(validated_data)
        return super().update(instance, validated_data)