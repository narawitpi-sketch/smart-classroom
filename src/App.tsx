import React, { useState, useEffect, useMemo } from 'react';
import { 
  Monitor, 
  Wifi, 
  Speaker, 
  Thermometer, 
  AlertCircle,
  Wrench,
  User as UserIcon,
  LogOut,
  Shield,
  CheckCircle,
  ArrowRight,
  Clock,
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
  Download,
  Calendar,
  Menu,
  Star,
  Heart,
  Briefcase,
  Smile
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
  deleteDoc,
  doc, 
  onSnapshot
} from 'firebase/firestore';

// ==========================================
// 1. CONFIGURATION & UTILS
// ==========================================

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
const ALLOWED_ADMIN_EMAILS = ['narawit.pi@nsru.ac.th'];
const LINE_CHANNEL_ACCESS_TOKEN = "GA3r5ViM4lH1TYGzllT9XKErXn2MlxUKBq8F9c4R/SIeAqHMrKKaGwopC9dcv1vNdcb2/g9383YGFjvMUW72bqHVaqjYUpHPbAYHv+a8glAc4wWda5c0dQyP+IjS4TAHSvVt0EW3v/IdSX4xfknHNAdB04t89/1O/w1cDnyilFU="; 
const LINE_GROUP_ID = "C8d92d6c426766edb968dabcb780d4c39"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Types
type Role = 'guest' | 'reporter' | 'staff' | 'login_admin'; 
type Status = 'pending' | 'in-progress' | 'completed';
type Urgency = 'low' | 'medium' | 'high';
type ReporterType = 'lecturer' | 'student' | 'other';
type AdminTab = 'dashboard' | 'issues' | 'rooms';

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

const CATEGORIES = [
  { id: 'Visual', icon: Monitor, label: 'ภาพ/โปรเจคเตอร์' },
  { id: 'Audio', icon: Speaker, label: 'เสียง/ไมโครโฟน' },
  { id: 'Network', icon: Wifi, label: 'อินเทอร์เน็ต/Wi-Fi' },
  { id: 'Environment', icon: Thermometer, label: 'แอร์/ไฟ/ความสะอาด' },
  { id: 'Other', icon: AlertCircle, label: 'อื่นๆ' },
];

// Helper Functions
const getReporterLabel = (type: ReporterType) => type === 'lecturer' ? 'อาจารย์' : type === 'student' ? 'นักศึกษา' : 'อื่น ๆ';
const formatDate = (timestamp: any) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

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

// ==========================================
// 2. SHARED COMPONENTS
// ==========================================

