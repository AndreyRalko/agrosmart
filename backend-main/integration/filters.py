import django_filters
from .models import IntegrationDataField, IntegrationLog


class IntegrationDataFieldFilter(django_filters.FilterSet):
    integration = django_filters.NumberFilter(method="filter_by_field")
    field = django_filters.NumberFilter(method="filter_by_field")

    time_from = django_filters.DateTimeFilter(
        field_name="time",
        lookup_expr="date__gte"
    )
    time_to = django_filters.DateTimeFilter(
        field_name="time",
        lookup_expr="date__lte"
    )

    def filter_by_field(self, queryset, name, value):
        kw = {
            name: value,
        }
        return queryset.filter(**kw)

    class Meta:
        model = IntegrationDataField
        fields = ["integration", "field", "time_from", "time_to"]


class IntegrationLogFilter(django_filters.FilterSet):
    integration = django_filters.NumberFilter(field_name="integration_id")

    class Meta:
        model = IntegrationLog
        fields = ["integration", "status"]