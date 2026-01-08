// src/config/constants.ts
export const APP_ID = import.meta.env.VITE_APP_ID || 'smart-classroom';
// User authentication is handled by Firebase Auth, deleting items requires simple confirmation now.
export const ALLOWED_ADMIN_EMAILS = (import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || '').split(',');
export const LINE_CHANNEL_ACCESS_TOKEN = import.meta.env.VITE_LINE_CHANNEL_ACCESS_TOKEN || '';
export const LINE_GROUP_ID = import.meta.env.VITE_LINE_GROUP_ID || '';

export const CATEGORIES = [
  { id: 'Visual', icon: 'Monitor', label: 'ภาพ/โปรเจคเตอร์' },
  { id: 'Audio', icon: 'Speaker', label: 'เสียง/ไมโครโฟน' },
  { id: 'Network', icon: 'Wifi', label: 'อินเทอร์เน็ต/Wi-Fi' },
  { id: 'Environment', icon: 'Thermometer', label: 'แอร์/ไฟ/ความสะอาด' },
  { id: 'Other', icon: 'AlertCircle', label: 'อื่นๆ' },
];