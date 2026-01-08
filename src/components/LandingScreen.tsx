// src/components/LandingScreen.tsx
import React from 'react';
import { Monitor, UserIcon, Shield, ArrowRight, Smile, Search } from 'lucide-react';

interface LandingScreenProps {
  onReporterClick: () => void;
  onAdminClick: () => void;
  onFeedbackClick: () => void;
  onTrackingClick: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = React.memo(({ onReporterClick, onAdminClick, onFeedbackClick, onTrackingClick }) => {
  return (
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

        <div className="flex justify-center gap-4">
          <button onClick={onTrackingClick} className="inline-flex items-center gap-2 text-gray-600 hover:text-black bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md transition">
             <Search size={20} className="text-[#66FF00]" /> ติดตามสถานะ
          </button>
          <button onClick={onFeedbackClick} className="inline-flex items-center gap-2 text-gray-600 hover:text-black bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md transition">
             <Smile size={20} className="text-[#66FF00] fill-current" /> ประเมินความพึงพอใจ
          </button>
        </div>
      </div>
    </div>
  );
});

export default LandingScreen;