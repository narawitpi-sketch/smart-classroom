import React, { useMemo } from 'react';
import { ClipboardCheck, Download, MessageSquare, Star } from 'lucide-react';
import type { Feedback } from '../../types';
import { formatDate } from '../../utils/helpers';
import SimpleBarChart from '../SimpleBarChart';

interface FeedbackListProps {
  feedbacks: Feedback[];
  fireAlert: (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: (value?: any) => void, showCancel?: boolean, input?: string) => void;
}

const FeedbackList: React.FC<FeedbackListProps> = ({ feedbacks, fireAlert }) => {
  
  const handleExportFeedbackCSV = () => {
    if (feedbacks.length === 0) { fireAlert('ไม่พบข้อมูล', 'ยังไม่มีการประเมิน', 'warning'); return; }

    const headers = [
      'วันที่', 'เพศ', 'สถานะ', 'อายุ',
      '4.1 ง่ายต่อการใช้งาน', '4.2 ข้อมูลครบถ้วน', '4.3 ความเร็วระบบ',
      '5.1 การติดต่อกลับ', '5.2 ความเร็วเข้าซ่อม', '5.3 ความสามารถช่าง', '5.4 ความสุภาพ', '5.5 ผลลัพธ์', '5.6 ภาพรวม', '6. ข้อเสนอแนะ'
    ];

    const csvRows = feedbacks.map(f => {
      const d = f.timestamp ? new Date(f.timestamp.seconds * 1000) : null;
      return [
        `"${d?.toLocaleDateString('th-TH') || '-'}"`, `"${f.gender}"`, `"${f.status}"`, `"${f.age}"`, 
        f.r_sys_easy, f.r_sys_complete, f.r_sys_speed,
        f.r_svc_contact, f.r_svc_start, f.r_svc_skill, f.r_svc_polite, f.r_svc_result, f.r_svc_overall,
        `"${f.suggestion || '-'}"`
      ].join(',');
    });

    const blob = new Blob(['\uFEFF' + [headers, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `feedback-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const feedbackStats = useMemo(() => {
    if (feedbacks.length === 0) return null;
    const total = feedbacks.length;
    const avg = (key: keyof Feedback) => (feedbacks.reduce((acc, curr) => acc + (curr[key] as number || 0), 0) / total).toFixed(2);
    
    return [
      { label: '4.1 ใช้งานง่าย', value: parseFloat(avg('r_sys_easy')) },
      { label: '4.2 ข้อมูลครบ', value: parseFloat(avg('r_sys_complete')) },
      { label: '4.3 ระบบเร็ว', value: parseFloat(avg('r_sys_speed')) },
      { label: '5.1 ติดต่อกลับ', value: parseFloat(avg('r_svc_contact')) },
      { label: '5.2 เข้าซ่อมเร็ว', value: parseFloat(avg('r_svc_start')) },
      { label: '5.3 ทักษะช่าง', value: parseFloat(avg('r_svc_skill')) },
      { label: '5.4 ความสุภาพ', value: parseFloat(avg('r_svc_polite')) },
      { label: '5.5 ผลลัพธ์', value: parseFloat(avg('r_svc_result')) },
      { label: '5.6 ภาพรวม', value: parseFloat(avg('r_svc_overall')) },
    ];
  }, [feedbacks]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ClipboardCheck /> ผลประเมินความพึงพอใจ</h1>
        <button onClick={handleExportFeedbackCSV} className="flex items-center gap-2 bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold px-4 py-2 rounded-lg transition"><Download size={16} /> ดาวน์โหลด (CSV)</button>
      </div>

      <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare size={24} /> ข้อเสนอแนะจากผู้ใช้งาน
          </h3>
          <div className="grid gap-4">
              {feedbacks.filter(f => f.suggestion).map((f, idx) => (
                  <div key={f.id || idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <p className="text-gray-800">{f.suggestion}</p>
                      <div className="mt-2 text-xs text-gray-500 flex gap-2">
                          <span>{f.status}</span>
                          <span>•</span>
                          <span>{formatDate(f.timestamp)}</span>
                      </div>
                  </div>
              ))}
              {feedbacks.filter(f => f.suggestion).length === 0 && (
                  <p className="text-gray-400 text-center py-4">ไม่มีข้อเสนอแนะ</p>
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-lg text-gray-800">คะแนนเฉลี่ยรายข้อ</h3>
             <span className="text-sm text-gray-500">จากทั้งหมด {feedbacks.length} คน</span>
          </div>
          <div className="h-[400px] w-full">
             {feedbackStats ? (
                <SimpleBarChart data={feedbackStats} title="" horizontal />
             ) : (
                <div className="h-full flex items-center justify-center text-gray-400">ยังไม่มีข้อมูลการประเมิน</div>
             )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
           <h3 className="font-bold text-gray-800 mb-2">คะแนนความพึงพอใจภาพรวม</h3>
           <div className="text-6xl font-black text-[#66FF00] drop-shadow-sm mb-2">
             {feedbackStats ? feedbackStats[8].value.toFixed(1) : '0.0'}
           </div>
           <div className="flex gap-1 mb-4">
             {[1,2,3,4,5].map(s => <Star key={s} size={24} className={s <= (feedbackStats ? Math.round(feedbackStats[8].value) : 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />)}
           </div>
           <p className="text-gray-500 text-sm">คะแนนเต็ม 5</p>
        </div>
      </div>
    </div>
  );
};

export default FeedbackList;
