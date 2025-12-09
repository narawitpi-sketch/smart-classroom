import React, { useState, useEffect } from "react";
import {
  Monitor,
  Wifi,
  Mic,
  Speaker,
  Thermometer,
  AlertCircle,
  Search,
  Filter,
  MoreHorizontal,
  Wrench,
  User,
  LogOut,
  Shield,
  CheckCircle,
  ArrowRight,
  Clock,
  Menu,
  Loader2,
} from "lucide-react";

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// --- Types ---
type Role = "guest" | "reporter" | "staff";
type Status = "pending" | "in-progress" | "completed";
type Urgency = "low" | "medium" | "high";

interface Issue {
  id: string;
  room: string;
  category: string;
  description: string;
  reporter: string;
  urgency: Urgency;
  status: Status;
  timestamp: any; // Firestore Timestamp or Date
  docId?: string; // Firestore Document ID
}

// --- Components ---

const StatusBadge = ({ status }: { status: Status }) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-green-100 text-green-800 border-green-200",
  };

  const labels = {
    pending: "รอตรวจสอบ",
    "in-progress": "กำลังแก้ไข",
    completed: "แก้ไขแล้ว",
  };

  const icons = {
    pending: <Clock size={14} className="mr-1" />,
    "in-progress": <Wrench size={14} className="mr-1" />,
    completed: <CheckCircle size={14} className="mr-1" />,
  };

  return (
    <span
      className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {icons[status]}
      {labels[status]}
    </span>
  );
};