const SweetAlert = ({ show, title, text, icon, onConfirm, onCancel, showCancel }: any) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all scale-100">
        <div className="flex justify-center mb-5">
          {icon === 'success' && <div className="w-20 h-20 rounded-full border-4 border-green-200 flex items-center justify-center bg-green-50"><CheckCircle className="w-10 h-10 text-green-500" /></div>}
          {icon === 'error' && <div className="w-20 h-20 rounded-full border-4 border-red-200 flex items-center justify-center bg-red-50"><X className="w-10 h-10 text-red-500" /></div>}
          {icon === 'warning' && <div className="w-20 h-20 rounded-full border-4 border-orange-200 flex items-center justify-center bg-orange-50"><AlertCircle className="w-10 h-10 text-orange-500" /></div>}
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{text}</p>
        <div className="flex gap-2">
          {showCancel && <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">ยกเลิก</button>}
          <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl font-bold text-lg text-white shadow-lg hover:opacity-90 transition ${icon === 'success' ? 'bg-green-500' : icon === 'error' ? 'bg-red-500' : 'bg-[#66FF00] text-black'}`}>ตกลง</button>
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

const SimpleBarChart = ({ data, title, color = "bg-blue-500" }: { data: { label: string, value: number }[], title: string, color?: string }) => {
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

const FeedbackModal = ({ isOpen, onClose, onSubmit }: any) => {
  const [data, setData] = useState({ gender: '', status: '', age: '', ratingSystem: 0, ratingService: 0 });

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!data.gender || !data.status || !data.age || data.ratingSystem === 0 || data.ratingService === 0) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    onSubmit(data);
  };

  const StarRating = ({ value, onChange, label }: any) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => onChange(star)} className={`transition-transform hover:scale-110 ${value >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}>
            <Star size={32} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#66FF00] p-4 flex justify-between items-center text-black shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2"><Smile size={24}/> ประเมินความพึงพอใจ</h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6"><h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><UserIcon size={18}/> 1. เพศ</h4><div className="grid grid-cols-2 gap-3">{['ชาย', 'หญิง'].map(g => (<button key={g} onClick={() => setData({...data, gender: g})} className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition ${data.gender === g ? 'border-[#66FF00] bg-[#66FF00]/10 text-green-800 font-bold' : 'border-gray-100 hover:bg-gray-50'}`}>{g === 'ชาย' ? <UserIcon size={20}/> : <Heart size={20}/>} {g}</button>))}</div></div>
          <div className="mb-6"><h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Briefcase size={18}/> 2. สถานะ</h4><div className="grid grid-cols-3 gap-3">{[{ label: 'อาจารย์', icon: Briefcase }, { label: 'นักศึกษา', icon: GraduationCap }, { label: 'อื่นๆ', icon: UserIcon }].map(s => (<button key={s.label} onClick={() => setData({...data, status: s.label})} className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition text-sm ${data.status === s.label ? 'border-[#66FF00] bg-[#66FF00]/10 text-green-800 font-bold' : 'border-gray-100 hover:bg-gray-50'}`}><s.icon size={20}/> {s.label}</button>))}</div></div>
          <div className="mb-6"><h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Clock size={18}/> 3. ช่วงอายุ</h4><div className="flex flex-wrap gap-2">{['18-25 ปี', '26-35 ปี', '36-45 ปี', '46-55 ปี', '> 55 ปี'].map(a => (<button key={a} onClick={() => setData({...data, age: a})} className={`px-4 py-2 rounded-full border text-sm transition ${data.age === a ? 'bg-black text-[#66FF00] border-black' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{a}</button>))}</div></div>
          <hr className="my-6 border-dashed border-gray-200"/>
          <div className="text-center"><StarRating label="4.1 ความพึงพอใจต่อระบบแจ้งซ่อม" value={data.ratingSystem} onChange={(v: number) => setData({...data, ratingSystem: v})} /><StarRating label="4.2 ความพึงพอใจต่อการให้บริการ" value={data.ratingService} onChange={(v: number) => setData({...data, ratingService: v})} /></div>
          <button onClick={handleSubmit} className="w-full mt-6 bg-[#66FF00] text-black font-bold py-4 rounded-2xl shadow-lg hover:bg-[#5ce600] transition transform active:scale-95">ส่งแบบประเมิน</button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. SUB-VIEWS
// ==========================================

const LoginScreen = ({ onGoogleLogin, onBack, isLoggingIn }: any) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-t-8 border-[#66FF00]">
      <div className="bg-[#66FF00] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-black"><Lock size={32} /></div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">เข้าสู่ระบบเจ้าหน้าที่</h2>
      <button onClick={onGoogleLogin} disabled={isLoggingIn} className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 hover:border-[#66FF00] transition flex justify-center items-center gap-3 mt-4">
        {isLoggingIn ? <Loader2 className="animate-spin text-[#66FF00]" /> : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            Login with Google
          </>
        )}
      </button>
      <button onClick={onBack} className="w-full mt-4 text-gray-500 py-2 hover:text-black text-sm">ย้อนกลับ</button>
    </div>
  </div>
);

const LandingScreen = ({ onReporterClick, onAdminClick, onFeedbackClick }: any) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-4 relative">
    <div className="max-w-4xl w-full text-center z-10">
      <div className="bg-[#66FF00] w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6 text-black"><Monitor size={48} /></div>
      <h1 className="text-4xl font-black text-gray-900 mb-3 font-sans tracking-tight">Smart Classroom Support</h1>
      <p className="text-gray-600 text-lg mb-12">ระบบแจ้งปัญหาและบริหารจัดการห้องเรียนอัจฉริยะ (ม.ใน)</p>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto text-left mb-12">
        <button onClick={onReporterClick} className="bg-white p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-all group border-b-4 border-gray-200 hover:border-[#66FF00]">
          <div className="bg-[#e6ffcc] w-16 h-16 rounded-2xl flex items-center justify-center text-green-700 mb-6 group-hover:scale-110 transition-transform"><UserIcon size={36} /></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">แจ้งปัญหาห้องเรียน</h2>
          <div className="flex items-center text-green-600 font-bold group-hover:translate-x-2 transition-transform">เข้าสู่ระบบผู้แจ้ง <ArrowRight size={20} className="ml-2" /></div>
        </button>
        <button onClick={onAdminClick} className="bg-black p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-all group border-b-4 border-gray-800 hover:border-[#66FF00]">
          <div className="bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center text-[#66FF00] mb-6 group-hover:scale-110 transition-transform"><Shield size={36} /></div>
          <h2 className="text-2xl font-bold text-white mb-2">เจ้าหน้าที่ดูแลระบบ</h2>
          <div className="flex items-center text-[#66FF00] font-bold group-hover:translate-x-2 transition-transform">เข้าสู่ระบบเจ้าหน้าที่ <ArrowRight size={20} className="ml-2" /></div>
        </button>
      </div>

      <button onClick={onFeedbackClick} className="inline-flex items-center gap-2 text-gray-500 hover:text-black bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md transition">
         <Smile size={20} className="text-[#66FF00] fill-current" /> ประเมินความพึงพอใจการใช้งาน
      </button>
    </div>
  </div>
);

const ReporterScreen = ({ rooms, formData, setFormData, onSubmit, onLogout, formSubmitting }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, room: e.target.value });
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.value === '' || /^[a-zA-Z\u0E00-\u0E7F\s]+$/.test(e.target.value)) setFormData({ ...formData, reporter: e.target.value }); };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => { if ((e.target.value === '' || /^[0-9]+$/.test(e.target.value)) && e.target.value.length <= 10) setFormData({ ...formData, phone: e.target.value }); };

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit();
    if (success) {
      setShowForm(false);
      setShowSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full p-6 flex justify-between items-center shrink-0 bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-xl"><div className="bg-[#66FF00] p-1.5 rounded text-black"><Monitor size={20} /></div>SmartClass</div>
        <button onClick={onLogout} className="text-gray-500 hover:text-red-600 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition"><LogOut size={18} /> ออกจากระบบ</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-start p-4 w-full overflow-y-auto">
        <div className="max-w-lg w-full space-y-6 text-center pt-6 pb-20">
          {showSuccess ? (
            <div className="bg-white rounded-2xl p-12 shadow-xl animate-fade-in-up border-t-4 border-[#66FF00]">
              <div className="w-24 h-24 bg-[#e6ffcc] text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={48} /></div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">แจ้งปัญหาสำเร็จ!</h2>
              <p className="text-gray-600 mb-8">ขอบคุณที่แจ้งปัญหาเข้ามา เจ้าหน้าที่จะรีบดำเนินการตรวจสอบโดยเร็วที่สุด</p>
              <button onClick={() => setShowSuccess(false)} className="bg-black text-[#66FF00] font-bold px-8 py-3 rounded-xl hover:bg-gray-800 transition">กลับหน้าหลัก</button>
            </div>
          ) : !showForm ? (
            <div className="space-y-8 animate-fade-in-up">
              <div><h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">พบปัญหาการใช้งานห้องเรียน?</h1><p className="text-gray-600 text-lg">แจ้งปัญหาได้ทันที</p></div>
              <button onClick={() => setShowForm(true)} className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black text-xl font-bold p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-4 group">
                <div className="bg-black/10 p-4 rounded-full group-hover:scale-110 transition-transform"><Wrench size={40} /></div>แจ้งปัญหาใหม่
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up text-left border-t-4 border-[#66FF00]">
              <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center"><h3 className="font-bold text-lg text-gray-800">แบบฟอร์มแจ้งปัญหา</h3><button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button></div>
              <form onSubmit={handleLocalSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ห้องเรียน</label>
                    <select required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none bg-white" value={formData.room} onChange={handleRoomChange}>
                      <option value="">-- เลือกห้อง --</option>
                      {rooms.map((r: Room) => <option key={r.id} value={r.name}>{r.name}</option>)}
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
                    {CATEGORIES.map((cat) => (
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
                <div className="pt-2"><button type="submit" disabled={formSubmitting} className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black py-3 rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2">{formSubmitting ? <Loader2 className="animate-spin" /> : 'ยืนยันการแจ้ง'}</button></div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. MAIN APP COMPONENT
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

  // Form State
  const [formData, setFormData] = useState({
    room: '', category: 'Visual', description: '', reporter: '', reporterType: 'lecturer' as ReporterType, phone: '', urgency: 'medium' as Urgency,
  });

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
    const initAuth = async () => { if (!auth.currentUser) await signInAnonymously(auth).catch(console.error); };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        if (!u.isAnonymous && u.email && ALLOWED_ADMIN_EMAILS.includes(u.email)) { setRole('staff'); }
        setLoadingAuth(false);
      } else { await signInAnonymously(auth); }
    });
    return () => unsubscribe();
  }, []);

  // Data Fetching Effect
  useEffect(() => {
    if (!user) return;
    if (role === 'guest') return;

    const qIssues = collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues');
    const unsubIssues = onSnapshot(qIssues, (snapshot) => {
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
    return () => { unsubIssues(); unsubRooms(); };
  }, [user, role]);

  // Actions
  const handleLogout = async () => {
    try { await signOut(auth); await signInAnonymously(auth); setRole('guest'); setIsSidebarOpen(false); } 
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

  const handleSubmit = async () => {
    if (!user) return false;
    if (formData.phone.length !== 10) { fireAlert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก', 'warning'); return false; }
    if (!formData.room) { fireAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาเลือกห้องเรียน', 'warning'); return false; }

    setFormSubmitting(true);
    try {
      const cleanData = { ...formData, room: formData.room.trim(), reporter: formData.reporter.trim(), phone: formData.phone.trim(), description: formData.description.trim() };
      const newIssue = { id: `REQ-${Math.floor(Math.random() * 9000) + 1000}`, ...cleanData, status: 'pending', timestamp: new Date() };
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues'), newIssue);
      await sendLineMessage(newIssue);
      setFormSubmitting(false);
      setFormData({ room: '', category: 'Visual', description: '', reporter: '', reporterType: 'lecturer', phone: '', urgency: 'medium' });
      return true;
    } catch (error) { fireAlert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งข้อมูลได้', 'error'); setFormSubmitting(false); return false; }
  };

  // Admin Actions
  const handleStatusChange = async (docId: string | undefined, newStatus: Status) => {
    if (!docId) return;
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
      {role === 'reporter' && <ReporterScreen rooms={rooms} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onLogout={handleLogout} formSubmitting={formSubmitting} />}
      
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
      )}
    </>
  );
}