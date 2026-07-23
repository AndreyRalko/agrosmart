export interface MilkQualityStats {
  min: number | null;
  max: number | null;
  avg: number | null;
}

export interface DayMilkQuality {
  collected: number;
  left_to_collect: number;
  fat: MilkQualityStats;
  protein: MilkQualityStats;
}

export interface AnimalDashboard {
  total: number;
  milk_quality: {
    today: DayMilkQuality;
    yesterday: DayMilkQuality;
  };
}

export interface PersonDashboard {
  total_working: number;
  total_vacation: number;
  today_birthday: number;
  hired_last_7d: number;
  hired_last_30d: number;
  fired_last_7d: number;
  fired_last_30d: number;
}

export interface MachineryDashboard {
  total: number;
  year_production: {
    min: number;
    max: number;
    avg: number;
  };
}

export interface DashboardData {
  animal: AnimalDashboard;
  person: PersonDashboard;
  machinery: MachineryDashboard;
}