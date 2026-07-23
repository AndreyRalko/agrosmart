from django.apps import AppConfig


class AgroOperationConfig(AppConfig):
    name = "agro_operation"

    def ready(self):
        from . import signals