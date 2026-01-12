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
    const qrContent = document.getElementById('qr-code-wrapper')?.innerHTML;
    if (!qrContent) return;

const printWindow = window.open('', '', 'width=800,height=800');
    if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print QR - Room ${activeQRRoom?.name}</title>
              <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;500;700&display=swap" rel="stylesheet">
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  font-family: 'Prompt', sans-serif;
                  background-color: #f7f9fc;
                  /* Optional: Dot pattern background for print preview context */
                  background-image: radial-gradient(#dee2e6 1px, transparent 1px);
                  background-size: 20px 20px;
                }
                .card {
                  background: white;
                  width: 380px;
                  border-radius: 24px;
                  overflow: hidden;
                  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                  border: 2px solid #eee;
                  position: relative;
                  text-align: center;
                }
                .card-header {
                  background: linear-gradient(135deg, #66FF00 0%, #4ae000 100%);
                  padding: 30px 20px;
                  color: #000;
                  position: relative;
                }
                /* Decorative circles */
                .card-header::before {
                    content: '';
                    position: absolute;
                    top: -20px; right: -20px;
                    width: 80px; height: 80px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                }
                .card-header::after {
                    content: '';
                    position: absolute;
                    bottom: 10px; left: 10px;
                    width: 40px; height: 40px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                }
                .app-name {
                  font-size: 1.2rem;
                  font-weight: 700;
                  letter-spacing: 0.5px;
                  margin-bottom: 4px;
                }
                .app-subtitle-en {
                  font-size: 0.75rem;
                  text-transform: uppercase;
                  letter-spacing: 1.5px;
                  opacity: 0.8;
                  font-weight: 500;
                }
                .card-body {
                  padding: 40px 30px;
                }
                .room-badge {
                  display: inline-block;
                  background: #f0f2f5;
                  color: #555;
                  font-size: 0.8rem;
                  font-weight: 700;
                  padding: 6px 16px;
                  border-radius: 20px;
                  margin-bottom: 10px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                }
                .room-number {
                  font-size: 5rem;
                  font-weight: 700;
                  line-height: 1;
                  color: #1a1a1a;
                  margin-bottom: 25px;
                  /* Text Shadow for pop */
                  text-shadow: 2px 2px 0px rgba(102, 255, 0, 0.2);
                }
                .qr-container {
                   background: white;
                   padding: 15px;
                   border-radius: 20px;
                   box-shadow: 0 4px 20px rgba(0,0,0,0.06);
                   display: inline-block;
                   border: 2px dashed #e0e0e0;
                }
                .scan-text {
                   margin-top: 30px;
                   font-size: 1.3rem;
                   font-weight: 700;
                   color: #000;
                }
                .scan-subtext {
                   color: #888;
                   font-size: 0.9rem;
                   font-weight: 500;
                   margin-top: 4px;
                }
                .card-footer {
                   background: #fafafa;
                   padding: 15px;
                   font-size: 0.75rem;
                   color: #999;
                   border-top: 1px solid #eee;
                   font-weight: 500;
                } 
                @media print {
                  body { 
                    background: none; 
                    -webkit-print-color-adjust: exact; 
                  }
                  .card {
                    box-shadow: none;
                    border: 2px solid #ddd;
                  }
                }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="card-header">
                   <div class="app-name">แจ้งซ่อมห้องเรียนอัจฉริยะ</div>
                   <div class="app-subtitle-en">Smart Classroom Service</div>
                </div>
                
                <div class="card-body">
                   <div class="room-badge">ROOM</div>
                   <div class="room-number">${activeQRRoom?.name}</div>
                   
                   <div class="qr-container">
                      ${qrContent}
                   </div>

                   <div class="scan-text">สแกนเพื่อแจ้งซ่อม</div>
                   <div class="scan-subtext">Scan QR to Report Issue</div>
                </div>

                <div class="card-footer">
                    งานประชาสัมพันธ์ (หน่วยโสตทัศนูปกรณ์)
                </div>
              </div>
            </body>
            <script>
               setTimeout(() => {
                  window.print();
                  window.close();
               }, 1000);
            </script>
          </html>
        `);
        printWindow.document.close();
    }
  };

  return (
    <>
    <div className="space-y-6 animate-fade-in">
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
