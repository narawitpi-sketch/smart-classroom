import React from 'react';
import { BarChart3 } from 'lucide-react';

export const SimpleBarChart = ({ data, title, color = "bg-blue-500" }: { data: { label: string, value: number }[], title: string, color?: string }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-gray-400" /> {title}</h3>
      <div className="space-y-4">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 text-sm">
            <div className="w-24 text-gray-500 truncate text-right font-medium">{item.label}</div>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color} transition-all duration-500 ease-out`} style={{ width: `${(item.value / maxValue) * 100}%` }}></div>
            </div>
            <div className="w-8 text-right font-bold text-gray-700">{item.value}</div>
          </div>
        ))}
        {data.length === 0 && <div className="text-center text-gray-400 py-4">ไม่มีข้อมูล</div>}
      </div>
    </div>
  );
};
