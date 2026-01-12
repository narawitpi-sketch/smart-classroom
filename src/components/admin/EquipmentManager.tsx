import React, { useState } from 'react';
import { Package, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { APP_ID } from '../../config/constants';
import type { EquipmentItem } from '../../types';

// ... imports

interface EquipmentManagerProps {
  inventory: EquipmentItem[];
  fireAlert: (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: (value?: any) => void, showCancel?: boolean, input?: string) => void;
  totalUsedBudget: number;
}

const EquipmentManager: React.FC<EquipmentManagerProps> = ({ inventory, fireAlert, totalUsedBudget }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);

  const handleEdit = (item: EquipmentItem) => {
    setEditingId(item.id);
    setName(item.name);
    setUnit(item.unit);
    setQuantity(item.quantity);
    setPricePerUnit(item.pricePerUnit || 0);
    setShowForm(true);
  };

  const resetForm = () => {
    setName('');
    setUnit('');
    setQuantity(0);
    setPricePerUnit(0);
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
      const data = { 
        name: name.trim(), 
        unit: unit.trim(), 
        quantity: Number(quantity),
        pricePerUnit: Number(pricePerUnit)
      };
      
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

  // ... handleDelete ...
  // ... handleDelete ...
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

  const handleExportCSV = () => {
    if (!inventory.length) return;
    const header = "\uFEFFชื่ออุปกรณ์,จำนวนคงเหลือ,หน่วยนับ,ราคาต่อหน่วย (บาท),มูลค่ารวม (บาท)\n"; // BOM for Excel
    const rows = inventory.map(item => {
        const totalValue = (item.quantity * (item.pricePerUnit || 0));
        return `"${item.name}",${item.quantity},"${item.unit}",${item.pricePerUnit || 0},${totalValue}`;
    }).join("\n");

    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Package /> จัดการสต็อกอุปกรณ์ (Inventory)</h1>
        <div className="flex gap-2">
            {!showForm && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#66FF00] hover:bg-[#5ce600] text-black font-bold px-4 py-2 rounded-lg transition">
                <Plus size={20} /> เพิ่มรายการใหม่
            </button>
            )}
            <button onClick={handleExportCSV} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg transition">
                <Edit size={18} className="rotate-90" /> Export CSV
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
          <div>
              <h3 className="text-gray-500 font-medium mb-1">งบประมาณที่ใช้ไปรวม (อุปกรณ์ที่เบิกซ่อม)</h3>
              <p className="text-3xl font-bold text-red-500">{totalUsedBudget.toLocaleString()} ฿</p>
          </div>
          <div className="text-right text-xs text-gray-400">
             คำนวนจาก: (จำนวนที่เบิก x ราคาต้นทุน) ของงานซ่อมที่สำเร็จแล้ว
          </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 animate-fade-in-up">
           <h3 className="font-bold text-lg mb-4 text-gray-800">{editingId ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h3>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-2">
                 <label className="block text-sm font-bold text-gray-700 mb-1">ชื่ออุปกรณ์</label>
                 <input type="text" className="w-full border rounded-lg px-3 py-2" value={name} onChange={e => setName(e.target.value)} placeholder="เช่น ปากกาไวท์บอร์ด" />
              </div>
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">หน่วยนับ</label>
                 <input type="text" className="w-full border rounded-lg px-3 py-2" value={unit} onChange={e => setUnit(e.target.value)} placeholder="เช่น ด้าม, แท่ง, ก้อน" />
              </div>
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">ราคา/หน่วย (บาท)</label>
                 <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2" value={pricePerUnit} onChange={e => setPricePerUnit(parseFloat(e.target.value) || 0)} placeholder="0.00" />
              </div>
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนคงเหลือ</label>
                 <input type="number" min="0" className="w-full border rounded-lg px-3 py-2" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} />
              </div>
           </div>
           
           <div className="text-sm text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
              💡 <b>Tip:</b> ควรกำหนดหน่วยเป็นหน่วยย่อยที่สุด (เช่น "ก้อน" แทนที่จะเป็นแพ็ค) เพื่อให้การตัดสต็อกแม่นยำ
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
                <th className="px-6 py-3 text-right">ราคา/หน่วย</th>
                <th className="px-6 py-3 text-center">คงเหลือ</th>
                <th className="px-6 py-3 text-center">หน่วยนับ</th>
                <th className="px-6 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {inventory.map(item => (
                 <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-800">{item.name}</td>
                    <td className="px-6 py-4 text-right">{item.pricePerUnit ? item.pricePerUnit.toLocaleString() : '-'} ฿</td>
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
               {inventory.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">ไม่มีข้อมูลในสต็อก</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EquipmentManager;
