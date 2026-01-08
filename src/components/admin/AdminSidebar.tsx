import React from 'react';
import { 
  X, 
  LayoutGrid, 
  FileText, 
  Monitor, 
  ClipboardList, 
  ClipboardCheck, 
  LogOut,
  Package
} from 'lucide-react';
import { type User } from 'firebase/auth';
import type { AdminTab } from '../../types';

interface AdminSidebarProps {
  user: User | null;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  handleLogout: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  user, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  adminTab, 
  setAdminTab, 
  handleLogout 
}) => {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
       <div className="h-full flex flex-col">
          <div className="md:hidden p-4 flex justify-end"><button onClick={() => setIsSidebarOpen(false)}><X size={20} /></button></div>
          <div className="p-6 border-b flex items-center gap-3 hidden md:flex">
             <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-300">
                {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-black text-[#66FF00] font-bold text-xl">{user?.displayName?.charAt(0) || 'A'}</div>}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user?.displayName || 'Admin'}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
             </div>
          </div>
          <nav className="flex-1 p-4 space-y-2">
             <button onClick={() => { setAdminTab('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'dashboard' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><LayoutGrid size={20} /> ภาพรวม</button>
             <button onClick={() => { setAdminTab('issues'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'issues' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><FileText size={20} /> รายการแจ้งซ่อม</button>
             <button onClick={() => { setAdminTab('rooms'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'rooms' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><Monitor size={20} /> จัดการห้องเรียน</button>
             <button onClick={() => { setAdminTab('inventory'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'inventory' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><Package size={20} /> จัดการสต็อก</button>
             <button onClick={() => { setAdminTab('maintenance'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'maintenance' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><ClipboardList size={20} /> สรุปการซ่อม</button>
             <button onClick={() => { setAdminTab('feedbacks'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${adminTab === 'feedbacks' ? 'bg-[#66FF00]/20 text-green-900 font-semibold border-l-4 border-[#66FF00]' : 'text-gray-600 hover:bg-gray-50'}`}><ClipboardCheck size={20} /> ผลการประเมิน</button>
          </nav>
          <div className="p-4 border-t"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-600 transition text-sm"><LogOut size={16} /> ออกจากระบบ</button></div>
       </div>
    </aside>
  );
};

export default AdminSidebar;
