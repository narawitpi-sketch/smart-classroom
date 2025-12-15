import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { signInAnonymously, onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db, APP_ID, ALLOWED_ADMIN_EMAILS } from './utils/firebase';
import { Role, Issue, Room } from './utils/types';

// Import Views & Components
import { SweetAlert } from './components/SweetAlert';
import { LoginScreen } from './views/LoginScreen';
import { LandingScreen } from './views/LandingScreen';
import { ReporterScreen } from './views/ReporterScreen';
import { AdminDashboard } from './views/AdminDashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [role, setRole] = useState<Role>('guest');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [alertConfig, setAlertConfig] = useState<any>({ show: false, title: '', text: '', icon: 'success' });

  const fireAlert = (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: () => void, showCancel = false) => {
    setAlertConfig({
      show: true, title, text, icon, showCancel,
      onConfirm: () => { setAlertConfig((prev: any) => ({ ...prev, show: false })); if(onConfirm) onConfirm(); },
      onCancel: () => setAlertConfig((prev: any) => ({ ...prev, show: false }))
    });
  };

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

  useEffect(() => {
    if (!user || role === 'guest') return;
    const unsubIssues = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues'), (s) => setIssues(s.docs.map(d => ({ docId: d.id, ...d.data() } as Issue))));
    const unsubRooms = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms'), (s) => setRooms(s.docs.map(d => ({ id: d.id, ...d.data() } as Room))));
    return () => { unsubIssues(); unsubRooms(); };
  }, [user, role]);

  const handleLogout = async () => {
    try { await signOut(auth); await signInAnonymously(auth); setRole('guest'); } 
    catch (e) { console.error(e); }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      if (result.user.email && ALLOWED_ADMIN_EMAILS.includes(result.user.email)) { setRole('staff'); }
      else { await signOut(auth); fireAlert('เข้าสู่ระบบไม่สำเร็จ', 'อีเมลนี้ไม่มีสิทธิ์', 'error'); await signInAnonymously(auth); }
    } catch (e: any) { if (e.code !== 'auth/popup-closed-by-user') fireAlert('เกิดข้อผิดพลาด', e.message, 'error'); }
  };

  if (loadingAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-[#66FF00]" /></div>;

  return (
    <>
      <SweetAlert {...alertConfig} />
      {role === 'login_admin' && <LoginScreen onGoogleLogin={handleGoogleLogin} onBack={() => setRole('guest')} />}
      {role === 'guest' && <LandingScreen onReporterClick={() => setRole('reporter')} onAdminClick={() => {
         if (user && !user.isAnonymous && user.email && ALLOWED_ADMIN_EMAILS.includes(user.email)) { setRole('staff'); } 
         else { setRole('login_admin'); }
      }} />}
      {role === 'reporter' && <ReporterScreen rooms={rooms} onLogout={handleLogout} fireAlert={fireAlert} />}
      {role === 'staff' && <AdminDashboard user={user} issues={issues} rooms={rooms} handleLogout={handleLogout} fireAlert={fireAlert} />}
    </>
  );
}
