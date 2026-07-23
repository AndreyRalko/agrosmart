from django.db import connection

from agro_operation.models import AlertOperationToCulture

__sql__remove_alert_if_fixed_pg = """
DELETE FROM agro_operation_alertoperationtoculture alert_source
WHERE alert_source.id = (
    SELECT MAX(alert.id)
    FROM agro_operation_alertoperationtoculture alert
    JOIN agro_operation_operation operation ON alert.operation_id = operation.id
    JOIN agro_operation_field field ON field.operation_id = operation.id
    LEFT JOIN agro_operation_condition conditions
        ON conditions.field_id = field.id
        AND conditions.culture_variety_id = alert.culture_variety_id
    WHERE alert.operation_id = %s
    GROUP BY alert.culture_variety_id
    HAVING COUNT(CASE WHEN field.required THEN field.id END)
         = COUNT(CASE WHEN field.required THEN conditions.id END)
)
"""

__sql__remove_alert_if_fixed_sqlite = """
DELETE FROM agro_operation_alertoperationtoculture
WHERE id = (
    SELECT MAX(alert.id)
    FROM agro_operation_alertoperationtoculture alert
    JOIN agro_operation_operation operation ON alert.operation_id = operation.id
    JOIN agro_operation_field field ON field.operation_id = operation.id
    LEFT JOIN agro_operation_condition conditions
        ON conditions.field_id = field.id
        AND conditions.culture_variety_id = alert.culture_variety_id
    WHERE alert.operation_id = %s
    GROUP BY alert.culture_variety_id
    HAVING COUNT(CASE WHEN field.required THEN field.id END)
         = COUNT(CASE WHEN field.required THEN conditions.id END)
)
"""

__sql__add_alert_if_not_fixed_pg = """
INSERT INTO agro_operation_alertoperationtoculture(operation_id, culture_variety_id, code)
SELECT
    mapping_op_to_cult.operation_id,
    mapping_op_to_cult.culture_variety_id,
    %s
FROM (
    SELECT
        op_sub.id operation_id,
        cond_sub.culture_variety_id culture_variety_id
    FROM agro_operation_operation op_sub
    JOIN agro_operation_field field_sub ON op_sub.id = field_sub.operation_id
    JOIN agro_operation_condition cond_sub ON cond_sub.field_id = field_sub.id
    WHERE op_sub.id = %s
    GROUP BY 1, 2
) mapping_op_to_cult
JOIN agro_operation_field field ON field.operation_id = mapping_op_to_cult.operation_id
LEFT JOIN agro_operation_condition conditions
    ON conditions.field_id = field.id
    AND conditions.culture_variety_id = mapping_op_to_cult.culture_variety_id
GROUP BY 1, 2
HAVING MAX(CASE
    WHEN field.required AND (conditions.id IS NULL OR conditions."values" IS NULL) THEN 1
END) = 1
ON CONFLICT (culture_variety_id, operation_id, code) DO NOTHING
"""

__sql__add_alert_if_not_fixed_sqlite = """
INSERT OR IGNORE INTO agro_operation_alertoperationtoculture(operation_id, culture_variety_id, code)
SELECT
    mapping_op_to_cult.operation_id,
    mapping_op_to_cult.culture_variety_id,
    %s
FROM (
    SELECT
        op_sub.id operation_id,
        cond_sub.culture_variety_id culture_variety_id
    FROM agro_operation_operation op_sub
    JOIN agro_operation_field field_sub ON op_sub.id = field_sub.operation_id
    JOIN agro_operation_condition cond_sub ON cond_sub.field_id = field_sub.id
    WHERE op_sub.id = %s
    GROUP BY 1, 2
) mapping_op_to_cult
JOIN agro_operation_field field ON field.operation_id = mapping_op_to_cult.operation_id
LEFT JOIN agro_operation_condition conditions
    ON conditions.field_id = field.id
    AND conditions.culture_variety_id = mapping_op_to_cult.culture_variety_id
GROUP BY 1, 2
HAVING MAX(CASE
    WHEN field.required AND (conditions.id IS NULL OR conditions."values" IS NULL) THEN 1
END) = 1
"""


def remove_alert_if_fixed(operation_id):
    sql = (
        __sql__remove_alert_if_fixed_sqlite
        if connection.vendor == "sqlite"
        else __sql__remove_alert_if_fixed_pg
    )
    with connection.cursor() as cursor:
        cursor.execute(sql, [operation_id])


def insert_alert_if_not_fixed(operation_id):
    sql = (
        __sql__add_alert_if_not_fixed_sqlite
        if connection.vendor == "sqlite"
        else __sql__add_alert_if_not_fixed_pg
    )
    with connection.cursor() as cursor:
        cursor.execute(sql, [AlertOperationToCulture.Code.NOT_ALL_REQ_FIELD, operation_id])
