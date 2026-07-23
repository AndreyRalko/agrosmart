# Generated manually for position module permissions

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("personal", "0004_alter_department_id_alter_person_id_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="PositionModulePermission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("module", models.CharField(max_length=50)),
                ("can_view", models.BooleanField(default=False)),
                ("can_create", models.BooleanField(default=False)),
                ("can_edit", models.BooleanField(default=False)),
                ("can_delete", models.BooleanField(default=False)),
                (
                    "position",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="module_permissions",
                        to="personal.position",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["position", "module"], name="position_module_idx"),
                ],
                "unique_together": {("position", "module")},
            },
        ),
    ]
