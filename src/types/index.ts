export type Role = 'hr' | 'manager' | 'employee';

export interface Employee {
  id: string;
  emp_name: string;
  emp_code: string;
  emp_category: string;
  dept: string;
  grade_code: string;
  batta_amount: number;
  auth_user_id: string;
  manager_id: string | null;
  role: Role;
}

export interface DailyEntry {
  id: string;
  auth_user_id: string;
  emp_name: string;
  emp_category: string;
  emp_code: string;
  dept: string;
  entered_by: string;
  entered_name: string;
  date: string;
  month: string;
  period: string;
  work_description: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto-approved';
  manager_id: string;
  manager_name: string;
  duty_type: 'day' | 'night' | null;
  duty_time: string | null;
  entry_type: 'work' | 'sunday' | 'leave' | 'holiday';
  batta_amount: number;
  approved_by?: string | null;
  approved_at?: string | null;
  remarks?: string | null;
  created_at?: string;
}

