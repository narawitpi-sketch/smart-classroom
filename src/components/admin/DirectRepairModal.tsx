import React, { useState } from 'react';
import { Wrench, Trash2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { APP_ID } from '../../config/constants';
import type { Room } from '../../types';

interface DirectRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  fireAlert: (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: (value?: any) => void, showCancel?: boolean, input?: string) => void;
  onSuccess: (newIssueId: string) => void;
}

const DirectRepairModal: React.FC<DirectRepairModalProps> = ({ isOpen, onClose, rooms, fireAlert, onSuccess }) => {
  const [directRoom, setDirectRoom] = useState('');
  const [isCustomRoom, setIsCustomRoom] = useState(false);
  const [directProblem, setDirectProblem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directRoom.trim() || !directProblem.trim()) return;

    setIsSubmitting(true);
    try {
       // Create a new "Self-Reported" issue
       const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues'), {
          description: directProblem.trim(), 
          room: directRoom.trim(),
          reporter: 'Admin', 
          reporterType: 'admin', 
          status: 'in-progress', 
          timestamp: serverTimestamp(),
          category: 'other',
          imageUrl: null,
          imagePath: null
       });
       
       // Close Direct Modal & Reset
       setDirectRoom('');
       setIsCustomRoom(false);
       setDirectProblem('');
       onClose();

       // Callback to open Maintenance Modal
       onSuccess(docRef.id);
       
    } catch (error) {
       console.error(error);
       fireAlert('ผิดพลาด', 'สร้างรายการไม่สำเร็จ', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
       <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Wrench className="text-[#66FF00]" size={20} /> บันทึกซ่อมเอง / เบิกของ</h3>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Trash2 className="rotate-45" size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ห้อง / สถานที่</label>
                <select 
                   className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none bg-white mb-2" 
                   value={isCustomRoom ? 'other' : directRoom} 
                   onChange={e => {
                      const val = e.target.value;
                      if (val === 'other') {
                         setIsCustomRoom(true);
                         setDirectRoom('');
                      } else {
                         setIsCustomRoom(false);
                         setDirectRoom(val);
                      }
                   }}
                >
                   <option value="">-- เลือกห้อง --</option>
                   {rooms.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                   <option value="other">อื่นๆ (ระบุเอง)</option>
                </select>
                
                {/* Show input ONLY if isCustomRoom is true */}
                {isCustomRoom && (
                   <input 
                       type="text" 
                       className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none animate-fade-in" 
                       placeholder="ระบุสถานที่..." 
                       value={directRoom} 
                       onChange={e => setDirectRoom(e.target.value)} 
                       autoFocus
                   />
                )}
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">สิ่งที่ซ่อม / เบิก</label>
                <input type="text" required className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none" placeholder="เช่น เปลี่ยนถ่านไมค์, เบิกสาย LAN" value={directProblem} onChange={e => setDirectProblem(e.target.value)} />
             </div>
             <button type="submit" disabled={isSubmitting} className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold py-3 rounded-xl shadow-md transition mt-2 disabled:opacity-50">
                {isSubmitting ? 'กำลังบันทึก...' : 'ต่อไป (เลือกอุปกรณ์)'}
             </button>
          </form>
       </div>
    </div>
  );
};

export default DirectRepairModal;
