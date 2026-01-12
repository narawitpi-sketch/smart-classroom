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
    totalBudget: number;
  };
}

const StatsPanel: React.FC<StatsPanelProps> = ({ statsData }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
       <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 /> สรุปสถิติ</h1>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col justify-between">
              <div>
                  <h3 className="text-gray-500 font-medium mb-1">งบประมาณที่ใช้ไป (อุปกรณ์)</h3>
                  <p className="text-3xl font-bold text-[#66FF00]">{statsData.totalBudget.toLocaleString()} ฿</p>
              </div>
              <div className="mt-4 text-xs text-gray-400">คำนวนจากราคาต้นทุนอุปกรณ์ที่เบิกใช้จริง</div>
          </div>
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
