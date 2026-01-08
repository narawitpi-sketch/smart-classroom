import React, { useState, useEffect, Suspense } from 'react';
import DOMPurify from 'dompurify';
import { 
  Loader2,
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
  onSnapshot
} from 'firebase/firestore';

// --- Local Imports ---
import { auth, db } from './config/firebase';
import { APP_ID, ALLOWED_ADMIN_EMAILS } from './config/constants';
import type { Role, Issue, Room, Feedback } from './types';
import { sendLineMessage } from './utils/helpers';
import SweetAlert from './components/SweetAlert';
import FeedbackModal from './components/FeedbackModal';
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const LandingScreen = React.lazy(() => import('./components/LandingScreen'));
const LoginScreen = React.lazy(() => import('./components/LoginScreen'));
const ReporterScreen = React.lazy(() => import('./components/ReporterScreen'));
const TrackingScreen = React.lazy(() => import('./components/TrackingScreen'));

import { requestNotificationPermission, setupIssueNotifications } from './utils/notifications';

// ==========================================
// 5. MAIN APP COMPONENT
// ==========================================

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [role, setRole] = useState<Role>('guest');
  
  // Data State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]); 
  const [inventory, setInventory] = useState<any[]>([]); // New Inventory State
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Alert
  const [alertConfig, setAlertConfig] = useState<any>({ show: false, title: '', text: '', icon: 'success', onConfirm: () => {}, showCancel: false });
  const fireAlert = (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: (value?: any) => void, showCancel = false, input?: string) => {
    setAlertConfig({
      show: true, title, text, icon, showCancel, input,
      onConfirm: (value?: any) => { setAlertConfig((prev: any) => ({ ...prev, show: false })); if(onConfirm) onConfirm(value); },
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
          console.log("Admin logged in:", u.email);
          setRole('staff');
        } else {
          // Anonymous or non-admin user
          const params = new URLSearchParams(window.location.search);
          if (params.get('room')) {
             setRole('reporter');
          } else if (role !== 'tracking') {
             // Keep tracking role if set, otherwise guest
             setRole('guest');
          }
        }
      } else {
        // No user. 
        // We do NOT auto-login anonymously to prevent overwriting existing sessions during loading.
        // Only explicit actions should trigger login.
        setUser(null);
        // If we were expecting an admin login but got null, we might be logged out.
        if (role !== 'login_admin') setRole('guest');
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Notification Permission Effect
  useEffect(() => {
    if (role === 'staff') {
      requestNotificationPermission();
    }
  }, [role]);

  // Data Fetching Effect
  // Data Fetching Effect
  useEffect(() => {
    // 1. Always fetch rooms (Public info needed for Reporter)
    const qRooms = collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms');
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      // console.log("Rooms snapshot received. Size:", snapshot.size);
      const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      fetchedRooms.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setRooms(fetchedRooms);
    }, (error) => {
      console.error("Room Fetch Error:", error);
      // Only alert if it's a real connectivity issue, not just permission denial during transition
      if (error.code !== 'permission-denied') {
          // fireAlert('Connection Error', ...);
      }
    });

    // 2. Fetch Protected Data ONLY if Admin (Staff)
    let unsubIssues = () => {};
    let unsubFeedbacks = () => {};
    let unsubInventory = () => {};
    
    if (role === 'staff' && user) {
      console.log("Starting ADMIN data fetch. Role:", role);
      
      unsubIssues = setupIssueNotifications(db, APP_ID, role, setIssues, (error) => {
        console.error("Issue Fetch Error:", error);
      });

      const qFeedbacks = collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks');
      unsubFeedbacks = onSnapshot(qFeedbacks, (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Feedback[];
        setFeedbacks(fetched);
      });

      const qInventory = collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory');
      unsubInventory = onSnapshot(qInventory, (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetched.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setInventory(fetched);
      });
    } else {
        // Clear protected data if not admin
        setIssues([]);
        setFeedbacks([]);
        setInventory([]);
    }

    return () => { unsubIssues(); unsubRooms(); unsubFeedbacks(); unsubInventory(); };
  }, [user, role]);

  // Actions
  const handleLogout = async () => {
    try { 
      await signOut(auth); 
      // Force reset everything
      setRole('guest'); 
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

  const handleSubmit = async (data: any) => {
    if (!user) return false;
    
    setFormSubmitting(true);
    try {
      const cleanData = { 
        ...data, 
        room: DOMPurify.sanitize(data.room.trim()),
        reporter: DOMPurify.sanitize(data.reporter.trim()),
        phone: DOMPurify.sanitize(data.phone.trim()),
        description: DOMPurify.sanitize(data.description.trim())
      };
      
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

  const handleFeedbackSubmit = async (data: any) => {
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks'), {
        ...data,
        suggestion: DOMPurify.sanitize(data.suggestion),
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

  if (loadingAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-[#66FF00]" /></div>;

  return (
    <>
      <SweetAlert show={alertConfig.show} title={alertConfig.title} text={alertConfig.text} icon={alertConfig.icon} onConfirm={alertConfig.onConfirm} onCancel={alertConfig.onCancel} showCancel={alertConfig.showCancel} input={alertConfig.input} />
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} onSubmit={handleFeedbackSubmit} />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-[#66FF00]" /></div>}>
        {role === 'login_admin' && <LoginScreen onGoogleLogin={handleGoogleLogin} onBack={() => setRole('guest')} isLoggingIn={isLoggingIn} />}
        {role === 'guest' && <LandingScreen onReporterClick={() => setRole('reporter')} onAdminClick={handleStaffClick} onFeedbackClick={() => setShowFeedbackModal(true)} onTrackingClick={() => setRole('tracking')} />}
        {role === 'reporter' && <ReporterScreen rooms={rooms} onSubmit={handleSubmit} onLogout={handleLogout} formSubmitting={formSubmitting} fireAlert={fireAlert} />}
        {role === 'tracking' && <TrackingScreen onBack={() => setRole('guest')} />}
        {role === 'staff' && <AdminDashboard user={user} issues={issues} rooms={rooms} feedbacks={feedbacks} inventory={inventory} handleLogout={handleLogout} fireAlert={fireAlert} />}
      </Suspense>
    </>
  );
}