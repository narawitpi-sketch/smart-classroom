// src/components/FeedbackModal.tsx
import React, { useState, useEffect } from 'react';
import { Smile, Star, MessageSquare, X } from 'lucide-react';
import type { Feedback } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Feedback>) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [data, setData] = useState<Partial<Feedback>>({
    gender: '', status: '', age: '',
    r_sys_easy: 0, r_sys_complete: 0, r_sys_speed: 0,
    r_svc_contact: 0, r_svc_start: 0, r_svc_skill: 0, r_svc_polite: 0, r_svc_result: 0, r_svc_overall: 0,
    suggestion: ''
  });

  useEffect(() => {
    if (isOpen) {
      setData({
        gender: '', status: '', age: '',
        r_sys_easy: 0, r_sys_complete: 0, r_sys_speed: 0,
        r_svc_contact: 0, r_svc_start: 0, r_svc_skill: 0, r_svc_polite: 0, r_svc_result: 0, r_svc_overall: 0,
        suggestion: ''
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const requiredFields = ['gender', 'status', 'age'];
    const ratingFields = ['r_sys_easy', 'r_sys_complete', 'r_sys_speed', 'r_svc_contact', 'r_svc_start', 'r_svc_skill', 'r_svc_polite', 'r_svc_result', 'r_svc_overall'];
    // @ts-ignore
    const isMissing = requiredFields.some(f => !data[f]) || ratingFields.some(f => !data[f]);

    if (isMissing) {
      alert("กรุณากรอกข้อมูลและให้คะแนนให้ครบทุกข้อ");
      return;
    }
    onSubmit(data);
  };

  const StarRating = ({ value, onChange, label, subLabel }: any) => (
    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
      <label className="block font-semibold text-gray-800 mb-1">{label}</label>
      <p className="text-xs text-gray-500 mb-3">{subLabel}</p>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => onChange(star)} className={`transition-transform hover:scale-110 focus:outline-none ${value >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}>
            <Star size={28} />
          </button>
        ))}
      </div>
      <div className="text-center text-xs text-gray-400 mt-1">{value > 0 ? `${value} คะแนน` : 'ยังไม่ระบุ'}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#66FF00] p-4 flex justify-between items-center text-black shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2"><Smile size={24}/> แบบประเมินความพึงพอใจ</h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
             <div><h4 className="font-semibold text-gray-800 mb-3 text-sm">1. เพศ</h4><div className="grid grid-cols-2 gap-2">{['ชาย', 'หญิง'].map(g => (<button key={g} onClick={() => setData({...data, gender: g})} className={`p-2 rounded-lg border text-sm ${data.gender === g ? 'bg-black text-[#66FF00] border-black' : 'hover:bg-gray-50'}`}>{g}</button>))}</div></div>
             <div><h4 className="font-semibold text-gray-800 mb-3 text-sm">2. สถานะ</h4><div className="grid grid-cols-2 gap-2">{['อาจารย์', 'นักศึกษา', 'อื่นๆ'].map(s => (<button key={s} onClick={() => setData({...data, status: s})} className={`p-2 rounded-lg border text-sm ${data.status === s ? 'bg-black text-[#66FF00] border-black' : 'hover:bg-gray-50'}`}>{s}</button>))}</div></div>
             <div><h4 className="font-semibold text-gray-800 mb-3 text-sm">3. อายุ</h4><div className="grid grid-cols-2 gap-2">{['18-25', '26-35', '36-45', '46-55', '> 55'].map(a => (<button key={a} onClick={() => setData({...data, age: a})} className={`p-2 rounded-lg border text-sm ${data.age === a ? 'bg-black text-[#66FF00] border-black' : 'hover:bg-gray-50'}`}>{a} ปี</button>))}</div></div>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-indigo-700 mb-4 border-b pb-2">4. ความพึงพอใจต่อระบบแจ้งซ่อม</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StarRating label="4.1 การใช้งาน (User Friendliness)" subLabel="เข้าถึงง่าย ขั้นตอนน้อย ปุ่มชัดเจน" value={data.r_sys_easy} onChange={(v: number) => setData({...data, r_sys_easy: v})} />
                <StarRating label="4.2 ความครบถ้วนของข้อมูล" subLabel="มีช่องให้ระบุข้อมูลครบถ้วน" value={data.r_sys_complete} onChange={(v: number) => setData({...data, r_sys_complete: v})} />
                <StarRating label="4.3 การตอบสนองของระบบ" subLabel="โหลดเร็ว ไม่ค้าง ไม่ error" value={data.r_sys_speed} onChange={(v: number) => setData({...data, r_sys_speed: v})} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-indigo-700 mb-4 border-b pb-2">5. ความพึงพอใจต่อการให้บริการ</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StarRating label="5.1 ความรวดเร็วในการติดต่อกลับ" subLabel="เจ้าหน้าที่รับเรื่องรวดเร็ว" value={data.r_svc_contact} onChange={(v: number) => setData({...data, r_svc_contact: v})} />
                <StarRating label="5.2 ความรวดเร็วในการเข้าซ่อม" subLabel="เริ่มดำเนินการแก้ไขรวดเร็ว" value={data.r_svc_start} onChange={(v: number) => setData({...data, r_svc_start: v})} />
                <StarRating label="5.3 ความสามารถของเจ้าหน้าที่" subLabel="ทักษะในการแก้ไขปัญหา" value={data.r_svc_skill} onChange={(v: number) => setData({...data, r_svc_skill: v})} />
                <StarRating label="5.4 ความสุภาพและการสื่อสาร" subLabel="พูดจาสุภาพ เข้าใจง่าย" value={data.r_svc_polite} onChange={(v: number) => setData({...data, r_svc_polite: v})} />
                <StarRating label="5.5 ผลลัพธ์ของการซ่อม" subLabel="ใช้งานได้ปกติ ไม่พังซ้ำ" value={data.r_svc_result} onChange={(v: number) => setData({...data, r_svc_result: v})} />
                <StarRating label="5.6 ความพึงพอใจโดยรวม" subLabel="ภาพรวมการให้บริการ" value={data.r_svc_overall} onChange={(v: number) => setData({...data, r_svc_overall: v})} />
              </div>
            </div>
            
            {/* 6. ข้อเสนอแนะเพิ่มเติม */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
               <label className="block font-semibold text-gray-800 mb-2 flex items-center gap-2">
                 <MessageSquare size={18} /> 6. ข้อเสนอแนะเพิ่มเติม (Optional)
               </label>
               <textarea 
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none resize-none bg-white text-gray-700 text-sm"
                  rows={3}
                  placeholder="หากมีข้อเสนอแนะเพิ่มเติม สามารถระบุได้ที่นี่..."
                  value={data.suggestion}
                  onChange={e => setData({...data, suggestion: e.target.value})}
               />
            </div>
          </div>

          <button onClick={handleSubmit} className="w-full mt-8 bg-[#66FF00] text-black font-bold py-4 rounded-2xl shadow-lg hover:bg-[#5ce600] transition transform active:scale-95 text-lg">ยืนยันการประเมิน</button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;