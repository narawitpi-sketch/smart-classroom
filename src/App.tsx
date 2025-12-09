import React, { useState, useEffect } from 'react';
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
  GraduationCap // เพิ่มไอคอนสำหรับแสดงประเภทผู้แจ้ง
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
  doc, 
  onSnapshot
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Types ---
type Role = 'guest' | 'reporter' | 'staff' | 'login_admin'; 
type Status = 'pending' | 'in-progress' | 'completed';
type Urgency = 'low' | 'medium' | 'high';
type ReporterType = 'student' | 'lecturer'; // เพิ่ม Type ใหม่

interface Issue {
  id: string;
  room: string;
  category: string;
  description: string;
  reporter: string;
  reporterType: ReporterType; // เพิ่มฟิลด์ reporterType
  phone: string;
  urgency: Urgency;
  status: Status;
  timestamp: any;
  docId?: string;
}

// --- Components ---
const StatusBadge = ({ status }: { status: Status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'in-progress': 'bg-[#66FF00]/20 text-green-900 border-[#66FF00]',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const labels = {
    pending: 'รอตรวจสอบ',
    'in-progress': 'กำลังแก้ไข',
    completed: 'แก้ไขแล้ว',
  };

  const icons = {
    pending: <Clock size={14} className="mr-1" />,
    'in-progress': <Wrench size={14} className="mr-1" />,
    completed: <CheckCircle size={14} className="mr-1" />,
  };

  return (
    <span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
       if (!auth.currentUser) {
          await signInAnonymously(auth).catch(console.error);
       }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const [role, setRole] = useState<Role>('guest');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    room: '',
    category: 'Visual',
    description: '',
    reporter: '',
    reporterType: 'student' as ReporterType, // ค่าเริ่มต้นเป็นนักศึกษา
    phone: '',
    urgency: 'medium' as Urgency,
  });

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError('');
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email;

      if (userEmail && ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
        setRole('staff'); 
      } else {
        await signOut(auth);
        setLoginError(`อีเมล ${userEmail} ไม่มีสิทธิ์เข้าถึงระบบนี้`);
        await signInAnonymously(auth); 
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('ยกเลิกการเข้าสู่ระบบ');
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError('Domain นี้ยังไม่ได้อนุญาตใน Firebase Console');
      } else {
        setLoginError(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStaffClick = () => {
    if (user && !user.isAnonymous && user.email && ALLOWED_ADMIN_EMAILS.includes(user.email)) {
      setRole('staff');
    } else {
      setRole('login_admin');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await signInAnonymously(auth);
      setRole('guest');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (role === 'guest' && !showSuccess) return;

    setLoadingData(true);
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedIssues: Issue[] = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
      })) as Issue[];
      
      fetchedIssues.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      setIssues(fetchedIssues);
      setLoadingData(false);
    }, (error) => {
      console.error("Error fetching issues:", error);
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, [user, role]);

  const categories = [
    { id: 'Visual', label: 'ภาพ/โปรเจคเตอร์', icon: Monitor },
    { id: 'Audio', label: 'เสียง/ไมโครโฟน', icon: Speaker },
    { id: 'Network', label: 'อินเทอร์เน็ต/Wi-Fi', icon: Wifi },
    { id: 'Environment', label: 'แอร์/ไฟ/ความสะอาด', icon: Thermometer },
    { id: 'Other', label: 'อื่นๆ', icon: AlertCircle },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormSubmitting(true);
    try {
      const newIssue = {
        id: `REQ-${Math.floor(Math.random() * 9000) + 1000}`,
        ...formData,
        status: 'pending',
        timestamp: new Date(),
      };
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues'), newIssue);
      setShowForm(false);
      setFormData({ 
        room: '', 
        category: 'Visual', 
        description: '', 
        reporter: '', 
        reporterType: 'student', 
        phone: '', 
        urgency: 'medium' 
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusChange = async (docId: string | undefined, newStatus: Status) => {
    if (!docId) return;
    try {
      const issueRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'issues', docId);
      await updateDoc(issueRef, { status: newStatus });
    } catch (error) { console.error(error); }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('th-TH', {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-[#66FF00]" />
      </div>
    );
  }

  // --- View: Login Admin ---
  if (role === 'login_admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-t-8 border-[#66FF00]">
          <div className="bg-[#66FF00] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-black">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">เข้าสู่ระบบเจ้าหน้าที่</h2>
          <p className="text-gray-500 mb-8">กรุณายืนยันตัวตนด้วย Google Account <br/>(เฉพาะอีเมลที่ได้รับอนุญาตเท่านั้น)</p>

          <button 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 hover:border-[#66FF00] transition flex justify-center items-center gap-3 disabled:opacity-50"
          >
            {isLoggingIn ? (
              <Loader2 className="animate-spin text-[#66FF00]" />
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                Sign in with Google
              </>
            )}
          </button>

          {loginError && (
            <div className="mt-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg flex items-center gap-2 text-left">
              <AlertCircle size={16} className="shrink-0" /> 
              <span>{loginError}</span>
            </div>
          )}

          <button 
            type="button"
            onClick={() => setRole('guest')}
            className="w-full mt-4 text-gray-500 py-2 hover:text-black text-sm"
          >
            ย้อนกลับ
          </button>
        </div>
      </div>
    );
  }

  // --- View: Guest / Landing ---
  if (role === 'guest') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full text-center">
          <div className="bg-[#66FF00] w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6 text-black">
            <Monitor size={48} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3 font-sans tracking-tight">Smart Classroom Support</h1>
          <p className="text-gray-600 text-lg mb-12">ระบบแจ้งปัญหาและบริหารจัดการห้องเรียนอัจฉริยะ (ม.ใน)</p>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto text-left">
            <button 
              onClick={() => setRole('reporter')}
              className="bg-white p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-all group border-b-4 border-gray-200 hover:border-[#66FF00]"
            >
              <div className="bg-[#e6ffcc] w-16 h-16 rounded-2xl flex items-center justify-center text-green-700 mb-6 group-hover:scale-110 transition-transform">
                <UserIcon size={36} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">แจ้งปัญหาห้องเรียน</h2>
              <p className="text-gray-500 mb-6">สำหรับอาจารย์/นักศึกษา แจ้งเหตุขัดข้อง</p>
              <div className="flex items-center text-green-600 font-bold group-hover:translate-x-2 transition-transform">
                เข้าสู่ระบบผู้แจ้ง <ArrowRight size={20} className="ml-2" />
              </div>
            </button>

            <button 
              onClick={handleStaffClick} 
              className="bg-black p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-all group border-b-4 border-gray-800 hover:border-[#66FF00]"
            >
              <div className="bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center text-[#66FF00] mb-6 group-hover:scale-110 transition-transform">
                <Shield size={36} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">เจ้าหน้าที่ดูแลระบบ</h2>
              <p className="text-gray-400 mb-6">สำหรับ IT Support จัดการงานซ่อม</p>
              <div className="flex items-center text-[#66FF00] font-bold group-hover:translate-x-2 transition-transform">
                เข้าสู่ระบบเจ้าหน้าที่ <ArrowRight size={20} className="ml-2" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- View: Reporter Form (Fix Mobile Layout) ---
  if (role === 'reporter') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="w-full p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-xl">
             <div className="bg-[#66FF00] p-1.5 rounded text-black"><Monitor size={20} /></div>
             SmartClass
          </div>
          <button onClick={() => setRole('guest')} className="text-gray-500 hover:text-red-600 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 w-full">
          <div className="max-w-lg w-full space-y-6 text-center">
            {showSuccess ? (
              <div className="bg-white rounded-2xl p-12 shadow-xl animate-fade-in-up border-t-4 border-[#66FF00]">
                <div className="w-24 h-24 bg-[#e6ffcc] text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={48} />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">แจ้งปัญหาสำเร็จ!</h2>
                <p className="text-gray-600 mb-8">ขอบคุณที่แจ้งปัญหาเข้ามา เจ้าหน้าที่จะรีบดำเนินการตรวจสอบโดยเร็วที่สุด</p>
                <button 
                  onClick={() => setShowSuccess(false)}
                  className="bg-black text-[#66FF00] font-bold px-8 py-3 rounded-xl hover:bg-gray-800 transition"
                >
                  กลับหน้าหลัก
                </button>
              </div>
            ) : !showForm ? (
              <div className="space-y-8 animate-fade-in-up">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">พบปัญหาการใช้งานห้องเรียน?</h1>
                  <p className="text-gray-600 text-lg">แจ้งปัญหาได้ทันที โดยไม่ต้องล็อกอินเพื่อตรวจสอบสถานะ</p>
                </div>
                <button 
                  onClick={() => setShowForm(true)}
                  className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black text-xl font-bold p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-4 group"
                >
                  <div className="bg-black/10 p-4 rounded-full group-hover:scale-110 transition-transform">
                    <Wrench size={40} />
                  </div>
                  แจ้งปัญหาใหม่
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up text-left border-t-4 border-[#66FF00]">
                <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800">แบบฟอร์มแจ้งปัญหา</h3>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-black">
                    <LogOut size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ห้องเรียน</label>
                      <input required type="text" placeholder="เช่น 942" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ผู้แจ้ง</label>
                      <input required type="text" placeholder="ชื่อ-สกุล" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none" value={formData.reporter} onChange={e => setFormData({...formData, reporter: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     {/* --- เพิ่มช่องสถานะผู้แจ้ง --- */}
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">สถานะผู้แจ้ง</label>
                        <div className="relative">
                          <select 
                            className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#66FF00] appearance-none"
                            value={formData.reporterType}
                            onChange={e => setFormData({...formData, reporterType: e.target.value as ReporterType})}
                          >
                            <option value="student">นักศึกษา</option>
                            <option value="lecturer">อาจารย์</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                             <GraduationCap size={16} />
                          </div>
                        </div>
                     </div>

                     {/* --- ช่องเบอร์โทรศัพท์ --- */}
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
                      <input 
                          required 
                          type="tel" 
                          placeholder="0xx-xxx-xxxx" 
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none" 
                          value={formData.phone} 
                          onChange={e => setFormData({...formData, phone: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทปัญหา</label>
                    <div className="grid grid-cols-3 gap-2">
                      {categories.map((cat) => (
                        <button key={cat.id} type="button" onClick={() => setFormData({...formData, category: cat.id})} className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs gap-1 transition-all ${formData.category === cat.id ? 'bg-[#66FF00]/10 border-[#66FF00] text-green-900 font-semibold' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                          <cat.icon size={20} /> {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                    <textarea required rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none resize-none" placeholder="อธิบายอาการเสียที่พบ..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ความเร่งด่วน</label>
                    <select className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#66FF00]" value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value as Urgency})}>
                      <option value="low">ทั่วไป (รอได้)</option>
                      <option value="medium">ปานกลาง (ควรแก้ไขภายในวัน)</option>
                      <option value="high">ด่วนมาก (กระทบการเรียนการสอน)</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={formSubmitting} className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black py-3 rounded-xl font-bold transition shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {formSubmitting ? <Loader2 className="animate-spin" /> : 'ยืนยันการแจ้ง'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="w-full mt-2 text-gray-500 py-2 rounded-xl font-medium hover:bg-gray-100 transition">ยกเลิก</button>
                  </div>
                </form>
              </div>
            )}
          </div>
          <div className="mt-8 text-gray-400 text-sm">© 2025 Smart Classroom System</div>
        </div>
      </div>
    );
  }

  // --- View: Staff / Admin Dashboard ---
  const stats = {
    pending: issues.filter(i => i.status === 'pending').length,
    inProgress: issues.filter(i => i.status === 'in-progress').length,
    completed: issues.filter(i => i.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col md:flex-row">
      <aside className="bg-white w-full md:w-64 md:h-screen shadow-lg z-20 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="bg-[#66FF00] p-2 rounded-lg text-black"><Monitor size={24} /></div>
          <div><span className="font-bold text-xl tracking-tight text-gray-900 block">SmartClass</span><span className="text-xs text-gray-500 font-medium tracking-wide">STAFF PORTAL</span></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">Menu</div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#66FF00]/20 text-green-900 font-semibold shadow-sm border-l-4 border-[#66FF00]"><Menu size={20} /> ภาพรวมงานซ่อม</button>
        </nav>
        <div className="p-4 border-t space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-[#66FF00] font-bold">AD</div>
            <div><p className="text-sm font-semibold">Admin Staff</p><p className="text-xs text-gray-500">{user?.email || 'IT Dept'}</p></div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-600 transition text-sm">
            <LogOut size={16} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
             <h1 className="text-2xl font-bold text-gray-800">Dashboard เจ้าหน้าที่</h1>
             <div className="text-sm text-gray-500 flex items-center gap-2">
               {loadingData && <Loader2 size={16} className="animate-spin text-[#66FF00]" />}
               สถานะ: {loadingData ? 'กำลังซิงค์...' : 'ออนไลน์'}
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-yellow-400">
              <div className="flex justify-between items-start">
                <div><p className="text-gray-500 text-sm">รอดำเนินการ</p><h3 className="text-3xl font-bold text-gray-800">{stats.pending}</h3></div>
                <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600"><Clock size={24} /></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-[#66FF00]">
              <div className="flex justify-between items-start">
                <div><p className="text-gray-500 text-sm">กำลังแก้ไข</p><h3 className="text-3xl font-bold text-gray-800">{stats.inProgress}</h3></div>
                <div className="p-2 bg-[#e6ffcc] rounded-lg text-green-700"><Wrench size={24} /></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-gray-400">
              <div className="flex justify-between items-start">
                <div><p className="text-gray-500 text-sm">เสร็จสิ้น</p><h3 className="text-3xl font-bold text-gray-800">{stats.completed}</h3></div>
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600"><CheckCircle size={24} /></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><Menu size={20} className="text-gray-400"/> รายการแจ้งซ่อมทั้งหมด</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="ค้นหาห้อง, รหัส..." className="pl-9 pr-4 py-1.5 border rounded-lg text-sm w-full md:w-64 focus:ring-1 focus:ring-[#66FF00] outline-none" />
                </div>
                <button className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600"><Filter size={16} /></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs">
                  <tr>
                    <th className="px-6 py-3">รหัส/เวลา</th>
                    <th className="px-6 py-3">ห้อง/ผู้แจ้ง</th>
                    <th className="px-6 py-3">รายละเอียด</th>
                    <th className="px-6 py-3">ความเร่งด่วน</th>
                    <th className="px-6 py-3">สถานะ</th>
                    <th className="px-6 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {issues.map((issue) => (
                    <tr key={issue.docId} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-mono text-gray-900 font-medium">{issue.id}</div>
                        <div className="text-xs text-gray-400">{formatDate(issue.timestamp)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{issue.room}</div>
                        <div className="text-xs">
                           {issue.reporter} 
                           <span className="text-gray-400 ml-1">
                             ({issue.reporterType === 'student' ? 'นักศึกษา' : 'อาจารย์'})
                           </span>
                        </div>
                        {/* แสดงเบอร์โทร */}
                        {issue.phone && (
                           <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                             <Phone size={10} /> {issue.phone}
                           </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1"><span className="px-1.5 py-0.5 rounded text-[10px] border bg-gray-50 text-gray-600 uppercase">{issue.category}</span></div>
                        <p className="truncate max-w-xs text-gray-800">{issue.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        {issue.urgency === 'high' ? <span className="text-red-600 text-xs font-bold flex items-center bg-red-50 px-2 py-1 rounded w-fit"><AlertCircle size={12} className="mr-1"/> ด่วนมาก</span> :
                         issue.urgency === 'medium' ? <span className="text-orange-600 text-xs font-medium bg-orange-50 px-2 py-1 rounded w-fit">ปานกลาง</span> :
                         <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded w-fit">ทั่วไป</span>}
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={issue.status} /></td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-1">
                          {issue.status === 'pending' && <button onClick={() => handleStatusChange(issue.docId, 'in-progress')} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium border border-blue-200 transition"><Wrench size={14} /> รับงาน</button>}
                          {issue.status === 'in-progress' && <button onClick={() => handleStatusChange(issue.docId, 'completed')} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-xs font-medium border border-green-200 transition"><CheckCircle size={14} /> ปิดงาน</button>}
                          {issue.status === 'completed' && <span className="text-green-500 text-xs flex items-center gap-1 justify-end"><CheckCircle size={14}/> เรียบร้อย</span>}
                         </div>
                      </td>
                    </tr>
                  ))}
                  {issues.length === 0 && !loadingData && <tr><td colSpan={6} className="text-center py-8 text-gray-400">ยังไม่มีข้อมูลการแจ้งซ่อมในระบบ</td></tr>}
                  {loadingData && <tr><td colSpan={6} className="text-center py-8 text-[#66FF00]"><div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin" /> กำลังโหลดข้อมูล...</div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}