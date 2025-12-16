import React, { useState, useEffect, useMemo } from 'react';
import { 
  Monitor, 
  Wrench,
  LogOut,
  CheckCircle,
  Loader2,
  Phone,
  X,
  Trash2,
  Plus,
  BarChart3,
  LayoutGrid,
  FileText,
  Download,
  Menu,
  Star,
  ClipboardCheck,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';

// --- Firebase Imports ---
import { 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  type User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  onSnapshot
} from 'firebase/firestore';
import { 
  ref, 
  deleteObject 
} from 'firebase/storage';

// --- Local Imports ---
import { auth, db, storage } from './config/firebase';
import { APP_ID, ALLOWED_ADMIN_EMAILS, CATEGORIES } from './config/constants';
import type { Role, Status, AdminTab, Issue, Room, Feedback } from './types';
import { getReporterLabel, formatDate, sendLineMessage } from './utils/helpers';
import SweetAlert from './components/SweetAlert';
import StatusBadge from './components/StatusBadge';
import SimpleBarChart from './components/SimpleBarChart';
import FeedbackModal from './components/FeedbackModal';
import LoginScreen from './components/LoginScreen';
import LandingScreen from './components/LandingScreen';
import ReporterScreen from './components/ReporterScreen';

// ==========================================
// 5. MAIN APP COMPONENT
// ==========================================

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [role, setRole] = useState<Role>('guest');
  
  // Data State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]); 
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Admin State
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterReporterType, setFilterReporterType] = useState<string>('all');
  const [newRoomName, setNewRoomName] = useState('');
  
  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportCategory, setExportCategory] = useState('all');
  const [exportReporterType, setExportReporterType] = useState('all');

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Alert
  const [alertConfig, setAlertConfig] = useState<any>({ show: false, title: '', text: '', icon: 'success', onConfirm: () => {}, showCancel: false });
  const fireAlert = (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: () => void, showCancel = false) => {
    setAlertConfig({
      show: true, title, text, icon, showCancel,
      onConfirm: () => { setAlertConfig((prev: any) => ({ ...prev, show: false })); if(onConfirm) onConfirm(); },
      onCancel: () => setAlertConfig((prev: any) => ({ ...prev, show: false }))
    });
  };

  // Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // If the user is a registered and authorized admin
        if (!u.isAnonymous && u.email && ALLOWED_ADMIN_EMAILS.includes(u.email)) {
          setRole('staff');
        } else {
          // For anonymous users or unauthorized users
          setRole('guest');
        }
      } else {
        // If no user is logged in, sign in anonymously
        await signInAnonymously(auth).catch(console.error);
        setRole('guest');
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Notification Permission Effect
  useEffect(() => {
    if (role === 'staff' && "Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("เปิดใช้งานการแจ้งเตือนแล้ว!");
          }
        });
      }
    }
  }, [role]);

  const appLoadTime = React.useRef(new Date());

  // Data Fetching Effect
  useEffect(() => {
    if (!user) return;
    if (role === 'guest') return;

    const qIssues = collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues');
    const unsubIssues = onSnapshot(qIssues, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newIssue = change.doc.data() as Issue;
          const issueTimestamp = newIssue.timestamp && (newIssue.timestamp as any).toDate();
          
          if (role === 'staff' && Notification.permission === "granted" && issueTimestamp && issueTimestamp > appLoadTime.current) {
            new Notification("มีรายการแจ้งซ่อมใหม่", {
              body: `ห้อง ${newIssue.room}: ${newIssue.description}`,
              icon: '/img/logo.png' 
            });
          }
        }
      });

      const fetched = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })) as Issue[];
      fetched.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setIssues(fetched);
    });

    const qRooms = collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms');
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      fetchedRooms.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setRooms(fetchedRooms);
    });

    // Fetch Feedbacks if staff
    let unsubFeedbacks = () => {};
    if (role === 'staff') {
      const qFeedbacks = collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks');
      unsubFeedbacks = onSnapshot(qFeedbacks, (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Feedback[];
        setFeedbacks(fetched);
      });
    }

    return () => { unsubIssues(); unsubRooms(); unsubFeedbacks(); };
  }, [user, role]);

  // Actions
  const handleLogout = async () => {
    try { 
      await signOut(auth); 
      // Force reset everything
      setRole('guest'); 
      setIsSidebarOpen(false); 
      // Re-login anonymously immediately to prevent errors
      await signInAnonymously(auth); 
    } 
    catch (e) { console.error(e); }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      if (result.user.email && ALLOWED_ADMIN_EMAILS.includes(result.user.email)) { setRole('staff'); }
      else { await signOut(auth); fireAlert('เข้าสู่ระบบไม่สำเร็จ', 'อีเมลนี้ไม่มีสิทธิ์', 'error'); await signInAnonymously(auth); }
    } catch (e: any) { 
      if (e.code === 'auth/popup-closed-by-user') { setRole('guest'); }
      else { fireAlert('เกิดข้อผิดพลาด', e.message, 'error'); }
    } finally { setIsLoggingIn(false); }
  };

  // ✅ Updated handleSubmit for new structure
  const handleSubmit = async (data: any) => {
    if (!user) return false;
    
    setFormSubmitting(true);
    try {
      const cleanData = { ...data, room: data.room.trim(), reporter: data.reporter.trim(), phone: data.phone.trim(), description: data.description.trim() };
      
      const newIssue = { 
        id: `REQ-${Math.floor(Math.random() * 9000) + 1000}`, 
        ...cleanData, 
        status: 'pending', 
        timestamp: new Date()
      };
      
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues'), newIssue);
      await sendLineMessage(newIssue);
      
      setFormSubmitting(false);
      return true;
    } catch (error) { 
      fireAlert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งข้อมูลได้', 'error'); 
      setFormSubmitting(false); 
      return false; 
    }
  };

  const handleStatusChange = async (docId: string | undefined, newStatus: Status) => {
    if (!docId) return;
    try { 
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', docId), { status: newStatus });
      if (newStatus === 'completed') {
        const issue = issues.find(i => i.docId === docId);
        if (issue && issue.imagePath) {
          const imageRef = ref(storage, issue.imagePath);
          await deleteObject(imageRef).catch(() => console.log("Image already deleted or not found"));
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', docId), { imageUrl: null, imagePath: null });
        }
      }
    } catch (error) { console.error(error); }
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
      } 
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

  const handleFeedbackSubmit = async (data: any) => {
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks'), {
        ...data,
        timestamp: new Date()
      });
      setShowFeedbackModal(false);
      fireAlert('ขอบคุณ', 'ขอบคุณสำหรับการประเมินครับ', 'success');
    } catch (e) {
      fireAlert('ผิดพลาด', 'ไม่สามารถส่งแบบประเมินได้', 'error');
    }
  };

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

  const handleStaffClick = () => {
    if (user && !user.isAnonymous && user.email && ALLOWED_ADMIN_EMAILS.includes(user.email)) {
      setRole('staff');
    } else {
      setRole('login_admin');
    }
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
    const sortedDaily = fmt(stats.daily).slice(0, 7); 
    return { daily: sortedDaily, monthly: fmt(stats.monthly), yearly: fmt(stats.yearly), byCategory: fmt(stats.byCategory), byReporter: fmt(stats.byReporter) };
  }, [issues]);

  // Feedback Stats Logic
  const feedbackStats = useMemo(() => {
    if (feedbacks.length === 0) return null;
    const total = feedbacks.length;
    const avg = (key: keyof Feedback) => (feedbacks.reduce((acc, curr) => acc + (curr[key] as number || 0), 0) / total).toFixed(2);
    
    return [
      { label: '4.1 ใช้งานง่าย', value: parseFloat(avg('r_sys_easy')) },
      { label: '4.2 ข้อมูลครบ', value: parseFloat(avg('r_sys_complete')) },
      { label: '4.3 ระบบเร็ว', value: parseFloat(avg('r_sys_speed')) },
      { label: '5.1 ติดต่อกลับเร็ว', value: parseFloat(avg('r_svc_contact')) },
      { label: '5.2 เข้าซ่อมเร็ว', value: parseFloat(avg('r_svc_start')) },
      { label: '5.3 ทักษะช่าง', value: parseFloat(avg('r_svc_skill')) },
      { label: '5.4 ความสุภาพ', value: parseFloat(avg('r_svc_polite')) },
      { label: '5.5 ผลลัพธ์', value: parseFloat(avg('r_svc_result')) },
      { label: '5.6 ภาพรวม', value: parseFloat(avg('r_svc_overall')) },
    ];
  }, [feedbacks]);

  if (loadingAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-[#66FF00]" /></div>;

  return (
    <>
      <SweetAlert show={alertConfig.show} title={alertConfig.title} text={alertConfig.text} icon={alertConfig.icon} onConfirm={alertConfig.onConfirm} onCancel={alertConfig.onCancel} showCancel={alertConfig.showCancel} />
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} onSubmit={handleFeedbackSubmit} />

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

      {role === 'login_admin' && <LoginScreen onGoogleLogin={handleGoogleLogin} onBack={() => setRole('guest')} isLoggingIn={isLoggingIn} />}
      {role === 'guest' && <LandingScreen onReporterClick={() => setRole('reporter')} onAdminClick={handleStaffClick} onFeedbackClick={() => setShowFeedbackModal(true)} />}
      {role === 'reporter' && <ReporterScreen rooms={rooms} onSubmit={handleSubmit} onLogout={handleLogout} formSubmitting={formSubmitting} fireAlert={fireAlert} />}
      
      {role === 'staff' && (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col md:flex-row">
          <div className="md:hidden bg-white p-4 border-b flex justify-between items-center sticky top-0 z-40 shadow-sm">
             <div className="flex items-center gap-2 text-black font-bold text-lg">
                {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" /> : <div className="bg-[#66FF00] p-1.5 rounded text-black"><Monitor size={20} /></div>}
                {user?.displayName || 'Admin'}
             </div>
             <button onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
          </div>

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
                   <button onClick={() => { setAdminTab('feedbacks'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'feedbacks' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><ClipboardCheck size={20} /> ผลการประเมิน</button>
                </nav>
                <div className="p-4 border-t"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-600 transition text-sm"><LogOut size={16} /> ออกจากระบบ</button></div>
             </div>
          </aside>
          {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
          
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
             {/* --- ✅ Feedback Tab --- */}
             {adminTab === 'feedbacks' && (
                <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ClipboardCheck /> ผลประเมินความพึงพอใจ</h1>
                    <button onClick={handleExportFeedbackCSV} className="flex items-center gap-2 bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold px-4 py-2 rounded-lg transition"><Download size={16} /> ดาวน์โหลด (CSV)</button>
                  </div>

                  {/* ข้อเสนอแนะ */}
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
             )}
          </main>
        </div>
      )}
    </>
  );
}