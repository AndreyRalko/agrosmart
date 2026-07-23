sql_animal_total = """select count(1) cnt from animal_animal"""
sql_milk_quality = """select 
	count(distinct case when am.id is not null then a.id end) collected,
	count(distinct case when am.id is null then a.id end) left_to_collect,
	min(am.fat_percent) fat_min,
	avg(am.fat_percent) fat_avg,
	max(am.fat_percent) fat_max,
	min(am.protein_percent) protein_min,
	avg(am.protein_percent) protein_avg,
	max(am.protein_percent) protein_max
from animal_animal a
left join animal_milkquality am on a.id = am.animal_id and am.report_date = %s
-- фильтр по a.created_at отключён
"""

get_milk_quality_metrics = lambda x: {
    "collected": x[0],
    "left_to_collect": x[1],
    "fat": {
        "min": x[2],
        "avg": x[3],
        "max": x[4],
    },
    "protein": {
        "min": x[5],
        "avg": x[6],
        "max": x[7],
    }
}

sql_person = """select 
	count(case when pp.status = 1 then 1 end) total_working,
	count(case when pp.status = 2 then 1 end) total_vacation,
	count(case when strftime('%m-%d', pp.birth_date) = strftime('%m-%d', 'now') and pp.status in (1, 2) then 1 end) total_birthday,
	count(case when pp.hiring_date >= date('now', '-7 days') then 1 end) hired_last_7d,
	count(case when pp.hiring_date >= date('now', '-30 days') then 1 end) hired_last_30d,
	count(case when pp.firing_date >= date('now', '-7 days') then 1 end) fired_last_7d,
	count(case when pp.firing_date >= date('now', '-30 days') then 1 end) fired_last_30d
from personal_person pp
"""

sql_person_postgres = """select 
	count(case when pp.status = 1 then 1 end) total_working,
	count(case when pp.status = 2 then 1 end) total_vacation,
	count(case when to_char(pp.birth_date, 'MM-DD') = to_char(current_date, 'MM-DD') and pp.status in (1, 2) then 1 end) total_birthday,
	count(case when pp.hiring_date >= current_date - interval '7' day then 1 end) hired_last_7d,
	count(case when pp.hiring_date >= current_date - interval '30' day then 1 end) hired_last_30d,
	count(case when pp.firing_date >= current_date - interval '7' day then 1 end) fired_last_7d,
	count(case when pp.firing_date >= current_date - interval '30' day then 1 end) fired_last_30d
from personal_person pp
"""


def get_sql_person(vendor: str) -> str:
    if vendor == "postgresql":
        return sql_person_postgres
    return sql_person


sql_machinery = """select 
	count(1),
	min(year_production) year_production_min,
	avg(year_production) year_production_avg,
	max(year_production) year_production_max
from machinery_machinery
"""
