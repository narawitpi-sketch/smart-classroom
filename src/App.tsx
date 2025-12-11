import React, { useState, useEffect, useMemo } from 'react';
import { 
  Monitor, 
  Wifi, 
  Speaker, 
  Thermometer, 
  AlertCircle,
  Search,
  Filter,
  Wrench,
  User as UserIcon,
  LogOut,
  Shield,
  CheckCircle,
  ArrowRight,
  Clock,
  Menu,
  Loader2,
  Lock,
  Phone,
  GraduationCap,
  X,
  Trash2,
  Plus,
  BarChart3,
  LayoutGrid,
  FileText,
  Calendar
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  type User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, // เพิ่มฟังก์ชันลบ
  doc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCnH3miqz56mxvW7w2LUG_rUafmvxTXUFU",
  authDomain: "smart-classroom-app-80865.firebaseapp.com",
  projectId: "smart-classroom-app-80865",
  storageBucket: "smart-classroom-app-80865.firebasestorage.app",
  messagingSenderId: "1097518299832",
  appId: "1:1097518299832:web:bba6ef0f41d8fe2427924d",
  measurementId: "G-28RFQGB82Y"
};

const APP_ID = 'smart-classroom';

const ALLOWED_ADMIN_EMAILS = [
  'narawit.pi@nsru.ac.th',
];

// --- 🔵 ตั้งค่า LINE Messaging API ---
const LINE_CHANNEL_ACCESS_TOKEN = "GA3r5ViM4lH1TYGzllT9XKErXn2MlxUKBq8F9c4R/SIeAqHMrKKaGwopC9dcv1vNdcb2/g9383YGFjvMUW72bqHVaqjYUpHPbAYHv+a8glAc4wWda5c0dQyP+IjS4TAHSvVt0EW3v/IdSX4xfknHNAdB04t89/1O/w1cDnyilFU="; 
const LINE_GROUP_ID = "C8d92d6c426766edb968dabcb780d4c39"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Types ---
type Role = 'guest' | 'reporter' | 'staff' | 'login_admin'; 
type Status = 'pending' | 'in-progress' | 'completed';
type Urgency = 'low' | 'medium' | 'high';
type ReporterType = 'lecturer' | 'student' | 'other';
type AdminTab = 'dashboard' | 'issues' | 'rooms'; // เพิ่ม Tab ในหน้า Admin

interface Issue {
  id: string;
  room: string;
  category: string;
  description: string;
  reporter: string;
  reporterType: ReporterType;
  phone: string;
  urgency: Urgency;
  status: Status;
  timestamp: any;
  docId?: string;
}

interface Room {
  id: string;
  name: string;
}

// --- ✨ Custom Components ---

