import React, { useState } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import type { EquipmentItem } from '../types';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { solver: string; solution: string; equipment: string }) => void;
  inventory: EquipmentItem[];
}

interface SelectedItem {
  id: string; // generated id for UI key
  inventoryId: string;
  name: string;
  quantity: number;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, onSubmit, inventory }) => {
  const [solver, setSolver] = useState('');
  const [solution, setSolution] = useState('');
  
  // New State for Inventory
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [otherEquipment, setOtherEquipment] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { id: Math.random().toString(), inventoryId: '', name: '', quantity: 1 }]);
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof SelectedItem, value: string | number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        if (field === 'inventoryId') {
           const inv = inventory.find(i => i.id === value);
           return { ...item, inventoryId: value as string, name: inv?.name || '', unit: inv?.unit || '' };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct equipment string
    const parts = selectedItems
        .filter(i => i.name)
        .map(i => `${i.name} (${i.quantity})`)
    
    if (otherEquipment.trim()) {
        parts.push(`อื่นๆ: ${otherEquipment.trim()}`);
    }

    onSubmit({
      solver,
      solution,
      equipment: parts.join(', ') || 'ไม่มีการใช้อุปกรณ์'
    });

    // Reset
    setSolver('');
    setSolution('');
    setSelectedItems([]);
    setOtherEquipment('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">บันทึกผลการซ่อม</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">ผู้ดำเนินการซ่อม</label>
            <input type="text" required className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none" placeholder="เช่น นายสมชาย ใจดี" value={solver} onChange={e => setSolver(e.target.value)} />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">วิธีการแก้ไข</label>
            <textarea required rows={3} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none" placeholder="รายละเอียดการซ่อม..." value={solution} onChange={e => setSolution(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">รายการอุปกรณ์ที่ใช้</label>
            <div className="space-y-2 mb-2">
               {selectedItems.map((item) => (
                 <div key={item.id} className="flex gap-2 items-center">
                    <select 
                        className="flex-1 px-3 py-2 border rounded-lg bg-white"
                        value={item.inventoryId}
                        onChange={e => handleItemChange(item.id, 'inventoryId', e.target.value)}
                        required
                    >
                        <option value="">-- เลือกอุปกรณ์ --</option>
                        {inventory.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.name} (คงเหลือ: {inv.quantity} {inv.unit})</option>
                        ))}
                    </select>
                    <input 
                        type="number" 
                        min="1" 
                        className="w-20 px-3 py-2 border rounded-lg text-center"
                        value={item.quantity} 
                        onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={18} /></button>
                 </div>
               ))}
            </div>
            <button type="button" onClick={handleAddItem} className="text-sm text-[#66FF00] hover:text-[#5ce600] font-bold flex items-center gap-1"><Plus size={16} /> โบกรายการ</button>
          </div>

          <div>
             <label className="block text-sm font-bold text-gray-700 mb-1">อื่นๆ / หมายเหตุ (ถ้ามี)</label>
             <textarea rows={2} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#66FF00] outline-none" placeholder="ระบุอุปกรณ์อื่นๆ ที่ไม่มีในรายการ หรือหมายเหตุเพิ่มเติม..." value={otherEquipment} onChange={e => setOtherEquipment(e.target.value)} />
          </div>

          <button type="submit" className="w-full bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold py-3 rounded-xl shadow-md transition flex justify-center items-center gap-2 mt-4">
            <Save size={20} /> บันทึกและปิดงาน
          </button>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModal;
