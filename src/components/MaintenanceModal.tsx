import React, { useState, useEffect } from 'react';
import { X, Save, Wrench, User } from 'lucide-react';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { solver: string; solution: string; equipment: string }) => Promise<void>;
  defaultSolver?: string;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, onSubmit, defaultSolver }) => {
  const [solver, setSolver] = useState('');
  const [solution, setSolution] = useState('');
  const [equipment, setEquipment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSolver(defaultSolver || '');
      setSolution('');
      setEquipment('');
    }
  }, [isOpen, defaultSolver]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solver.trim() || !solution.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        solver: solver.trim(),
        solution: solution.trim(),
        equipment: equipment.trim()
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Wrench className="text-[#66FF00]" size={20} /> บันทึกผลการซ่อม
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User size={14} /> ผู้ดำเนินการซ่อม <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none transition"
              placeholder="ระบุชื่อผู้ซ่อม / ช่าง"
              value={solver}
              onChange={e => setSolver(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Wrench size={14} /> รายละเอียดการแก้ไข <span className="text-red-500">*</span>
            </label>
            <textarea 
              required
              rows={3}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none transition resize-none"
              placeholder="ทำอะไรไปบ้าง... (เช่น เปลี่ยนหลอดไฟ, เชื่อมต่อสายใหม่)"
              value={solution}
              onChange={e => setSolution(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Wrench size={14} /> อุปกรณ์ที่ใช้ (ถ้ามี)
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none transition"
              placeholder="เช่น หลอดไฟ LED 1 หลอด, สาย LAN 2 เมตร"
              value={equipment}
              onChange={e => setEquipment(e.target.value)}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#66FF00] text-black font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'กำลังบันทึก...' : <><Save size={18} /> บันทึกและปิดงาน</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModal;
