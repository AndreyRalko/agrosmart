from django.utils.timezone import is_naive, make_aware

def _aware(dt):
    if dt and is_naive(dt):
        return make_aware(dt)
    return dt