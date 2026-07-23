from django.apps import AppConfig


class IntegrationConfig(AppConfig):
    name = "integration"

    def ready(self):
        import integration.signals