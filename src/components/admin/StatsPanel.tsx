import React from 'react';
import { BarChart3 } from 'lucide-react';
import SimpleBarChart from '../SimpleBarChart';

interface StatsPanelProps {
  statsData: {
    daily: { label: string; value: number }[];
    monthly: { label: string; value: number }[];
    yearly: { label: string; value: number }[];
    byCategory: { label: string; value: number }[];
    byReporter: { label: string; value: number }[];
  };
}

const StatsPanel: React.FC<StatsPanelProps> = ({ statsData }) => {
  return (
    <div className="space-y-6 animate-fade-in">
       <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 /> สรุปสถิติ</h1>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SimpleBarChart title="ยอดแจ้งรายวัน (7 วัน)" data={statsData.daily} />
          <SimpleBarChart title="ยอดแจ้งรายเดือน" data={statsData.monthly} color="bg-green-500" />
          <SimpleBarChart title="ยอดแจ้งรายปี" data={statsData.yearly} color="bg-purple-500" />
          <SimpleBarChart title="แยกตามปัญหา" data={statsData.byCategory} color="bg-orange-500" />
          <SimpleBarChart title="แยกตามผู้แจ้ง" data={statsData.byReporter} color="bg-pink-500" />
       </div>
    </div>
  );
};

export default StatsPanel;
