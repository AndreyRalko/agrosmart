export interface PersonnelPosition {
  id: number;
  name: string;
}

export interface PersonnelDepartment {
  id: number;
  name: string;
}

export interface Personnel {
  id: number;
  email: string;
  lastname: string;
  firstname: string;
  patronymic: string | null;
  birth_date: string;
  position: PersonnelPosition;
  department: PersonnelDepartment;
  hiring_date: string;
  firing_date: string | null;
  status: number;
}

export interface PersonnelListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Personnel[];
}

export interface CreatePersonnelData {
  password: string;
  email: string;
  lastname: string;
  firstname: string;
  patronymic?: string;
  position_id: number;
  department_id: number;
  birth_date: string;
  hiring_date: string;
}

export interface UpdatePersonnelData {
  password?: string;
  email?: string;
  lastname?: string;
  firstname?: string;
  patronymic?: string;
  position_id?: number;
  department_id?: number;
  birth_date?: string;
  hiring_date?: string;
  firing_date?: string | null;
  status?: number;
}