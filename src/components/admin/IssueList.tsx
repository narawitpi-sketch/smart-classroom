import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Phone, 
  Wrench, 
  CheckCircle, 
  Trash2,
  Image as ImageIcon 
} from 'lucide-react';
import { updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { APP_ID, CATEGORIES } from '../../config/constants';
import type { Issue, Status } from '../../types';
import { getReporterLabel, formatDate } from '../../utils/helpers';
import StatusBadge from '../StatusBadge';
import MaintenanceModal from '../MaintenanceModal';

interface IssueListProps {
  issues: Issue[];
  fireAlert: (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: (value?: any) => void, showCancel?: boolean, input?: string) => void;
}

const IssueList: React.FC<IssueListProps> = ({ issues, fireAlert }) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterReporterType, setFilterReporterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportCategory, setExportCategory] = useState('all');
  const [exportReporterType, setExportReporterType] = useState('all');

  // Maintenance Modal State
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // ... (handleStatusChange, handleMaintenanceSubmit, handleDeleteIssue logic) ...

  const handleStatusChange = async (docId: string | undefined, newStatus: Status) => {
    if (!docId) return;
    
    if (newStatus === 'completed') {
      setSelectedIssueId(docId);
      setShowMaintenanceModal(true);
      return;
    }

    try { 
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', docId), { status: newStatus });
    } catch (error) { console.error(error); }
  };

  const handleMaintenanceSubmit = async (data: { solver: string; solution: string; equipment: string }) => {
    if (!selectedIssueId) return;
    
    try {
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', selectedIssueId), { 
        status: 'completed',
        resolveTimestamp: new Date(),
        solver: data.solver,
        solution: data.solution,
        equipment: data.equipment
      });

      const issue = issues.find(i => i.docId === selectedIssueId);
      if (issue && issue.imagePath) {
        const imageRef = ref(storage, issue.imagePath);
        await deleteObject(imageRef).catch(() => console.log("Image already deleted or not found"));
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', selectedIssueId), { imageUrl: null, imagePath: null });
      }
      
      fireAlert('บันทึกสำเร็จ', 'บันทึกผลการซ่อมและปิดงานเรียบร้อยแล้ว', 'success');
      setShowMaintenanceModal(false);
      setSelectedIssueId(null);
    } catch (error) {
      fireAlert('ผิดพลาด', 'ไม่สามารถบันทึกได้', 'error');
      console.error(error); 
    }
  };

  const handleDeleteIssue = async (docId: string) => {
    fireAlert('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ที่จะลบรายการนี้?', 'warning', async () => {
      try {
        const issue = issues.find(i => i.docId === docId);
        if (issue && issue.imagePath) {
          const imageRef = ref(storage, issue.imagePath);
          await deleteObject(imageRef).catch(() => console.log("Image already deleted"));
        }
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', docId));
        fireAlert('ลบสำเร็จ', 'รายการถูกลบเรียบร้อยแล้ว', 'success');
      } catch (error) {
        fireAlert('ลบไม่สำเร็จ', 'เกิดข้อผิดพลาด', 'error');
      }
    }, true);
  };

  const handleExportCSV = () => {
    const filteredIssues = issues.filter(issue => {
      let isValid = true;
      if (exportStartDate && issue.timestamp) {
        const d = new Date(issue.timestamp.seconds * 1000); d.setHours(0,0,0,0);
        if (d < new Date(exportStartDate)) isValid = false;
      }
      if (exportEndDate && issue.timestamp) {
        const d = new Date(issue.timestamp.seconds * 1000); d.setHours(23,59,59,999);
        if (d > new Date(exportEndDate)) isValid = false;
      }
      if (exportCategory !== 'all' && issue.category !== exportCategory) isValid = false;
      if (exportReporterType !== 'all' && issue.reporterType !== exportReporterType) isValid = false;
      return isValid;
    });

    if (filteredIssues.length === 0) { fireAlert('ไม่พบข้อมูล', 'ไม่มีรายการตามเงื่อนไข', 'warning'); return; }

    const headers = ['รหัส,วันที่,เวลา,ห้องเรียน,ผู้แจ้ง,สถานะผู้แจ้ง,เบอร์โทร,ประเภทปัญหา,รายละเอียด,ความเร่งด่วน,สถานะ,รูปภาพ'];
    const csvRows = filteredIssues.map(i => {
      const d = i.timestamp ? new Date(i.timestamp.seconds * 1000) : null;
      const esc = (t: string) => `"${(t || '').replace(/"/g, '""')}"`;
      return [
        esc(i.id), esc(d?.toLocaleDateString('th-TH')||'-'), esc(d?.toLocaleTimeString('th-TH')||'-'),
        esc(i.room), esc(i.reporter), esc(getReporterLabel(i.reporterType)), esc(`'${i.phone}`),
        esc(i.category), esc(i.description), esc(i.urgency), esc(i.status), esc(i.imageUrl || '-')
      ].join(',');
    });

    const blob = new Blob(['\uFEFF' + [headers, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setShowExportModal(false);
  };
    
  return (
    <>
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Download size={20} /> ดาวน์โหลดรายงาน</h3>
                <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600"><Search size={20} className="hidden" /> X</button>
             </div>
             <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">ตั้งแต่วันที่</label><input type="date" className="w-full px-3 py-2 border rounded-lg" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">ถึงวันที่</label><input type="date" className="w-full px-3 py-2 border rounded-lg" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} /></div></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label><select className="w-full px-3 py-2 border rounded-lg bg-white" value={exportCategory} onChange={e => setExportCategory(e.target.value)}><option value="all">ทั้งหมด</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ผู้แจ้ง</label><select className="w-full px-3 py-2 border rounded-lg bg-white" value={exportReporterType} onChange={e => setExportReporterType(e.target.value)}><option value="all">ทั้งหมด</option><option value="lecturer">อาจารย์</option><option value="student">นักศึกษา</option></select></div>
                <button onClick={handleExportCSV} className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold py-3 rounded-xl shadow-md flex justify-center items-center gap-2 mt-2"><Download size={20} /> ยืนยันการดาวน์โหลด</button>
             </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
         <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileText /> รายการแจ้งซ่อม</h1>
            <div className="flex flex-wrap gap-2 text-sm items-center">
               <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold px-4 py-2 rounded-lg transition"><Download size={16} /> ดาวน์โหลด (CSV)</button>
               <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>
               <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                     type="text" 
                     placeholder="ค้นหาห้อง / รายละเอียด..." 
                     className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none text-sm w-48"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
               <select className="border rounded-lg px-3 py-2 bg-white" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="all">ทุกปัญหา</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
               <select className="border rounded-lg px-3 py-2 bg-white" value={filterReporterType} onChange={e => setFilterReporterType(e.target.value)}><option value="all">ทุกคน</option><option value="lecturer">อาจารย์</option><option value="student">นักศึกษา</option></select>
            </div>
         </div>
         <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs"><tr><th className="px-6 py-3">เวลา/ห้อง</th><th className="px-6 py-3">ผู้แจ้ง</th><th className="px-6 py-3">รายละเอียด</th><th className="px-6 py-3">สถานะ</th><th className="px-6 py-3 text-right">จัดการ</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                     {issues.filter(i => 
                        (filterCategory === 'all' || i.category === filterCategory) && 
                        (filterReporterType === 'all' || i.reporterType === filterReporterType) &&
                        (searchTerm === '' || i.room.toLowerCase().includes(searchTerm.toLowerCase()) || i.description.toLowerCase().includes(searchTerm.toLowerCase()))
                     ).map(issue => (
                        <tr key={issue.docId} className="hover:bg-gray-50 transition">
                           <td className="px-6 py-4"><div className="font-mono text-gray-500 text-xs">{formatDate(issue.timestamp)}</div><div className="font-bold text-indigo-600 text-base">{issue.room}</div></td>
                           <td className="px-6 py-4"><div className="font-medium text-gray-900">{issue.reporter}</div><div className="text-xs text-gray-500">{getReporterLabel(issue.reporterType)}</div>{issue.phone && <div className="text-xs text-gray-400 mt-0.5"><Phone size={10} className="inline mr-1"/>{issue.phone}</div>}</td>
                           <td className="px-6 py-4">
                             <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 border border-gray-200 mb-1 inline-block">{issue.category}</span>
                             <p className="truncate max-w-xs text-gray-800">{issue.description}</p>
                             {issue.imageUrl && (
                               <a href={issue.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                 <ImageIcon size={12} /> ดูรูปภาพ
                               </a>
                             )}
                           </td>
                           <td className="px-6 py-4"><StatusBadge status={issue.status} /></td>
                           <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2">
                              {issue.status === 'pending' && <button onClick={() => handleStatusChange(issue.docId!, 'in-progress')} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded" title="รับงาน"><Wrench size={16} /></button>}
                              {issue.status === 'in-progress' && <button onClick={() => handleStatusChange(issue.docId!, 'completed')} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded" title="ปิดงาน"><CheckCircle size={16} /></button>}
                              <button onClick={() => handleDeleteIssue(issue.docId!)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded" title="ลบ"><Trash2 size={16} /></button>
                           </div></td>
                        </tr>
                     ))}
                     {issues.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">ยังไม่มีข้อมูล</td></tr>}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
      
      <MaintenanceModal 
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onSubmit={handleMaintenanceSubmit}
        defaultSolver="Admin"
      />
    </>
  );
};

export default IssueList;
