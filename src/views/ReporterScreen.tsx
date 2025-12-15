import React, { useState } from 'react';
import { Monitor, LogOut, CheckCircle, Wrench, X, GraduationCap, Loader2, Speaker, Wifi, Thermometer, AlertCircle } from 'lucide-react';
import { Room, ReporterType, Urgency } from '../utils/types';
import { db, APP_ID, sendLineMessage } from '../utils/firebase';
import { collection, addDoc } from 'firebase/firestore';

const CATEGORIES = [
  { id: 'Visual', icon: Monitor, label: 'ภาพ/โปรเจคเตอร์' },
  { id: 'Audio', icon: Speaker, label: 'เสียง/ไมโครโฟน' },
  { id: 'Network', icon: Wifi, label: 'อินเทอร์เน็ต/Wi-Fi' },
  { id: 'Environment', icon: Thermometer, label: 'แอร์/ไฟ/ความสะอาด' },
  { id: 'Other', icon: AlertCircle, label: 'อื่นๆ' },
];

export const ReporterScreen = ({ rooms, onLogout, fireAlert }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    room: '', category: 'Visual', description: '', reporter: '', reporterType: 'lecturer' as ReporterType, phone: '', urgency: 'medium' as Urgency,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone.length !== 10) { fireAlert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก', 'warning'); return; }
    if (!formData.room) { fireAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาเลือกห้องเรียน', 'warning'); return; }

    setFormSubmitting(true);
    try {
      const cleanData = { ...formData, room: formData.room.trim(), reporter: formData.reporter.trim(), phone: formData.phone.trim(), description: formData.description.trim() };
      const newIssue = { id: `REQ-${Math.floor(Math.random() * 9000) + 1000}`, ...cleanData, status: 'pending', timestamp: new Date() };
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues'), newIssue);
      await sendLineMessage(newIssue);
      setShowForm(false);
      setShowSuccess(true);
      setFormData({ room: '', category: 'Visual', description: '', reporter: '', reporterType: 'lecturer', phone: '', urgency: 'medium' });
    } catch (error) { fireAlert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งข้อมูลได้', 'error'); } finally { setFormSubmitting(false); }
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
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* ... (Copy Form Inputs from previous App.tsx here) ... */}
                {/* เพื่อความกระชับ ผมละส่วน Input ไว้ แต่ให้ใช้โค้ดชุดเดียวกับ App.tsx เดิมได้เลยครับ */}
                {/* โดยเปลี่ยน handle ต่างๆ ให้เป็น local function ภายใน component นี้ */}
                <div className="pt-2"><button type="submit" disabled={formSubmitting} className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black py-3 rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2">{formSubmitting ? <Loader2 className="animate-spin" /> : 'ยืนยันการแจ้ง'}</button></div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};