// --- Main App Component ---
export default function App() {
  // --- Firebase Initialization ---
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [db, setDb] = useState<any>(null);
  const [appId, setAppId] = useState<string>("");

  useEffect(() => {
    const initFirebase = async () => {
      try {
        if (typeof __firebase_config !== "undefined") {
          const firebaseConfig = {
            apiKey: "AIzaSyCnH3miqz56mxvW7w2LUG_rUafmvxTXUFU",
            authDomain: "smart-classroom-app-80865.firebaseapp.com",
            projectId: "smart-classroom-app-80865",
            storageBucket: "smart-classroom-app-80865.firebasestorage.app",
            messagingSenderId: "1097518299832",
            appId: "1:1097518299832:web:bba6ef0f41d8fe2427924d",
            measurementId: "G-28RFQGB82Y"
          };

          // Initialize Firebase โดยไม่ต้องเช็ค if
          const app = initializeApp(firebaseConfig);
          // เปลี่ยน appId เป็นชื่อโปรเจกต์ของคุณ หรือ string อะไรก็ได้
          const appId = "smart-classroom-app";
        }
      } catch (err) {
        console.error("Firebase init error:", err);
      }
    };
    initFirebase();
  }, []);

  const auth = getAuth(app);
  const db = getFirestore(app);
  // --- App State ---
  const [role, setRole] = useState<Role>("guest"); // guest, reporter, staff
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  // UI States
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    room: "",
    category: "Visual",
    description: "",
    reporter: "",
    urgency: "medium" as Urgency,
  });

  // --- Data Fetching (Real-time) ---
  useEffect(() => {
    if (!user || !db || !appId) return;

    setLoading(true);
    // Use simple collection reference (Rule 2: No complex queries initially)
    // Path: /artifacts/{appId}/public/data/issues (Rule 1: Strict Paths)
    const q = collection(db, "artifacts", appId, "public", "data", "issues");

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedIssues: Issue[] = snapshot.docs.map((doc) => ({
          docId: doc.id,
          ...doc.data(),
        })) as Issue[];

        // Sort in memory (Rule 2)
        fetchedIssues.sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA; // Descending
        });

        setIssues(fetchedIssues);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching issues:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, db, appId]);

  const categories = [
    { id: "Visual", label: "ภาพ/โปรเจคเตอร์", icon: Monitor },
    { id: "Audio", label: "เสียง/ไมโครโฟน", icon: Speaker },
    { id: "Network", label: "อินเทอร์เน็ต/Wi-Fi", icon: Wifi },
    { id: "Environment", label: "แอร์/ไฟ/ความสะอาด", icon: Thermometer },
    { id: "Other", label: "อื่นๆ", icon: AlertCircle },
  ];

  // --- Handlers ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;

    setFormSubmitting(true);

    try {
      const newIssue = {
        id: `REQ-${Math.floor(Math.random() * 9000) + 1000}`, // Display ID
        ...formData,
        status: "pending",
        timestamp: new Date(), // Firestore converts Date to Timestamp
      };

      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "issues"),
        newIssue
      );

      setShowForm(false);
      setFormData({
        room: "",
        category: "Visual",
        description: "",
        reporter: "",
        urgency: "medium",
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusChange = async (
    docId: string | undefined,
    newStatus: Status
  ) => {
    if (!docId || !db) return;
    try {
      const issueRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "issues",
        docId
      );
      await updateDoc(issueRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // --- Helper for Date Display ---
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    // Handle both Firestore Timestamp and JS Date
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString("th-TH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- Loading Screen ---
  if (!firebaseInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">กำลังเชื่อมต่อระบบ...</p>
        </div>
      </div>
    );
  }

  // --- Login / Landing Screen ---
  if (role === "guest") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <div className="bg-white w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6 text-indigo-600">
              <Monitor size={48} />
            </div>
            <h1 className="text-4xl font-bold text-indigo-900 mb-3">
              Smart Classroom Support
            </h1>
            <p className="text-gray-600 text-lg">
              ระบบแจ้งปัญหาและบริหารจัดการห้องเรียนอัจฉริยะ (Online)
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Reporter Card */}
            <button
              onClick={() => setRole("reporter")}
              className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all group text-left border-2 border-transparent hover:border-indigo-100"
            >
              <div className="bg-orange-100 w-14 h-14 rounded-xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                <User size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                แจ้งปัญหาห้องเรียน
              </h2>
              <p className="text-gray-500 mb-6">
                สำหรับอาจารย์ นักศึกษา
                หรือบุคลากรทั่วไปที่ต้องการแจ้งเหตุขัดข้อง
              </p>
              <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform">
                เข้าสู่ระบบผู้แจ้ง <ArrowRight size={20} className="ml-2" />
              </div>
            </button>

            {/* Staff Card */}
            <button
              onClick={() => setRole("staff")}
              className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all group text-left border-2 border-transparent hover:border-indigo-100"
            >
              <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <Shield size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                เจ้าหน้าที่ดูแลระบบ
              </h2>
              <p className="text-gray-500 mb-6">
                สำหรับทีม IT หรือฝ่ายอาคารสถานที่ เพื่อรับเรื่องและอัปเดตงานซ่อม
              </p>
              <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform">
                เข้าสู่ระบบเจ้าหน้าที่ <ArrowRight size={20} className="ml-2" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Reporter View (Simplified) ---
  if (role === "reporter") {
    return (
      <div className="min-h-screen bg-gray-50 font-sans flex flex-col items-center justify-center p-4 relative">
        {/* Navbar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xl">
            <div className="bg-indigo-600 p-1.5 rounded text-white">
              <Monitor size={20} />
            </div>
            SmartClass
          </div>
          <button
            onClick={() => setRole("guest")}
            className="text-gray-500 hover:text-red-600 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </div>

        <div className="max-w-lg w-full space-y-6 text-center">
          {showSuccess ? (
            // Success State
            <div className="bg-white rounded-2xl p-12 shadow-xl animate-fade-in-up border border-green-100">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                แจ้งปัญหาสำเร็จ!
              </h2>
              <p className="text-gray-600 mb-8">
                ขอบคุณที่แจ้งปัญหาเข้ามา
                เจ้าหน้าที่จะรีบดำเนินการตรวจสอบโดยเร็วที่สุด
              </p>
              <button
                onClick={() => setShowSuccess(false)}
                className="bg-gray-100 text-gray-700 font-semibold px-8 py-3 rounded-xl hover:bg-gray-200 transition"
              >
                กลับหน้าหลัก
              </button>
            </div>
          ) : !showForm ? (
            // Landing State
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  พบปัญหาการใช้งานห้องเรียน?
                </h1>
                <p className="text-gray-600 text-lg">
                  แจ้งปัญหาได้ทันที โดยไม่ต้องล็อกอินเพื่อตรวจสอบสถานะ
                </p>
              </div>

              <button
                onClick={() => setShowForm(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-4 group"
              >
                <div className="bg-white/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                  <Wrench size={40} />
                </div>
                แจ้งปัญหาใหม่
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <Wifi className="mx-auto text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-gray-600">
                    อินเทอร์เน็ต
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <Monitor className="mx-auto text-purple-500 mb-2" />
                  <span className="text-sm font-medium text-gray-600">
                    โปรเจคเตอร์
                  </span>
                </div>
              </div>
            </div>
          ) : (
            // Form State
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up text-left">
              <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">แบบฟอร์มแจ้งปัญหา</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-white/70 hover:text-white"
                >
                  <LogOut size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ห้องเรียน
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="เช่น SC-401"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.room}
                      onChange={(e) =>
                        setFormData({ ...formData, room: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ผู้แจ้ง
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="ชื่อ-สกุล"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.reporter}
                      onChange={(e) =>
                        setFormData({ ...formData, reporter: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทปัญหา
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, category: cat.id })
                        }
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs gap-1 transition-all ${
                          formData.category === cat.id
                            ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                            : "border-gray-200 hover:bg-gray-50 text-gray-600"
                        }`}
                      >
                        <cat.icon size={20} />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รายละเอียด
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="อธิบายอาการเสียที่พบ..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ความเร่งด่วน
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none"
                    value={formData.urgency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        urgency: e.target.value as Urgency,
                      })
                    }
                  >
                    <option value="low">ทั่วไป (รอได้)</option>
                    <option value="medium">ปานกลาง (ควรแก้ไขภายในวัน)</option>
                    <option value="high">ด่วนมาก (กระทบการเรียนการสอน)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {formSubmitting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "ยืนยันการแจ้ง"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-full mt-2 text-gray-500 py-2 rounded-xl font-medium hover:bg-gray-100 transition"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
        <div className="absolute bottom-6 text-gray-400 text-sm">
          © 2024 Smart Classroom System
        </div>
      </div>
    );
  }

  // --- Staff / Admin View (Full Dashboard) ---
  const stats = {
    pending: issues.filter((i) => i.status === "pending").length,
    inProgress: issues.filter((i) => i.status === "in-progress").length,
    completed: issues.filter((i) => i.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="bg-white w-full md:w-64 md:h-screen shadow-lg z-20 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Monitor size={24} />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-indigo-900 block">
              SmartClass
            </span>
            <span className="text-xs text-gray-500 font-medium tracking-wide">
              STAFF PORTAL
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
            Menu
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold shadow-sm">
            <Menu size={20} />
            ภาพรวมงานซ่อม
          </button>
        </nav>

        <div className="p-4 border-t space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              AD
            </div>
            <div>
              <p className="text-sm font-semibold">Admin Staff</p>
              <p className="text-xs text-gray-500">IT Department</p>
            </div>
          </div>
          <button
            onClick={() => setRole("guest")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-600 transition text-sm"
          >
            <LogOut size={16} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">
              Dashboard เจ้าหน้าที่
            </h1>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              {loading && (
                <Loader2 size={16} className="animate-spin text-indigo-600" />
              )}
              สถานะ: {loading ? "กำลังซิงค์..." : "ออนไลน์"}
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-yellow-400">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">รอดำเนินการ</p>
                  <h3 className="text-3xl font-bold text-gray-800">
                    {stats.pending}
                  </h3>
                </div>
                <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                  <Clock size={24} />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-400">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">กำลังแก้ไข</p>
                  <h3 className="text-3xl font-bold text-gray-800">
                    {stats.inProgress}
                  </h3>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Wrench size={24} />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-400">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">เสร็จสิ้น</p>
                  <h3 className="text-3xl font-bold text-gray-800">
                    {stats.completed}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <CheckCircle size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Task Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Menu size={20} className="text-gray-400" />
                รายการแจ้งซ่อมทั้งหมด
              </h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="ค้นหาห้อง, รหัส..."
                    className="pl-9 pr-4 py-1.5 border rounded-lg text-sm w-full md:w-64 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600">
                  <Filter size={16} />
                </button>
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
                    <tr
                      key={issue.docId}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono text-gray-900 font-medium">
                          {issue.id}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(issue.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-indigo-600">
                          {issue.room}
                        </div>
                        <div className="text-xs">{issue.reporter}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] border bg-gray-50 text-gray-600 uppercase">
                            {issue.category}
                          </span>
                        </div>
                        <p className="truncate max-w-xs text-gray-800">
                          {issue.description}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {issue.urgency === "high" ? (
                          <span className="text-red-600 text-xs font-bold flex items-center bg-red-50 px-2 py-1 rounded w-fit">
                            <AlertCircle size={12} className="mr-1" /> ด่วนมาก
                          </span>
                        ) : issue.urgency === "medium" ? (
                          <span className="text-orange-600 text-xs font-medium bg-orange-50 px-2 py-1 rounded w-fit">
                            ปานกลาง
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                            ทั่วไป
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={issue.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {issue.status === "pending" && (
                            <button
                              onClick={() =>
                                handleStatusChange(issue.docId, "in-progress")
                              }
                              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium border border-blue-200 transition"
                            >
                              <Wrench size={14} /> รับงาน
                            </button>
                          )}
                          {issue.status === "in-progress" && (
                            <button
                              onClick={() =>
                                handleStatusChange(issue.docId, "completed")
                              }
                              className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-xs font-medium border border-green-200 transition"
                            >
                              <CheckCircle size={14} /> ปิดงาน
                            </button>
                          )}
                          {issue.status === "completed" && (
                            <span className="text-green-500 text-xs flex items-center gap-1 justify-end">
                              <CheckCircle size={14} /> เรียบร้อย
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {issues.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-8 text-gray-400"
                      >
                        ยังไม่มีข้อมูลการแจ้งซ่อมในระบบ
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-8 text-indigo-600"
                      >
                        <div className="flex justify-center items-center gap-2">
                          <Loader2 className="animate-spin" />{" "}
                          กำลังโหลดข้อมูล...
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
