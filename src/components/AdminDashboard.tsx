import React, { useState, useMemo } from 'react';
import { Menu, Monitor } from 'lucide-react';
import { type User } from 'firebase/auth';

// --- Local Imports ---
import type { AdminTab, Issue, Room, Feedback, EquipmentItem } from '../types';
import { getReporterLabel } from '../utils/helpers';
import AdminSidebar from './admin/AdminSidebar';
import StatsPanel from './admin/StatsPanel';
import RoomManager from './admin/RoomManager';
import IssueList from './admin/IssueList';
import MaintenanceLog from './admin/MaintenanceLog';
import FeedbackList from './admin/FeedbackList';
import EquipmentManager from './admin/EquipmentManager';

interface AdminDashboardProps {
  user: User | null;
  issues: Issue[];
  rooms: Room[];
  feedbacks: Feedback[];
  inventory: EquipmentItem[];
  handleLogout: () => void;
  fireAlert: (title: string, text: string, icon: 'success'|'error'|'warning', onConfirm?: (value?: any) => void, showCancel?: boolean, input?: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, issues, rooms, feedbacks, inventory, handleLogout, fireAlert }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  // Stats Logic
  const statsData = useMemo(() => {
    const stats: any = { daily: {}, monthly: {}, yearly: {}, byCategory: {}, byReporter: {} };
    issues.forEach(i => {
      // Exclude Admin from stats (Internal Maintenance)
      if (!i.timestamp || i.reporterType === 'admin') return;
      const d = new Date(i.timestamp.seconds * 1000);
      const day = d.toLocaleDateString('th-TH');
      const month = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      const year = d.getFullYear().toString();
      
      stats.daily[day] = (stats.daily[day] || 0) + 1;
      stats.monthly[month] = (stats.monthly[month] || 0) + 1;
      stats.yearly[year] = (stats.yearly[year] || 0) + 1;
      
      stats.byCategory[i.category] = (stats.byCategory[i.category] || 0) + 1;
      const rep = getReporterLabel(i.reporterType);
      stats.byReporter[rep] = (stats.byReporter[rep] || 0) + 1;
    });
    const fmt = (o: any) => Object.entries(o).map(([label, value]: any) => ({ label, value }));
    const sortedDaily = fmt(stats.daily).slice(0, 7); 
    
    // Calculate Total Budget
    const totalBudget = issues.reduce((sum, issue) => {
        if (issue.usedItems) {
            const issueCost = issue.usedItems.reduce((s, item) => s + (item.quantity * item.pricePerUnit), 0);
            return sum + issueCost;
        }
        return sum;
    }, 0);

    return { daily: sortedDaily, monthly: fmt(stats.monthly), yearly: fmt(stats.yearly), byCategory: fmt(stats.byCategory), byReporter: fmt(stats.byReporter), totalBudget };
  }, [issues]);

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col md:flex-row">
      <div className="md:hidden bg-white p-4 border-b flex justify-between items-center sticky top-0 z-40 shadow-sm">
         <div className="flex items-center gap-2 text-black font-bold text-lg">
            {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" /> : <div className="bg-[#66FF00] p-1.5 rounded text-black"><Monitor size={20} /></div>}
            {user?.displayName || 'Admin'}
         </div>
         <button onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
      </div>

      <AdminSidebar
        user={user}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        handleLogout={handleLogout}
      />

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
         {adminTab === 'dashboard' && <StatsPanel statsData={statsData} />}
         {adminTab === 'issues' && <IssueList issues={issues} fireAlert={fireAlert} inventory={inventory} rooms={rooms} />}
         {adminTab === 'rooms' && <RoomManager rooms={rooms} fireAlert={fireAlert} />}
         {adminTab === 'maintenance' && <MaintenanceLog issues={issues} fireAlert={fireAlert} />}
         {adminTab === 'feedbacks' && <FeedbackList feedbacks={feedbacks} fireAlert={fireAlert} />}
         {adminTab === 'inventory' && <EquipmentManager inventory={inventory} fireAlert={fireAlert} totalUsedBudget={statsData.totalBudget} />}
      </main>
    </div>
  );
};

export default React.memo(AdminDashboard);
