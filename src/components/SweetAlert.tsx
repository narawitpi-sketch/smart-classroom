// src/components/SweetAlert.tsx
import React from 'react';
import { CheckCircle, X, AlertCircle } from 'lucide-react';

interface SweetAlertProps {
  show: boolean;
  title: string;
  text: string;
  icon: 'success' | 'error' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

const SweetAlert: React.FC<SweetAlertProps> = ({ show, title, text, icon, onConfirm, onCancel, showCancel }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all scale-100">
        <div className="flex justify-center mb-5">
          {icon === 'success' && <div className="w-20 h-20 rounded-full border-4 border-green-200 flex items-center justify-center bg-green-50"><CheckCircle className="w-10 h-10 text-green-500" /></div>}
          {icon === 'error' && <div className="w-20 h-20 rounded-full border-4 border-red-200 flex items-center justify-center bg-red-50"><X className="w-10 h-10 text-red-500" /></div>}
          {icon === 'warning' && <div className="w-20 h-20 rounded-full border-4 border-orange-200 flex items-center justify-center bg-orange-50"><AlertCircle className="w-10 h-10 text-orange-500" /></div>}
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{text}</p>
        <div className="flex gap-2">
          {showCancel && (
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">ยกเลิก</button>
          )}
          <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl font-bold text-lg text-white shadow-lg hover:opacity-90 transition ${icon === 'success' ? 'bg-green-500' : icon === 'error' ? 'bg-red-500' : 'bg-[#66FF00] text-black'}`}>
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
};

export default SweetAlert;