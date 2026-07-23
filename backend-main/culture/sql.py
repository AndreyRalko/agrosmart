from typing import List, Any

from django.db import connection


def get_unique_cnt(ids: List[int]) -> list[dict[str, Any]]:
    if not ids:
        return []

    placeholders = ", ".join(["%s"] * len(ids))
    sql = f"""select
        aoc.culture_variety_id,
        count(distinct aoc.id) cnt
    from agro_operation_condition aoc
    join agro_operation_field aof on aoc.field_id = aof.id
    join agro_operation_operation aoo on aof.operation_id = aoo.id
    where aoc.culture_variety_id in ({placeholders})
    group by 1"""

    with connection.cursor() as cur:
        cur.execute(sql, ids)
        results = cur.fetchall()
        return [
            {
                "id": x[0],
                "cnt": x[1]
            } for x in results
        ]
