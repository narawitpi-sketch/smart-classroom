import React, { useState } from 'react';
import {
  Search,
  Wrench,
  CheckCircle,
  Trash2,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import { updateDoc, deleteDoc, doc, runTransaction, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { APP_ID, CATEGORIES } from '../../config/constants';
import type { Issue, Status, EquipmentItem, UsedEquipment } from '../../types';
import { getReporterLabel, formatDate } from '../../utils/helpers';
import StatusBadge from '../StatusBadge';
import MaintenanceModal from '../MaintenanceModal';

interface IssueListProps {
  issues: Issue[];
  fireAlert: (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: (value?: any) => void, showCancel?: boolean, input?: string) => void;
  inventory: EquipmentItem[];
}

const IssueList: React.FC<IssueListProps> = ({ issues, fireAlert, inventory }) => {
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

  // Direct Repair State
  const [showDirectRepairModal, setShowDirectRepairModal] = useState(false);
  const [directRoom, setDirectRoom] = useState('');
  const [directProblem, setDirectProblem] = useState('');

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

  const handleDirectRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directRoom.trim() || !directProblem.trim()) return;

    try {
       // Create a new "Self-Reported" issue
       const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues'), {
          description: directProblem.trim(), 
          room: directRoom.trim(),
          reporter: 'Admin', 
          reporterType: 'admin', 
          status: 'in-progress', 
          timestamp: serverTimestamp(),
          category: 'other',
          imageUrl: null,
          imagePath: null
       });
       
       // Close Direct Modal
       setShowDirectRepairModal(false);
       setDirectRoom('');
       setDirectProblem('');

       // Immediately open Maintenance Modal for this new issue
       setSelectedIssueId(docRef.id);
       setShowMaintenanceModal(true);
       
    } catch (error) {
       console.error(error);
       fireAlert('ผิดพลาด', 'สร้างรายการไม่สำเร็จ', 'error');
    }
  };


  const handleMaintenanceSubmit = async (data: { solver: string; solution: string; equipment: string }, usedItems: UsedEquipment[]) => {
    if (!selectedIssueId) return;
    
    try {
      await runTransaction(db, async (transaction) => {
          // 1. Get current inventory items to check stock (optional, but good for safety)
          // For now, we trust the UI but we should process the decrements.
          
          const issueRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', selectedIssueId);
          
          // 2. Update Issue
          transaction.update(issueRef, { 
            status: 'completed',
            resolveTimestamp: new Date(),
            solver: data.solver,
            solution: data.solution,
            equipment: data.equipment,
            usedItems: usedItems // Save structured data for budget calc
          });

          // 3. Deduct Stock
          for (const item of usedItems) {
             if (item.inventoryId) {
                const itemRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', item.inventoryId);
                // Use increment(-qty) for atomic decrement
                transaction.update(itemRef, { quantity: increment(-item.quantity) });
             }
          }
      });

      // Cleanup Image if exists
      const issue = issues.find(i => i.docId === selectedIssueId);
      if (issue && issue.imagePath) {
        const imageRef = ref(storage, issue.imagePath);
        await deleteObject(imageRef).catch(() => console.log("Image already deleted or not found"));
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', selectedIssueId), { imageUrl: null, imagePath: null });
      }
      
      fireAlert('บันทึกสำเร็จ', 'บันทึกผลการซ่อม, ตัดสต็อก, และปิดงานเรียบร้อยแล้ว', 'success');
      setShowMaintenanceModal(false);
      setSelectedIssueId(null);
    } catch (error) {
      fireAlert('ผิดพลาด', 'ไม่สามารถบันทึกได้: ' + error, 'error');
      console.error(error); 
    }
  };

  const handleDeleteIssue = async (docId: string, imagePath?: string | null) => {
    fireAlert('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ที่จะลบรายการนี้?', 'warning', async () => {
      try {
        if (imagePath) {
          const imageRef = ref(storage, imagePath);
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
      <div className="space-y-6 animate-fade-in">
         {/* Controls Header */}
         <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
            {/* Search & Stats */}
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <input type="text" placeholder="ค้นหา..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                {/* Direct Repair Button */}
                <button 
                  onClick={() => setShowDirectRepairModal(true)} 
                  className="flex items-center gap-2 bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold px-4 py-2 rounded-lg transition shadow-sm whitespace-nowrap"
                >
                  <Wrench size={18} /> บันทึกซ่อมเอง
                </button>
            </div>
            {/* Filters */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
               <select className="border rounded-lg px-3 py-2 bg-white" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="all">ทุกปัญหา</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
               <select className="border rounded-lg px-3 py-2 bg-white" value={filterReporterType} onChange={e => setFilterReporterType(e.target.value)}><option value="all">ทุกคน</option><option value="lecturer">อาจารย์</option><option value="student">นักศึกษา</option><option value="admin">Admin (ซ่อมเอง)</option></select>
               <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition whitespace-nowrap font-semibold">
                  <Download size={18} /> Export
               </button>
            </div>
         </div>

         {/* ... Table Section ... */}
         <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
             {/* ... table content ... */}
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  {/* ... thead ... */}
                   <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs">
                    <tr>
                      <th className="px-4 py-3">สถานะ</th>
                      <th className="px-4 py-3">วันที่แจ้ง</th>
                      <th className="px-4 py-3">ห้อง / ผู้แจ้ง</th>
                      <th className="px-4 py-3">รายละเอียด</th>
                      <th className="px-4 py-3 text-right">จัดการ</th>
                    </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {/* ... map issues ... */}
                      {/* Insert your filtering logic here normally provided by 'filteredIssues' variable in original code */}
                      {issues.filter(issue => {
                          const matchesSearch = issue.room.toLowerCase().includes(searchTerm.toLowerCase()) || issue.description.toLowerCase().includes(searchTerm.toLowerCase()) || issue.reporter.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesCategory = filterCategory === 'all' || issue.category === filterCategory;
                          const matchesReporter = filterReporterType === 'all' || issue.reporterType === filterReporterType;
                          return matchesSearch && matchesCategory && matchesReporter;
                      }).sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).map(issue => (
                          <tr key={issue.docId} className="hover:bg-gray-50 transition">
                             <td className="px-4 py-4"><StatusBadge status={issue.status} /></td>
                             <td className="px-4 py-4 text-xs">
                                <p className="font-semibold text-gray-900">{formatDate(issue.timestamp)}</p>
                                <p className="text-gray-400">ID: {issue.docId?.substring(0,6)}</p>
                             </td>
                             <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                   <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">{issue.room.substring(0,3)}</div>
                                   <div>
                                      <p className="font-bold text-gray-900">{issue.room}</p>
                                      <p className="text-xs text-gray-500">
                                         {issue.reporterType === 'admin' 
                                            ? (issue.solver ? `${issue.solver} (ผู้ซ่อม)` : 'รอระบุผู้ซ่อม') 
                                            : `${issue.reporter} (${getReporterLabel(issue.reporterType)})`}
                                      </p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-4 py-4 max-w-xs">
                                <p className="text-gray-800 font-medium truncate">{issue.description}</p>
                                <p className="text-xs text-gray-400 truncate">{CATEGORIES.find(c=>c.id===issue.category)?.label}</p>
                                {issue.imageUrl && (
                                   <a href={issue.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:underline mt-1">
                                      <ImageIcon size={10} /> ดูรูปภาพ
                                   </a>
                                )}
                             </td>
                             <td className="px-4 py-4 text-right">
                                {/* Actions */}
                                <div className="flex justify-end gap-2">
                                  {issue.status === 'pending' && <button onClick={() => handleStatusChange(issue.docId, 'in-progress')} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg" title="รับเรื่อง"><Wrench size={16} /></button>}
                                  {issue.status === 'in-progress' && <button onClick={() => handleStatusChange(issue.docId, 'completed')} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg" title="ปิดงาน"><CheckCircle size={16} /></button>}
                                  <button onClick={() => handleDeleteIssue(issue.docId!, issue.imagePath)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                             </td>
                          </tr>
                      ))}
                     {issues.filter(issue => {
                          const matchesSearch = issue.room.toLowerCase().includes(searchTerm.toLowerCase()) || issue.description.toLowerCase().includes(searchTerm.toLowerCase()) || issue.reporter.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesCategory = filterCategory === 'all' || issue.category === filterCategory;
                          const matchesReporter = filterReporterType === 'all' || issue.reporterType === filterReporterType;
                          return matchesSearch && matchesCategory && matchesReporter;
                      }).length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">ไม่มีข้อมูล</td></tr>}
                   </tbody>
                </table>
             </div>
         </div>
      </div>
      
      {/* Maintenance Modal */}
      <MaintenanceModal 
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onSubmit={handleMaintenanceSubmit}
        inventory={inventory}
      />

      {/* Direct Repair Modal */}
      {showDirectRepairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                 <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Wrench className="text-[#66FF00]" size={20} /> บันทึกซ่อมเอง / เบิกของ</h3>
                 <button onClick={() => setShowDirectRepairModal(false)} className="text-gray-400 hover:text-gray-600"><Trash2 className="rotate-45" size={20} /></button>
              </div>
              <form onSubmit={handleDirectRepairSubmit} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">ห้อง / สถานที่</label>
                    <input type="text" required className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none" placeholder="เช่น 1301 หรือ สำนักงาน" value={directRoom} onChange={e => setDirectRoom(e.target.value)} />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">สิ่งที่ซ่อม / เบิก</label>
                    <input type="text" required className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none" placeholder="เช่น เปลี่ยนถ่านไมค์, เบิกสาย LAN" value={directProblem} onChange={e => setDirectProblem(e.target.value)} />
                 </div>
                 <button type="submit" className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold py-3 rounded-xl shadow-md transition mt-2">
                    ต่อไป (เลือกอุปกรณ์)
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Export Modal (reused from previous code or place here) */}
      {showExportModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
                 <button onClick={() => setShowExportModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><Trash2 className="rotate-45" size={20} /></button>
                 <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Download size={20} className="text-[#66FF00]" /> Export CSV</h3>
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">จากวันที่</label>
                            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">ถึงวันที่</label>
                            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} />
                        </div>
                    </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">ประเภท</label>
                        <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={exportCategory} onChange={e => setExportCategory(e.target.value)}>
                            <option value="all">ทั้งหมด</option>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                     </div>
                     <button onClick={handleExportCSV} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition">ดาวน์โหลดรายงาน</button>
                 </div>
             </div>
         </div>
      )}
    </>
  );
};

export default IssueList;
