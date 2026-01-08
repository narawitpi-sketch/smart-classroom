import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { Monitor, Plus, Trash2, QrCode, X, Printer } from 'lucide-react';
import QRCode from 'react-qr-code';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { APP_ID } from '../../config/constants';
import type { Room } from '../../types';

interface RoomManagerProps {
  rooms: Room[];
  fireAlert: (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: (value?: any) => void, showCancel?: boolean, input?: string) => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ rooms, fireAlert }) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [activeQRRoom, setActiveQRRoom] = useState<Room | null>(null);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const sanitizedRoomName = DOMPurify.sanitize(newRoomName.trim());
    if (!sanitizedRoomName) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms'), { name: sanitizedRoomName });
      setNewRoomName('');
      fireAlert('เพิ่มห้องสำเร็จ', `เพิ่มห้อง ${sanitizedRoomName} เรียบร้อยแล้ว`, 'success');
    } catch (error) { fireAlert('ผิดพลาด', 'ไม่สามารถเพิ่มห้องได้', 'error'); }
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    fireAlert('ยืนยันลบห้อง', `ต้องการลบห้อง ${roomName} ใช่หรือไม่?`, 'warning', async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'rooms', roomId));
        fireAlert('ลบสำเร็จ', `ห้อง ${roomName} ถูกลบเรียบร้อยแล้ว`, 'success');
      } catch (error) {
        fireAlert('ผิดพลาด', 'ลบห้องไม่สำเร็จ', 'error');
      }
    }, true);
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '', 'width=600,height=600');
    if (printWindow) {
        printWindow.document.write('<html><head><title>Print QR</title></head><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">');
        printWindow.document.write(`<h1 style="font-size:3rem;margin-bottom:1rem;">Room ${activeQRRoom?.name}</h1>`);
        printWindow.document.write(document.getElementById('qr-code-svg')?.outerHTML || '');
        printWindow.document.write('<p style="margin-top:1rem;color:#666;">Scan to Report Issue</p>');
        printWindow.document.write('<script>window.print();window.close();</script></body></html>');
        printWindow.document.close();
    }
  };

  return (
    <>
    <div className="max-w-2xl mx-auto space-y-6">
       <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Monitor /> จัดการห้องเรียน</h1>
       <form onSubmit={handleAddRoom} className="bg-white p-6 rounded-xl shadow-sm border flex gap-4 items-end">
          <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">ชื่อห้อง / เลขห้อง</label><input type="text" placeholder="เช่น 942" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#66FF00] outline-none" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} /></div>
          <button type="submit" className="bg-[#66FF00] text-black font-bold px-6 py-2.5 rounded-lg hover:opacity-90 flex items-center gap-2"><Plus size={20} /> เพิ่มห้อง</button>
       </form>
       <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b font-medium text-gray-700">รายชื่อห้องทั้งหมด ({rooms.length})</div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
             {rooms.map(room => (
                <div key={room.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                    <span className="font-bold text-gray-800 text-lg">{room.name}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setActiveQRRoom(room)} className="text-gray-500 hover:text-black p-2 rounded hover:bg-gray-200" title="QR Code"><QrCode size={18} /></button>
                        <button onClick={() => handleDeleteRoom(room.id, room.name)} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50"><Trash2 size={18} /></button>
                    </div>
                </div>
             ))}
             {rooms.length === 0 && <div className="p-8 text-center text-gray-400">ยังไม่มีข้อมูลห้องเรียน</div>}
          </div>
       </div>
    </div>

    {activeQRRoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center relative">
                <button onClick={() => setActiveQRRoom(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                <div className="p-8 flex flex-col items-center">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Room {activeQRRoom.name}</h3>
                    <p className="text-gray-500 mb-6 text-sm">แสกนเพื่อแจ้งซ่อม {activeQRRoom.name}</p>
                    <div className="bg-white p-4 rounded-xl border-2 border-[#66FF00] mb-6" id="qr-code-wrapper">
                        <QRCode 
                            id="qr-code-svg"
                            value={`${window.location.origin}/?room=${encodeURIComponent(activeQRRoom.name)}`}
                            size={200}
                        />
                    </div>
                    <button onClick={handlePrintQR} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-2 rounded-lg transition"><Printer size={18} /> ปริ้นท์ QR Code</button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default RoomManager;
