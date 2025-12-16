// src/components/StatusBadge.tsx
import React from 'react';
import { Clock, Wrench, CheckCircle } from 'lucide-react';
import type { Status } from '../types';

interface StatusBadgeProps {
  status: Status;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'in-progress': 'bg-[#66FF00]/20 text-green-900 border-[#66FF00]',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  const labels = { pending: 'รอตรวจสอบ', 'in-progress': 'กำลังแก้ไข', completed: 'แก้ไขแล้ว' };
  const icons = { pending: <Clock size={14} className="mr-1" />, 'in-progress': <Wrench size={14} className="mr-1" />, completed: <CheckCircle size={14} className="mr-1" /> };
  return <span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>{icons[status]}{labels[status]}</span>;
};

export default StatusBadge;