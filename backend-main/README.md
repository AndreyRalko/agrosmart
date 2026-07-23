# Что нужно сделать

## Создать уникальный индекс на почту, чтобы перестраховаться
```
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE UNIQUE INDEX auth_user_email_key ON public.auth_user USING btree (email)
```


```
django-admin makemessages -l ru
django-admin makemessages -l kk

django-admin compilemessages
```

## celery beat
```
celery -A agro.celery:app beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```