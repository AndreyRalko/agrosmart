import django_filters
from .models import Field, Condition


class FieldFilter(django_filters.FilterSet):
    operation = django_filters.CharFilter(method="filter_operation")
    integration = django_filters.CharFilter(method="filter_integration")

    def filter_operation(self, queryset, name, value):
        return queryset.filter(operation=value)

    def filter_integration(self, queryset, name, value):
        return queryset.filter(integration=value)

    class Meta:
        model = Field
        fields = ["operation", "integration"]


class ConditionFilter(django_filters.FilterSet):
    operation = django_filters.CharFilter(method="filter_operation")
    culture_variety = django_filters.CharFilter(method="filter_culture_variety")

    def filter_operation(self, queryset, name, value):
        return queryset.filter(field__operation=value)

    def filter_culture_variety(self, queryset, name, value):
        return queryset.filter(culture_variety=value)

    class Meta:
        model = Condition
        fields = ["operation", "culture_variety"]