const SweetAlert = ({ show, title, text, icon, onConfirm, onCancel, showCancel }: any) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all scale-100">
        <div className="flex justify-center mb-5">
          {icon === 'success' && <div className="w-20 h-20 rounded-full border-4 border-green-200 flex items-center justify-center bg-green-50"><CheckCircle className="w-10 h-10 text-green-500" /></div>}
          {icon === 'error' && <div className="w-20 h-20 rounded-full border-4 border-red-200 flex items-center justify-center bg-red-50"><X className="w-10 h-10 text-red-500" /></div>}
          {icon === 'warning' && <div className="w-20 h-20 rounded-full border-4 border-orange-200 flex items-center justify-center bg-orange-50"><AlertCircle className="w-10 h-10 text-orange-500" /></div>}
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{text}</p>
        <div className="flex gap-2">
          {showCancel && (
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">ยกเลิก</button>
          )}
          <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl font-bold text-lg text-white shadow-lg hover:opacity-90 transition ${icon === 'success' ? 'bg-green-500' : icon === 'error' ? 'bg-red-500' : 'bg-[#66FF00] text-black'}`}>
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: Status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'in-progress': 'bg-[#66FF00]/20 text-green-900 border-[#66FF00]',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  const labels = { pending: 'รอตรวจสอบ', 'in-progress': 'กำลังแก้ไข', completed: 'แก้ไขแล้ว' };
  const icons = { pending: <Clock size={14} className="mr-1" />, 'in-progress': <Wrench size={14} className="mr-1" />, completed: <CheckCircle size={14} className="mr-1" /> };
  return <span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>{icons[status]}{labels[status]}</span>;
};

// --- Simple Bar Chart Component ---
const SimpleBarChart = ({ data, title, color = "bg-blue-500" }: { data: { label: string, value: number }[], title: string, color?: string }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <BarChart3 size={20} className="text-gray-400" /> {title}
      </h3>
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 text-sm">
            <div className="w-24 text-gray-500 truncate text-right">{item.label}</div>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${color}`} 
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              ></div>
            </div>
            <div className="w-8 text-right font-bold text-gray-700">{item.value}</div>
          </div>
        ))}
        {data.length === 0 && <div className="text-center text-gray-400 py-4">ไม่มีข้อมูล</div>}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- Alert State ---
  const [alertConfig, setAlertConfig] = useState<any>({ show: false, title: '', text: '', icon: 'success', onConfirm: () => {}, showCancel: false });
  const fireAlert = (title: string, text: string, icon: 'success' | 'error' | 'warning', onConfirm?: () => void, showCancel = false) => {
    setAlertConfig({
      show: true, title, text, icon, showCancel,
      onConfirm: () => { setAlertConfig((prev: any) => ({ ...prev, show: false })); if (onConfirm) onConfirm(); },
      onCancel: () => setAlertConfig((prev: any) => ({ ...prev, show: false }))
    });
  };

  useEffect(() => {
    const initAuth = async () => { if (!auth.currentUser) await signInAnonymously(auth).catch(console.error); };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoadingAuth(false); });
    return () => unsubscribe();
  }, []);

  const [role, setRole] = useState<Role>('guest');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]); // State สำหรับเก็บห้อง
  const [loadingData, setLoadingData] = useState(false);
  
  // Admin UI State
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterReporterType, setFilterReporterType] = useState<string>('all');
  const [newRoomName, setNewRoomName] = useState('');

  // User UI State
  const [showForm, setShowForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    room: '',
    category: 'Visual',
    description: '',
    reporter: '',
    reporterType: 'lecturer' as ReporterType,
    phone: '',
    urgency: 'medium' as Urgency,
  });

  // --- Data Fetching ---
  useEffect(() => {
    if (!user) return;
    if (role === 'guest') return;

    setLoadingData(true);
    
    // 1. Fetch Issues
    const qIssues = collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues');
    const unsubIssues = onSnapshot(qIssues, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })) as Issue[];
      fetched.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setIssues(fetched);
      setLoadingData(false);
    });

    // 2. Fetch Rooms
    const qRooms = collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms');
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      // Sort ห้องตามชื่อ (ถ้าเป็นเลขก็จะเรียงเลข)
      fetchedRooms.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setRooms(fetchedRooms);
    });

    return () => { unsubIssues(); unsubRooms(); };
  }, [user, role]);

  // --- Handlers ---
  const handleRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* Deprecated logic for text input */ };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if ((value === '' || /^[0-9]+$/.test(value)) && value.length <= 10) setFormData({ ...formData, phone: value });
  };
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[a-zA-Z\u0E00-\u0E7F\s]+$/.test(value)) setFormData({ ...formData, reporter: value });
  };

  const handleDeleteIssue = async (docId: string) => {
    fireAlert('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ที่จะลบรายการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้', 'warning', async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', docId));
      } catch (error) { console.error(error); fireAlert('ลบไม่สำเร็จ', 'เกิดข้อผิดพลาด', 'error'); }
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
      try {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'rooms', roomId));
      } catch (error) { fireAlert('ผิดพลาด', 'ลบห้องไม่สำเร็จ', 'error'); }
    }, true);
  };

  // --- Stats Calculation Logic ---
  const statsData = useMemo(() => {
    const now = new Date();
    const stats = {
      daily: {} as Record<string, number>,
      monthly: {} as Record<string, number>,
      yearly: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byReporter: {} as Record<string, number>,
    };

    issues.forEach(issue => {
      if (!issue.timestamp) return;
      const date = new Date(issue.timestamp.seconds * 1000);
      const dayKey = date.toLocaleDateString('th-TH');
      const monthKey = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      const yearKey = date.getFullYear().toString();

      stats.daily[dayKey] = (stats.daily[dayKey] || 0) + 1;
      stats.monthly[monthKey] = (stats.monthly[monthKey] || 0) + 1;
      stats.yearly[yearKey] = (stats.yearly[yearKey] || 0) + 1;
      stats.byCategory[issue.category] = (stats.byCategory[issue.category] || 0) + 1;
      
      const reporterLabel = issue.reporterType === 'student' ? 'นักศึกษา' : issue.reporterType === 'lecturer' ? 'อาจารย์' : 'อื่นๆ';
      stats.byReporter[reporterLabel] = (stats.byReporter[reporterLabel] || 0) + 1;
    });

    // Convert to array format for chart component
    const formatForChart = (obj: Record<string, number>) => Object.entries(obj).map(([label, value]) => ({ label, value }));

    return {
      daily: formatForChart(stats.daily).slice(0, 7), // Last 7 days (or entries)
      monthly: formatForChart(stats.monthly),
      yearly: formatForChart(stats.yearly),
      byCategory: formatForChart(stats.byCategory),
      byReporter: formatForChart(stats.byReporter),
    };
  }, [issues]);

  // ... (ส่วน Login handlers และ LINE Notify เหมือนเดิม ขอละไว้เพื่อความกระชับ แต่ในไฟล์จริงต้องมี) ...
  const getReporterLabel = (type: ReporterType) => type === 'lecturer' ? 'อาจารย์' : type === 'student' ? 'นักศึกษา' : 'อื่น ๆ';
  
  const sendLineMessage = async (issueData: any) => {
    if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_GROUP_ID || LINE_CHANNEL_ACCESS_TOKEN.includes("ใส่_")) return;
    const messageText = `🚨 *แจ้งซ่อมห้องเรียนใหม่* (${issueData.id})\n--------------------\n📍 *ห้อง:* ${issueData.room}\n👤 *ผู้แจ้ง:* ${issueData.reporter} (${getReporterLabel(issueData.reporterType)})\n📞 *เบอร์:* ${issueData.phone}\n⚠️ *ความเร่งด่วน:* ${issueData.urgency === 'high' ? '🔴 ด่วนมาก' : issueData.urgency === 'medium' ? '🟠 ปานกลาง' : '🟢 ทั่วไป'}\n🛠 *ปัญหา:* ${issueData.category}\n📝 *รายละเอียด:* ${issueData.description}\n--------------------\nตรวจสอบ: https://smart-classroom-neon.vercel.app/`;
    try {
      await fetch('https://corsproxy.io/?' + encodeURIComponent('https://api.line.me/v2/bot/message/push'), {
        method: 'POST', headers: { 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: LINE_GROUP_ID, messages: [{ type: "text", text: messageText.trim() }] }),
      });
    } catch (error) { console.error("Line Error", error); }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      if (result.user.email && ALLOWED_ADMIN_EMAILS.includes(result.user.email)) { setRole('staff'); } 
      else { await signOut(auth); fireAlert('เข้าสู่ระบบไม่สำเร็จ', 'อีเมลนี้ไม่มีสิทธิ์', 'error'); await signInAnonymously(auth); }
    } catch (error: any) { if (error.code !== 'auth/popup-closed-by-user') fireAlert('เกิดข้อผิดพลาด', error.message, 'error'); }
    finally { setIsLoggingIn(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (formData.phone.length !== 10) { fireAlert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก', 'warning'); return; }
    if (!formData.room) { fireAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาเลือกห้องเรียน', 'warning'); return; }

    setFormSubmitting(true);
    const cleanData = { ...formData, room: formData.room.trim(), reporter: formData.reporter.trim(), phone: formData.phone.trim(), description: formData.description.trim() };
    try {
      const newIssue = { id: `REQ-${Math.floor(Math.random() * 9000) + 1000}`, ...cleanData, status: 'pending', timestamp: new Date() };
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues'), newIssue);
      await sendLineMessage(newIssue);
      fireAlert('แจ้งปัญหาสำเร็จ!', 'ขอบคุณที่แจ้งปัญหาเข้ามา', 'success', () => { setShowForm(false); setFormData({ room: '', category: 'Visual', description: '', reporter: '', reporterType: 'lecturer', phone: '', urgency: 'medium' }); });
    } catch (error) { fireAlert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งข้อมูลได้', 'error'); } finally { setFormSubmitting(false); }
  };

  const handleStatusChange = async (docId: string | undefined, newStatus: Status) => {
    if (!docId) return;
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', docId), { status: newStatus }); } catch (error) { console.error(error); }
  };

  const formatDate = (timestamp: any) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  if (loadingAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-[#66FF00]" /></div>;

  // --- RENDER ---
  return (
    <>
      <SweetAlert show={alertConfig.show} title={alertConfig.title} text={alertConfig.text} icon={alertConfig.icon} onConfirm={alertConfig.onConfirm} onCancel={alertConfig.onCancel} showCancel={alertConfig.showCancel} />

      {/* --- View: Login Admin --- */}
      {role === 'login_admin' && (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-t-8 border-[#66FF00]">
            <div className="bg-[#66FF00] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-black"><Lock size={32} /></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">เข้าสู่ระบบเจ้าหน้าที่</h2>
            <button onClick={handleGoogleLogin} disabled={isLoggingIn} className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 hover:border-[#66FF00] transition flex justify-center items-center gap-3 mt-4">
              {isLoggingIn ? <Loader2 className="animate-spin text-[#66FF00]" /> : <>Login with Google</>}
            </button>
            <button onClick={() => setRole('guest')} className="w-full mt-4 text-gray-500 py-2 hover:text-black text-sm">ย้อนกลับ</button>
          </div>
        </div>
      )}

      {/* --- View: Guest / Landing --- */}
      {role === 'guest' && (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full text-center">
            <div className="bg-[#66FF00] w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6 text-black"><Monitor size={48} /></div>
            <h1 className="text-4xl font-black text-gray-900 mb-3 font-sans tracking-tight">Smart Classroom Support</h1>
            <p className="text-gray-600 text-lg mb-12">ระบบแจ้งปัญหาและบริหารจัดการห้องเรียนอัจฉริยะ (ม.ใน)</p>
            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto text-left">
              <button onClick={() => setRole('reporter')} className="bg-white p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-all group border-b-4 border-gray-200 hover:border-[#66FF00]">
                <div className="bg-[#e6ffcc] w-16 h-16 rounded-2xl flex items-center justify-center text-green-700 mb-6 group-hover:scale-110 transition-transform"><UserIcon size={36} /></div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">แจ้งปัญหาห้องเรียน</h2>
                <div className="flex items-center text-green-600 font-bold group-hover:translate-x-2 transition-transform">เข้าสู่ระบบผู้แจ้ง <ArrowRight size={20} className="ml-2" /></div>
              </button>
              <button onClick={() => user && !user.isAnonymous && ALLOWED_ADMIN_EMAILS.includes(user.email || '') ? setRole('staff') : setRole('login_admin')} className="bg-black p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-all group border-b-4 border-gray-800 hover:border-[#66FF00]">
                <div className="bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center text-[#66FF00] mb-6 group-hover:scale-110 transition-transform"><Shield size={36} /></div>
                <h2 className="text-2xl font-bold text-white mb-2">เจ้าหน้าที่ดูแลระบบ</h2>
                <div className="flex items-center text-[#66FF00] font-bold group-hover:translate-x-2 transition-transform">เข้าสู่ระบบเจ้าหน้าที่ <ArrowRight size={20} className="ml-2" /></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- View: Reporter Form --- */}
      {role === 'reporter' && (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <div className="w-full p-6 flex justify-between items-center shrink-0 bg-white border-b shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-xl"><div className="bg-[#66FF00] p-1.5 rounded text-black"><Monitor size={20} /></div>SmartClass</div>
            <button onClick={() => setRole('guest')} className="text-gray-500 hover:text-red-600 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition"><LogOut size={18} /> ออกจากระบบ</button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-start p-4 w-full overflow-y-auto">
            <div className="max-w-lg w-full space-y-6 text-center pt-6 pb-20">
              {!showForm ? (
                <div className="space-y-8 animate-fade-in-up">
                  <div><h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">พบปัญหาการใช้งานห้องเรียน?</h1><p className="text-gray-600 text-lg">แจ้งปัญหาได้ทันที</p></div>
                  <button onClick={() => setShowForm(true)} className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black text-xl font-bold p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-4 group">
                    <div className="bg-black/10 p-4 rounded-full group-hover:scale-110 transition-transform"><Wrench size={40} /></div>แจ้งปัญหาใหม่
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up text-left border-t-4 border-[#66FF00]">
                  <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center"><h3 className="font-bold text-lg text-gray-800">แบบฟอร์มแจ้งปัญหา</h3><button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button></div>
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ห้องเรียน</label>
                        {/* --- เปลี่ยนจาก Input เป็น Select --- */}
                        <select 
                          required 
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none bg-white"
                          value={formData.room}
                          onChange={e => setFormData({...formData, room: e.target.value})}
                        >
                          <option value="">-- เลือกห้อง --</option>
                          {rooms.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ผู้แจ้ง</label>
                        <input required type="text" placeholder="ชื่อ-สกุล" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none" value={formData.reporter} onChange={handleNameChange} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">สถานะผู้แจ้ง</label>
                          <div className="relative">
                            <select className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#66FF00] appearance-none" value={formData.reporterType} onChange={e => setFormData({...formData, reporterType: e.target.value as ReporterType})}>
                              <option value="lecturer">อาจารย์</option><option value="student">นักศึกษา</option><option value="other">อื่น ๆ</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500"><GraduationCap size={16} /></div>
                          </div>
                       </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
                        <input required type="tel" maxLength={10} placeholder="0xx-xxx-xxxx" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none" value={formData.phone} onChange={handlePhoneChange} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทปัญหา</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ id: 'Visual', icon: Monitor, label: 'ภาพ' }, { id: 'Audio', icon: Speaker, label: 'เสียง' }, { id: 'Network', icon: Wifi, label: 'เน็ต' }, { id: 'Environment', icon: Thermometer, label: 'แอร์/ไฟ' }, { id: 'Other', icon: AlertCircle, label: 'อื่นๆ' }].map((cat) => (
                          <button key={cat.id} type="button" onClick={() => setFormData({...formData, category: cat.id})} className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs gap-1 transition-all ${formData.category === cat.id ? 'bg-[#66FF00]/10 border-[#66FF00] text-green-900 font-semibold' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                            <cat.icon size={20} /> {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                      <textarea required rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ความเร่งด่วน</label>
                      <select className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#66FF00]" value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value as Urgency})}>
                        <option value="low">ทั่วไป</option><option value="medium">ปานกลาง</option><option value="high">ด่วนมาก</option>
                      </select>
                    </div>
                    <div className="pt-2">
                      <button type="submit" disabled={formSubmitting} className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black py-3 rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2">
                        {formSubmitting ? <Loader2 className="animate-spin" /> : 'ยืนยันการแจ้ง'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- View: Staff / Admin Dashboard --- */}
      {role === 'staff' && (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col md:flex-row">
          <aside className="bg-white w-full md:w-64 md:h-screen shadow-lg z-20 flex-shrink-0 flex flex-col">
            <div className="p-6 border-b flex items-center gap-3">
              <div className="bg-[#66FF00] p-2 rounded-lg text-black"><Monitor size={24} /></div>
              <div><span className="font-bold text-xl tracking-tight text-gray-900 block">SmartClass</span><span className="text-xs text-gray-500 font-medium tracking-wide">ADMIN</span></div>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">Menu</div>
              <button onClick={() => setAdminTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'dashboard' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><LayoutGrid size={20} /> ภาพรวม (Dashboard)</button>
              <button onClick={() => setAdminTab('issues')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'issues' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><FileText size={20} /> จัดการการแจ้งซ่อม</button>
              <button onClick={() => setAdminTab('rooms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'rooms' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><Monitor size={20} /> จัดการห้องเรียน</button>
            </nav>
            <div className="p-4 border-t"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-600 transition text-sm"><LogOut size={16} /> ออกจากระบบ</button></div>
          </aside>

          <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
            {/* --- TAB: Dashboard --- */}
            {adminTab === 'dashboard' && (
              <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 /> สรุปสถิติการแจ้งซ่อม</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <SimpleBarChart title="ยอดแจ้งซ่อมรายวัน (7 วันล่าสุด)" data={statsData.daily} color="bg-blue-500" />
                  <SimpleBarChart title="ยอดแจ้งซ่อมรายเดือน" data={statsData.monthly} color="bg-green-500" />
                  <SimpleBarChart title="ยอดแจ้งซ่อมรายปี" data={statsData.yearly} color="bg-purple-500" />
                  <SimpleBarChart title="แยกตามประเภทปัญหา" data={statsData.byCategory} color="bg-orange-500" />
                  <SimpleBarChart title="แยกตามผู้แจ้ง" data={statsData.byReporter} color="bg-pink-500" />
                </div>
              </div>
            )}

            {/* --- TAB: Issues (With Filter & Delete) --- */}
            {adminTab === 'issues' && (
              <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileText /> รายการแจ้งซ่อม</h1>
                  {/* Filters */}
                  <div className="flex gap-2 text-sm">
                    <select className="border rounded-lg px-3 py-2 bg-white" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                      <option value="all">ทุกประเภทปัญหา</option>
                      <option value="Visual">ภาพ/โปรเจคเตอร์</option>
                      <option value="Audio">เสียง</option>
                      <option value="Network">อินเทอร์เน็ต</option>
                    </select>
                    <select className="border rounded-lg px-3 py-2 bg-white" value={filterReporterType} onChange={e => setFilterReporterType(e.target.value)}>
                      <option value="all">ผู้แจ้งทุกคน</option>
                      <option value="lecturer">อาจารย์</option>
                      <option value="student">นักศึกษา</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs">
                        <tr>
                          <th className="px-6 py-3">เวลา/ห้อง</th>
                          <th className="px-6 py-3">ผู้แจ้ง</th>
                          <th className="px-6 py-3">รายละเอียด</th>
                          <th className="px-6 py-3">สถานะ</th>
                          <th className="px-6 py-3 text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {issues.filter(i => (filterCategory === 'all' || i.category === filterCategory) && (filterReporterType === 'all' || i.reporterType === filterReporterType))
                          .map((issue) => (
                          <tr key={issue.docId} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4">
                              <div className="font-mono text-gray-500 text-xs">{formatDate(issue.timestamp)}</div>
                              <div className="font-bold text-indigo-600 text-base">{issue.room}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{issue.reporter}</div>
                              <div className="text-xs text-gray-500">{getReporterLabel(issue.reporterType)}</div>
                              {issue.phone && <div className="text-xs text-gray-400 mt-0.5"><Phone size={10} className="inline mr-1"/>{issue.phone}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 border border-gray-200 mb-1 inline-block">{issue.category}</span>
                              <p className="truncate max-w-xs text-gray-800">{issue.description}</p>
                            </td>
                            <td className="px-6 py-4"><StatusBadge status={issue.status} /></td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex justify-end gap-2">
                                {issue.status === 'pending' && <button onClick={() => handleStatusChange(issue.docId, 'in-progress')} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded tooltip" title="รับงาน"><Wrench size={16} /></button>}
                                {issue.status === 'in-progress' && <button onClick={() => handleStatusChange(issue.docId, 'completed')} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded" title="ปิดงาน"><CheckCircle size={16} /></button>}
                                {/* ปุ่มลบ (ถังขยะ) */}
                                <button onClick={() => handleDeleteIssue(issue.docId!)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded" title="ลบรายการ"><Trash2 size={16} /></button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: Rooms (Manage Rooms) --- */}
            {adminTab === 'rooms' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Monitor /> จัดการรายชื่อห้องเรียน</h1>
                
                {/* Form เพิ่มห้อง */}
                <form onSubmit={handleAddRoom} className="bg-white p-6 rounded-xl shadow-sm border flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อห้อง / เลขห้อง</label>
                    <input 
                      type="text" 
                      placeholder="เช่น 942, 943, Lab คอม 1"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none"
                      value={newRoomName}
                      onChange={e => setNewRoomName(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="bg-[#66FF00] text-black font-bold px-6 py-2.5 rounded-lg hover:opacity-90 flex items-center gap-2">
                    <Plus size={20} /> เพิ่มห้อง
                  </button>
                </form>

                {/* รายชื่อห้อง */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b font-medium text-gray-700">รายชื่อห้องทั้งหมด ({rooms.length})</div>
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {rooms.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">ยังไม่มีข้อมูลห้องเรียน กรุณาเพิ่มห้องใหม่</div>
                    ) : (
                      rooms.map(room => (
                        <div key={room.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                          <span className="font-bold text-gray-800 text-lg">{room.name}</span>
                          <button onClick={() => handleDeleteRoom(room.id, room.name)} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))
                    )}
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