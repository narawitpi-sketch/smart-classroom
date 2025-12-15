export type Role = 'guest' | 'reporter' | 'staff' | 'login_admin';
export type Status = 'pending' | 'in-progress' | 'completed';
export type Urgency = 'low' | 'medium' | 'high';
export type ReporterType = 'lecturer' | 'student' | 'other';
export type AdminTab = 'dashboard' | 'issues' | 'rooms';

export interface Issue {
  id: string;
  room: string;
  category: string;
  description: string;
  reporter: string;
  reporterType: ReporterType;
  phone: string;
  urgency: Urgency;
  status: Status;
  timestamp: any;
  docId?: string;
}

export interface Room {
  id: string;
  name: string;
}