import React, { useState } from 'react';
import { Package, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { APP_ID } from '../../config/constants';
import type { EquipmentItem } from '../../types';

interface EquipmentManagerProps {
  inventory: EquipmentItem[];
  fireAlert: (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: (value?: any) => void, showCancel?: boolean, input?: string) => void;
}

const EquipmentManager: React.FC<EquipmentManagerProps> = ({ inventory, fireAlert }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState<number>(0);

  const handleEdit = (item: EquipmentItem) => {
    setEditingId(item.id);
    setName(item.name);
    setUnit(item.unit);
    setQuantity(item.quantity);
    setShowForm(true);
  };

  const resetForm = () => {
    setName('');
    setUnit('');
    setQuantity(0);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim()) {
      fireAlert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อและหน่วยนับ', 'warning');
      return;
    }

    try {
      const data = { name: name.trim(), unit: unit.trim(), quantity: Number(quantity) };
      
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', editingId), data);
        fireAlert('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อย', 'success');
      } else {
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory'), data);
        fireAlert('สำเร็จ', 'เพิ่มรายการเรียบร้อย', 'success');
      }
      resetForm();
    } catch (error) {
      console.error(error);
      fireAlert('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    fireAlert('ยืนยัน', `ต้องการลบ ${name} หรือไม่?`, 'warning', async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', id));
        fireAlert('สำเร็จ', 'ลบข้อมูลเรียบร้อย', 'success');
      } catch (error) {
         fireAlert('ผิดพลาด', 'ลบข้อมูลไม่สำเร็จ', 'error');
      }
    }, true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Package /> จัดการสต็อกอุปกรณ์ (Inventory)</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold px-4 py-2 rounded-lg transition">
            <Plus size={20} /> เพิ่มรายการใหม่
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 animate-fade-in-up">
           <h3 className="font-bold text-lg mb-4 text-gray-800">{editingId ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">ชื่ออุปกรณ์</label>
                 <input type="text" className="w-full border rounded-lg px-3 py-2" value={name} onChange={e => setName(e.target.value)} placeholder="เช่น ปากกาไวท์บอร์ด" />
              </div>
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">หน่วยนับ</label>
                 <input type="text" className="w-full border rounded-lg px-3 py-2" value={unit} onChange={e => setUnit(e.target.value)} placeholder="เช่น ด้าม, แท่ง" />
              </div>
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนคงเหลือ</label>
                 <input type="number" min="0" className="w-full border rounded-lg px-3 py-2" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} />
              </div>
           </div>
           <div className="flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg flex items-center gap-1"><X size={18} /> ยกเลิก</button>
              <button type="submit" className="px-4 py-2 bg-[#66FF00] text-black font-bold rounded-lg hover:bg-[#5ce600] flex items-center gap-1"><Save size={18} /> บันทึก</button>
           </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs">
              <tr>
                <th className="px-6 py-3">ชื่ออุปกรณ์</th>
                <th className="px-6 py-3 text-center">จำนวนคงเหลือ</th>
                <th className="px-6 py-3 text-center">หน่วยนับ</th>
                <th className="px-6 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {inventory.map(item => (
                 <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-800">{item.name}</td>
                    <td className={`px-6 py-4 text-center font-mono font-bold ${item.quantity === 0 ? 'text-red-500' : 'text-green-600'}`}>{item.quantity}</td>
                    <td className="px-6 py-4 text-center">{item.unit}</td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                       </div>
                    </td>
                 </tr>
               ))}
               {inventory.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">ไม่มีข้อมูลในสต็อก</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EquipmentManager;
