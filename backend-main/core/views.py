from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.db import connections
from django.db.utils import OperationalError
from django.utils import timezone


def _check_database() -> bool:
    db_conn = connections['default']
    try:
        db_conn.cursor()
        return True
    except OperationalError:
        return False


def health_check(request):
    db_healthy = _check_database()

    if db_healthy:
        return JsonResponse({"status": "healthy", "database": "connected"})
    return JsonResponse({"status": "unhealthy", "database": "disconnected"}, status=503)


def home_page(request):
    db_healthy = _check_database()
    now = timezone.localtime()
    status_text = "Работает" if db_healthy else "Ошибка БД"
    status_color = "#16a34a" if db_healthy else "#dc2626"
    db_text = "Подключена" if db_healthy else "Нет соединения"
    debug_text = "Включён" if settings.DEBUG else "Выключен"

    html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AgroSmart API</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      color: #171717;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }}
    .card {{
      width: 100%;
      max-width: 520px;
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 32px;
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: 1.5rem;
      font-weight: 600;
    }}
    .subtitle {{
      margin: 0 0 24px;
      color: #737373;
      font-size: 0.95rem;
    }}
    .status {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: #f5f5f5;
      font-weight: 600;
      margin-bottom: 24px;
    }}
    .dot {{
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: {status_color};
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 0.95rem;
    }}
    td {{
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }}
    td:first-child {{
      color: #737373;
      width: 42%;
    }}
    .links {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }}
    a {{
      color: #171717;
      text-decoration: none;
      padding: 8px 14px;
      border: 1px solid #d4d4d4;
      border-radius: 8px;
      font-size: 0.9rem;
    }}
    a:hover {{
      background: #fafafa;
    }}
  </style>
</head>
<body>
  <div class="card">
    <h1>AgroSmart API</h1>
    <p class="subtitle">Бэкенд запущен и отвечает на запросы</p>

    <div class="status">
      <span class="dot"></span>
      <span>{status_text}</span>
    </div>

    <table>
      <tr><td>База данных</td><td>{db_text}</td></tr>
      <tr><td>Режим DEBUG</td><td>{debug_text}</td></tr>
      <tr><td>Время сервера</td><td>{now.strftime("%d.%m.%Y %H:%M:%S")}</td></tr>
      <tr><td>Порт</td><td>8001</td></tr>
    </table>

    <div class="links">
      <a href="/health/">Health (JSON)</a>
      <a href="/api/schema/swagger-ui/">Swagger</a>
      <a href="/admin/">Admin</a>
    </div>
  </div>
</body>
</html>"""

    status_code = 200 if db_healthy else 503
    return HttpResponse(html, status=status_code, content_type="text/html; charset=utf-8")

