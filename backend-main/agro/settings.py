from datetime import timedelta
from pathlib import Path
import os

from django.conf.global_settings import CSRF_TRUSTED_ORIGINS
from dotenv import load_dotenv
from django.utils.translation import gettext_lazy as _

load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ["APPLICATION_SECRET"]

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True if os.environ["APPLICATION_DEBUG"] == "true" else False

ALLOWED_HOSTS = ["*"]

# Application definition
INSTALLED_APPS = [
    "modeltranslation",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "django_filters",
    "rest_framework_simplejwt",
    "django_celery_beat",
    "core",
    "dashboard",
    "personal",
    "machinery",
    "animal",
    "field",
    "integration",
    "agro_operation",
    "culture",
    "fertilizer",
    "task",
    "notification",
    "transportation",
    "ndvi"
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.middleware.locale.LocaleMiddleware",
]

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "https://agro.2it.kz",
    "https://agrosmartua.kz",
    'https://aralko.hlab.kz',
    'http://aralko.hlab.kz',
]

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

ROOT_URLCONF = "agro.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "agro.wsgi.application"

# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / os.getenv("SQLITE_DB_PATH", "db.sqlite3"),
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "ru"

TIME_ZONE = "Asia/Almaty"

USE_I18N = True

USE_TZ = True

LANGUAGES = [
    ('ru', _('Русский')),
    ('kk', _('Қазақша')),
]

LOCALE_PATHS = ((BASE_DIR / 'locale'),)

MODELTRANSLATION_DEFAULT_LANGUAGE = 'ru'

STATIC_ROOT = os.path.join(BASE_DIR, 'static')
STATIC_URL = "static/"

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        # 'rest_framework.permissions.AllowAny', # Default is AllowAny, meaning no authentication required by default
        'rest_framework.permissions.IsAuthenticated', # Use this to require auth for all views by default
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'DEFAULT_FILTER_BACKENDS': ('django_filters.rest_framework.DjangoFilterBackend',),
}

__jwt_access_token_ttl_minute = 15
if DEBUG:
    __jwt_access_token_ttl_minute = 120

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=__jwt_access_token_ttl_minute),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

CSRF_TRUSTED_ORIGINS.extend([
    'http://localhost:8001',
    'http://127.0.0.1:8001',
    'https://agro.2it.kz',
    'https://api.agro.2it.kz',
    'https://agrosmartua.kz',
    'https://api.agrosmartua.kz',
    'https://aralko.hlab.kz',
    'http://aralko.hlab.kz',
])

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'DEBUG',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console',], # Log to both console and file
            'level': 'DEBUG',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    }
}

# Celery
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "").lower() in (
    "1",
    "true",
    "yes",
) or DEBUG
CELERY_TASK_EAGER_PROPAGATES = True
