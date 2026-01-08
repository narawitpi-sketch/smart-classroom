// src/components/ReporterScreen.tsx
import React, { useState } from 'react';
import { GraduationCap, X, CheckCircle, Loader2, Monitor, LogOut, Wrench, Speaker, Wifi, Thermometer, AlertCircle } from 'lucide-react';
import type { ReporterType, Urgency, Room } from '../types';
import { CATEGORIES } from '../config/constants';

const iconMap = {
  Monitor,
  Speaker,
  Wifi,
  Thermometer,
  AlertCircle,
};

interface ReporterScreenProps {
  rooms: any[];
  onSubmit: (data: any) => Promise<boolean>;
  onLogout: () => void;
  formSubmitting: boolean;
  fireAlert: (title: string, text: string, icon: 'success' | 'error' | 'warning') => void;
}

const ReporterScreen: React.FC<ReporterScreenProps> = ({ rooms, onSubmit, onLogout, formSubmitting, fireAlert }) => {
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    room: '', category: 'Visual', description: '', reporter: '', reporterType: 'lecturer' as ReporterType, phone: '', urgency: 'medium' as Urgency,
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setFormData(prev => ({ ...prev, room: roomParam }));
      setShowForm(true);
    }
  }, []);

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, room: e.target.value });
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.value === '' || /^[a-zA-Z\u0E00-\u0E7F\s]+$/.test(e.target.value)) setFormData({ ...formData, reporter: e.target.value }); };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => { if ((e.target.value === '' || /^[0-9]+$/.test(e.target.value)) && e.target.value.length <= 10) setFormData({ ...formData, phone: e.target.value }); };
  
  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone.length !== 10) { fireAlert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก', 'warning'); return; }
    if (!formData.room) { fireAlert('ข้อมูลไม่ถูกต้อง', 'กรุณาเลือกห้องเรียน', 'warning'); return; }
    const success = await onSubmit(formData); // ส่งข้อมูลกลับไปให้ App
    if (success) {
      setShowForm(false);
      setShowSuccess(true);
      // Reset Form
      setFormData({ room: '', category: 'Visual', description: '', reporter: '', reporterType: 'lecturer', phone: '', urgency: 'medium' });
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {CATEGORIES.map((cat) => {
                      const IconComponent = iconMap[cat.icon as keyof typeof iconMap];
                      return (
                        <button key={cat.id} type="button" onClick={() => setFormData({...formData, category: cat.id})} className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs gap-1 transition-all ${formData.category === cat.id ? 'bg-[#66FF00]/10 border-[#66FF00] text-green-900 font-semibold' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                          {IconComponent && <IconComponent size={20} />} {cat.label}
                        </button>
                      );
                    })}
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

export default React.memo(ReporterScreen);