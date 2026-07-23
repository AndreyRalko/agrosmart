from modeltranslation.translator import TranslationOptions, register

from notification.models import Notification, NotificationAgroOpField


@register(Notification)
class NotificationTranslationOptions(TranslationOptions):
    fields = ("title", "msg")


@register(NotificationAgroOpField)
class NotificationAgroOpFieldTranslationOptions(TranslationOptions):
    fields = ("culture_variety_name", "operation_name")
