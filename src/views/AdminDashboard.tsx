import React, { useState, useMemo } from 'react';
import { Monitor, Menu, X, LayoutGrid, FileText, LogOut, BarChart3, Download, Wrench, CheckCircle, Trash2, Plus, Phone, Calendar as CalendarIcon } from 'lucide-react';
import { collection, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db, APP_ID, getReporterLabel, formatDate } from '../utils/firebase';
import { type Issue, type Room, type AdminTab, type Status } from '../utils/types';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { StatusBadge } from '../components/StatusBadge';

const CATEGORIES = [
  { id: 'Visual', label: 'ภาพ/โปรเจคเตอร์' },
  { id: 'Audio', label: 'เสียง/ไมโครโฟน' },
  { id: 'Network', label: 'อินเทอร์เน็ต/Wi-Fi' },
  { id: 'Environment', label: 'แอร์/ไฟ/ความสะอาด' },
  { id: 'Other', label: 'อื่นๆ' },
];

interface AdminDashboardProps {
  user: any;
  issues: Issue[];
  rooms: Room[];
  handleLogout: () => void;
  fireAlert: (title: string, text: string, icon: 'success' | 'error' | 'warning', onConfirm?: () => void, showCancel?: boolean) => void;
}

export const AdminDashboard = ({ user, issues, rooms, handleLogout, fireAlert }: AdminDashboardProps) => {
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterReporterType, setFilterReporterType] = useState('all');
  const [newRoomName, setNewRoomName] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportCategory, setExportCategory] = useState('all');
  const [exportReporterType, setExportReporterType] = useState('all');

  // Handlers
  const handleStatusChange = async (docId: string, newStatus: Status) => {
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', docId), { status: newStatus }); } catch (error) { console.error(error); }
  };

  const handleDeleteIssue = async (docId: string) => {
    fireAlert('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ที่จะลบรายการนี้?', 'warning', async () => {
      try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', docId)); } 
      catch (error) { fireAlert('ลบไม่สำเร็จ', 'เกิดข้อผิดพลาด', 'error'); }
    }, true);
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms'), { name: newRoomName.trim() });
      setNewRoomName('');
      fireAlert('เพิ่มห้องสำเร็จ', `เพิ่มห้อง ${newRoomName} เรียบร้อยแล้ว`, 'success');
    } catch (error) { fireAlert('ผิดพลาด', 'ไม่สามารถเพิ่มห้องได้', 'error'); }
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    fireAlert('ยืนยันลบห้อง', `ต้องการลบห้อง ${roomName} ใช่หรือไม่?`, 'warning', async () => {
      try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'rooms', roomId)); } 
      catch (error) { fireAlert('ผิดพลาด', 'ลบห้องไม่สำเร็จ', 'error'); }
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

    const headers = ['รหัส,วันที่,เวลา,ห้องเรียน,ผู้แจ้ง,สถานะผู้แจ้ง,เบอร์โทร,ประเภทปัญหา,รายละเอียด,ความเร่งด่วน,สถานะ'];
    const csvRows = filteredIssues.map(i => {
      const d = i.timestamp ? new Date(i.timestamp.seconds * 1000) : null;
      const esc = (t: string) => `"${(t || '').replace(/"/g, '""')}"`;
      return [
        esc(i.id), esc(d?.toLocaleDateString('th-TH')||'-'), esc(d?.toLocaleTimeString('th-TH')||'-'),
        esc(i.room), esc(i.reporter), esc(getReporterLabel(i.reporterType)), esc(`'${i.phone}`),
        esc(i.category), esc(i.description), esc(i.urgency), esc(i.status)
      ].join(',');
    });

    const blob = new Blob(['\uFEFF' + [headers, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setShowExportModal(false);
  };
  
  // Stats Logic
  const statsData = useMemo(() => {
    const stats: any = { daily: {}, monthly: {}, yearly: {}, byCategory: {}, byReporter: {} };
    issues.forEach(i => {
      if (!i.timestamp) return;
      const d = new Date(i.timestamp.seconds * 1000);
      const day = d.toLocaleDateString('th-TH');
      const month = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      const year = d.getFullYear().toString();
      
      stats.daily[day] = (stats.daily[day] || 0) + 1;
      stats.monthly[month] = (stats.monthly[month] || 0) + 1;
      stats.yearly[year] = (stats.yearly[year] || 0) + 1;
      stats.byCategory[i.category] = (stats.byCategory[i.category] || 0) + 1;
      const rep = getReporterLabel(i.reporterType);
      stats.byReporter[rep] = (stats.byReporter[rep] || 0) + 1;
    });
    const fmt = (o: any) => Object.entries(o).map(([label, value]: any) => ({ label, value }));
    const sortedDaily = fmt(stats.daily).slice(0, 7); // เอาแค่ 7 วันล่าสุด
    return { daily: sortedDaily, monthly: fmt(stats.monthly), yearly: fmt(stats.yearly), byCategory: fmt(stats.byCategory), byReporter: fmt(stats.byReporter) };
  }, [issues]);

  return (
    <>
    {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Download size={20} /> ดาวน์โหลดรายงาน</h3>
                <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
             </div>
             <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="block text-sm font-medium text-gray-700 mb-1">ตั้งแต่วันที่</label><input type="date" className="w-full px-3 py-2 border rounded-lg" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} /></div>
                   <div><label className="block text-sm font-medium text-gray-700 mb-1">ถึงวันที่</label><input type="date" className="w-full px-3 py-2 border rounded-lg" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label><select className="w-full px-3 py-2 border rounded-lg bg-white" value={exportCategory} onChange={e => setExportCategory(e.target.value)}><option value="all">ทั้งหมด</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ผู้แจ้ง</label><select className="w-full px-3 py-2 border rounded-lg bg-white" value={exportReporterType} onChange={e => setExportReporterType(e.target.value)}><option value="all">ทั้งหมด</option><option value="lecturer">อาจารย์</option><option value="student">นักศึกษา</option></select></div>
                <button onClick={handleExportCSV} className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold py-3 rounded-xl shadow-md flex justify-center items-center gap-2 mt-2"><Download size={20} /> ยืนยันการดาวน์โหลด</button>
             </div>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col md:flex-row">
       {/* Sidebar Code (Same as before) */}
       <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
             <div className="h-full flex flex-col">
                <div className="md:hidden p-4 flex justify-end"><button onClick={() => setIsSidebarOpen(false)}><X size={20} /></button></div>
                <div className="p-6 border-b flex items-center gap-3 hidden md:flex">
                   <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-300">
                      {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-black text-[#66FF00] font-bold text-xl">{user?.displayName?.charAt(0) || 'A'}</div>}
                   </div>
                   <div className="overflow-hidden">
                      <p className="text-sm font-bold truncate">{user?.displayName || 'Admin'}</p>
                      <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                   </div>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                   <button onClick={() => { setAdminTab('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'dashboard' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><LayoutGrid size={20} /> ภาพรวม</button>
                   <button onClick={() => { setAdminTab('issues'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'issues' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><FileText size={20} /> รายการแจ้งซ่อม</button>
                   <button onClick={() => { setAdminTab('rooms'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'rooms' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><Monitor size={20} /> จัดการห้องเรียน</button>
                </nav>
                <div className="p-4 border-t"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-600 transition text-sm"><LogOut size={16} /> ออกจากระบบ</button></div>
             </div>
          </aside>
       
       <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
         {adminTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 /> สรุปสถิติ</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SimpleBarChart title="ยอดแจ้งรายวัน (7 วัน)" data={statsData.daily} />
                    <SimpleBarChart title="ยอดแจ้งรายเดือน" data={statsData.monthly} color="bg-green-500" />
                    <SimpleBarChart title="ยอดแจ้งรายปี" data={statsData.yearly} color="bg-purple-500" />
                    <SimpleBarChart title="แยกตามปัญหา" data={statsData.byCategory} color="bg-orange-500" />
                    <SimpleBarChart title="แยกตามผู้แจ้ง" data={statsData.byReporter} color="bg-pink-500" />
                </div>
            </div>
         )}
         
         {adminTab === 'issues' && (
             <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                   <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileText /> รายการแจ้งซ่อม</h1>
                   <div className="flex flex-wrap gap-2 text-sm items-center">
                      <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold px-4 py-2 rounded-lg transition"><Download size={16} /> ดาวน์โหลด (CSV)</button>
                      <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>
                      <select className="border rounded-lg px-3 py-2 bg-white" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="all">ทุกปัญหา</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                      <select className="border rounded-lg px-3 py-2 bg-white" value={filterReporterType} onChange={e => setFilterReporterType(e.target.value)}><option value="all">ทุกคน</option><option value="lecturer">อาจารย์</option><option value="student">นักศึกษา</option></select>
                   </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600">
                         <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs"><tr><th className="px-6 py-3">เวลา/ห้อง</th><th className="px-6 py-3">ผู้แจ้ง</th><th className="px-6 py-3">รายละเอียด</th><th className="px-6 py-3">สถานะ</th><th className="px-6 py-3 text-right">จัดการ</th></tr></thead>
                         <tbody className="divide-y divide-gray-100">
                            {issues.filter(i => (filterCategory === 'all' || i.category === filterCategory) && (filterReporterType === 'all' || i.reporterType === filterReporterType)).map(issue => (
                               <tr key={issue.docId} className="hover:bg-gray-50 transition">
                                  <td className="px-6 py-4"><div className="font-mono text-gray-500 text-xs">{formatDate(issue.timestamp)}</div><div className="font-bold text-indigo-600 text-base">{issue.room}</div></td>
                                  <td className="px-6 py-4"><div className="font-medium text-gray-900">{issue.reporter}</div><div className="text-xs text-gray-500">{getReporterLabel(issue.reporterType)}</div>{issue.phone && <div className="text-xs text-gray-400 mt-0.5"><Phone size={10} className="inline mr-1"/>{issue.phone}</div>}</td>
                                  <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 border border-gray-200 mb-1 inline-block">{issue.category}</span><p className="truncate max-w-xs text-gray-800">{issue.description}</p></td>
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
         )}

         {adminTab === 'rooms' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
               <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Monitor /> จัดการห้องเรียน</h1>
               <form onSubmit={handleAddRoom} className="bg-white p-6 rounded-xl shadow-sm border flex gap-4 items-end">
                  <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">ชื่อห้อง / เลขห้อง</label><input type="text" placeholder="เช่น 942" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} /></div>
                  <button type="submit" className="bg-[#66FF00] text-black font-bold px-6 py-2.5 rounded-lg hover:opacity-90 flex items-center gap-2"><Plus size={20} /> เพิ่มห้อง</button>
               </form>
               <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b font-medium text-gray-700">รายชื่อห้องทั้งหมด ({rooms.length})</div>
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                     {rooms.map(room => (
                        <div key={room.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50"><span className="font-bold text-gray-800 text-lg">{room.name}</span><button onClick={() => handleDeleteRoom(room.id, room.name)} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50"><Trash2 size={18} /></button></div>
                     ))}
                     {rooms.length === 0 && <div className="p-8 text-center text-gray-400">ยังไม่มีข้อมูลห้องเรียน</div>}
                  </div>
               </div>
            </div>
         )}
       </main>
    </div>
  );
};