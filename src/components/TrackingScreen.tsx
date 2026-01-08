import React, { useState } from 'react';
import { Search, Monitor, ArrowLeft, Loader2, Clock, CheckCircle, Wrench, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { APP_ID } from '../config/constants';
import { formatDate } from '../utils/helpers';
import type { Issue } from '../types';
import StatusBadge from './StatusBadge';

interface TrackingScreenProps {
  onBack: () => void;
}

const TrackingScreen: React.FC<TrackingScreenProps> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Issue[] | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setResults(null);
    setSearched(true);
    
    try {
      const issuesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'issues');
      
      // We can't do complex OR queries easily in firestore depending on indexes.
      // Let's try searching by ID first (exact match).
      
      let fetchedIssues: Issue[] = [];
      
      // 1. Search by ID
      const qId = query(issuesRef, where('id', '==', searchTerm.trim()));
      const snapId = await getDocs(qId);
      
      if (!snapId.empty) {
        snapId.forEach(doc => fetchedIssues.push({ docId: doc.id, ...doc.data() } as Issue));
      } else {
        // 2. If not found by ID, try Room (exact match)
        const qRoom = query(issuesRef, where('room', '==', searchTerm.trim()));
        const snapRoom = await getDocs(qRoom);
        snapRoom.forEach(doc => fetchedIssues.push({ docId: doc.id, ...doc.data() } as Issue));
      }
      
      // Sort by date desc
      fetchedIssues.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      
      setResults(fetchedIssues);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <div className="w-full max-w-lg">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 transition">
           <ArrowLeft size={20} /> กลับหน้าหลัก
        </button>
        
        <div className="text-center mb-8">
           <div className="bg-[#66FF00] w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 text-black"><Monitor size={32} /></div>
           <h1 className="text-3xl font-black text-gray-900">ติดตามสถานะแจ้งซ่อม</h1>
           <p className="text-gray-600 mt-2">กรอกรหัสใบแจ้งซ่อม (Ticket ID) หรือ เลขห้องเรียน</p>
        </div>

        <form onSubmit={handleSearch} className="relative mb-8">
           <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
           <input 
             type="text" 
             placeholder="เช่น REQ-1234 หรือ 942" 
             className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-[#66FF00] focus:ring-4 focus:ring-[#66FF00]/20 outline-none text-lg transition shadow-sm"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
           <button 
             type="submit" 
             disabled={loading}
             className="absolute right-2 top-2 bottom-2 bg-black text-[#66FF00] font-bold px-6 rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
           >
             {loading ? <Loader2 className="animate-spin" /> : 'ค้นหา'}
           </button>
        </form>

        <div className="space-y-4">
           {searched && !loading && results?.length === 0 && (
             <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border shadow-sm">
                <AlertCircle size={48} className="mx-auto mb-2 opacity-20" />
                ไม่พบข้อมูล
             </div>
           )}

           {results?.map(issue => (
             <div key={issue.docId} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in-up">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{issue.id}</span>
                      <h3 className="text-xl font-bold text-gray-800 mt-1">ห้อง {issue.room}</h3>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <Clock size={14} /> {formatDate(issue.timestamp)}
                      </div>
                   </div>
                   <StatusBadge status={issue.status} />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl mb-4">
                   <p className="text-gray-800"><span className="font-bold text-xs text-gray-500 uppercase block mb-1">รายละเอียดปัญหา</span>{issue.description}</p>
                </div>

                {issue.status === 'completed' && (
                   <div className="border-t pt-4">
                      <div className="flex items-start gap-3">
                         <div className="bg-green-100 text-green-600 p-2 rounded-lg"><CheckCircle size={20} /></div>
                         <div>
                            <p className="font-bold text-gray-900">ดำเนินการแก้ไขแล้ว</p>
                            <p className="text-sm text-gray-600 mt-1">{issue.solution}</p>
                            <p className="text-xs text-gray-400 mt-2">โดย: {issue.solver} • {issue.resolveTimestamp ? formatDate(issue.resolveTimestamp) : ''}</p>
                         </div>
                      </div>
                   </div>
                )}
                {issue.status === 'in-progress' && (
                   <div className="border-t pt-4">
                      <div className="flex items-start gap-3">
                         <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Wrench size={20} /></div>
                         <div>
                            <p className="font-bold text-gray-900">กำลังดำเนินการ</p>
                            <p className="text-sm text-gray-600 mt-1">เจ้าหน้าที่ได้รับเรื่องแล้วและกำลังดำเนินการแก้ไข</p>
                         </div>
                      </div>
                   </div>
                )}
                {issue.status === 'pending' && (
                   <div className="border-t pt-4">
                      <div className="flex items-start gap-3">
                         <div className="bg-orange-100 text-orange-600 p-2 rounded-lg"><Clock size={20} /></div>
                         <div>
                            <p className="font-bold text-gray-900">รอรับเรื่อง</p>
                            <p className="text-sm text-gray-600 mt-1">อยู่ในคิวการแจ้งซ่อม</p>
                         </div>
                      </div>
                   </div>
                )}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default TrackingScreen;
