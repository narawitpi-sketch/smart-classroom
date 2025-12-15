import React from 'react';
import { Monitor, User as UserIcon, ArrowRight, Shield } from 'lucide-react';

export const LandingScreen = ({ onReporterClick, onAdminClick }: any) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-4">
    <div className="max-w-4xl w-full text-center">
      <div className="bg-[#66FF00] w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6 text-black"><Monitor size={48} /></div>
      <h1 className="text-4xl font-black text-gray-900 mb-3 font-sans tracking-tight">Smart Classroom Support</h1>
      <p className="text-gray-600 text-lg mb-12">ระบบแจ้งปัญหาและบริหารจัดการห้องเรียนอัจฉริยะ (ม.ใน)</p>
      <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto text-left">
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
    </div>
  </div>
);