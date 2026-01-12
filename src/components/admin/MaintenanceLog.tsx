import React from 'react';
import { ClipboardList, Download } from 'lucide-react';
import type { Issue } from '../../types';
import { formatDate } from '../../utils/helpers';

interface MaintenanceLogProps {
  issues: Issue[];
  fireAlert: (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: (value?: any) => void, showCancel?: boolean, input?: string) => void;
}

const MaintenanceLog: React.FC<MaintenanceLogProps> = ({ issues, fireAlert }) => {
  
  const handleExportMaintenanceCSV = () => {
    const completedIssues = issues.filter(i => i.status === 'completed');
    if (completedIssues.length === 0) { fireAlert('ไม่พบข้อมูล', 'ยังไม่มีรายการที่ซ่อมเสร็จ', 'warning'); return; }

    const headers = ['รหัส,วันที่แจ้ง,วันที่เสร็จ,ห้อง,ปัญหา,วิธีแก้ไข,อุปกรณ์ที่ใช้,ผู้ซ่อม'];
    const csvRows = completedIssues.map(i => {
       const createDate = i.timestamp ? new Date(i.timestamp.seconds * 1000).toLocaleDateString('th-TH') : '-';
       const resolveDate = i.resolveTimestamp ? new Date(i.resolveTimestamp.seconds * 1000).toLocaleDateString('th-TH') : '-';
       const esc = (t: string) => `"${(t || '').replace(/"/g, '""')}"`;
       
       return [
         esc(i.id), esc(createDate), esc(resolveDate), esc(i.room), 
         esc(i.description), esc(i.solution || ''), esc(i.equipment || ''), esc(i.solver || '')
       ].join(',');
    });

    const blob = new Blob(['\uFEFF' + [headers, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `maintenance-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ClipboardList /> สรุปรายการซ่อม (Maintenance Log)</h1>
          <button onClick={handleExportMaintenanceCSV} className="flex items-center gap-2 bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold px-4 py-2 rounded-lg transition"><Download size={16} /> ดาวน์โหลด (CSV)</button>
       </div>
       
       <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs">
                   <tr>
                      <th className="px-6 py-3">วันที่แจ้ง / เสร็จ</th>
                      <th className="px-6 py-3">ห้อง / ปัญหา</th>
                      <th className="px-6 py-3">การแก้ไข</th>
                      <th className="px-6 py-3">อุปกรณ์ที่ใช้</th>
                      <th className="px-6 py-3">ผู้ดำเนินการ</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {issues.filter(i => i.status === 'completed').map(issue => (
                      <tr key={issue.docId} className="hover:bg-gray-50 transition">
                         <td className="px-6 py-4">
                            <div className="text-xs text-gray-500">แจ้ง: {formatDate(issue.timestamp)}</div>
                            <div className="text-xs text-green-600 font-medium">เสร็จ: {issue.resolveTimestamp ? formatDate(issue.resolveTimestamp) : '-'}</div>
                         </td>
                         <td className="px-6 py-4">
                            <div className="font-bold text-gray-800">{issue.room}</div>
                            <div className="text-xs text-gray-500">{issue.category}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[150px]">{issue.description}</div>
                         </td>
                         <td className="px-6 py-4 text-gray-800">{issue.solution || '-'}</td>
                         <td className="px-6 py-4 text-gray-800">{issue.equipment || '-'}</td>
                         <td className="px-6 py-4 font-medium text-indigo-600">{issue.solver || '-'}</td>
                      </tr>
                   ))}
                   {issues.filter(i => i.status === 'completed').length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-400">ยังไม่มีรายการที่ซ่อมเสร็จ</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};

export default MaintenanceLog;
