// src/components/SimpleBarChart.tsx
import React from 'react';
import { BarChart3 } from 'lucide-react';

interface SimpleBarChartProps {
  data: { label: string; value: number }[];
  title: string;
  color?: string;
  horizontal?: boolean;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, title, color = "bg-blue-500", horizontal = false }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-gray-400" /> {title}</h3>
      <div className="space-y-4">
        {data.map((item, idx) => (
          <div key={idx} className={`flex ${horizontal ? 'flex-row items-center gap-3' : 'flex-col gap-1'} text-sm`}>
            <div className={`${horizontal ? 'w-48 text-right' : 'w-full'} text-gray-500 truncate font-medium`} title={item.label}>{item.label}</div>
            <div className={`flex-1 ${horizontal ? 'h-3' : 'h-2 w-full'} bg-gray-100 rounded-full overflow-hidden`}>
              <div className={`h-full rounded-full ${color} transition-all duration-500 ease-out`} style={{ width: `${(item.value / (horizontal ? 5 : maxValue || 1)) * 100}%` }}></div>
            </div>
            <div className={`${horizontal ? 'w-8 text-right' : 'w-full text-right'} font-bold text-gray-700`}>{item.value.toFixed(1)}</div>
          </div>
        ))}
        {data.length === 0 && <div className="text-center text-gray-400 py-4">ไม่มีข้อมูล</div>}
      </div>
    </div>
  );
};

export default SimpleBarChart;