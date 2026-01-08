// src/types/index.ts
export type Role = 'guest' | 'reporter' | 'staff' | 'login_admin';
export type Status = 'pending' | 'in-progress' | 'completed';
export type Urgency = 'low' | 'medium' | 'high';
export type ReporterType = 'lecturer' | 'student' | 'other';
export type AdminTab = 'dashboard' | 'issues' | 'rooms' | 'feedbacks' | 'maintenance';

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
  imageUrl?: string;
  imagePath?: string;
  // Maintenance Log
  resolveTimestamp?: any;
  solver?: string;
  solution?: string;
  equipment?: string;
}

export interface Room {
  id: string;
  name: string;
}

export interface Feedback {
  id?: string;
  gender: string;
  status: string;
  age: string;
  r_sys_easy: number;
  r_sys_complete: number;
  r_sys_speed: number;
  r_svc_contact: number;
  r_svc_start: number;
  r_svc_skill: number;
  r_svc_polite: number;
  r_svc_result: number;
  r_svc_overall: number;
  suggestion?: string;
  timestamp: any;
}