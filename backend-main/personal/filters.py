import django_filters
from .models import Person


class PersonFilter(django_filters.FilterSet):
    firstname = django_filters.CharFilter(method="filter_firstname")
    lastname = django_filters.CharFilter(method="filter_lastname")
    patronymic = django_filters.CharFilter(method="filter_patronymic")

    def filter_firstname(self, queryset, name, value):
        return queryset.filter(firstname__istartswith=value)

    def filter_lastname(self, queryset, name, value):
        return queryset.filter(lastname__istartswith=value)

    def filter_patronymic(self, queryset, name, value):
        return queryset.filter(patronymic__istartswith=value)

    class Meta:
        model = Person
        fields = [
            'firstname',
            'lastname',
            'patronymic',
        ]
