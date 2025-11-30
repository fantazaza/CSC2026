import React, { useEffect, useState } from 'react';
import { ScoreRecord, Subject } from '../types';

interface ScoreboardProps {
  onBack: () => void;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ onBack }) => {
  const [history, setHistory] = useState<ScoreRecord[]>([]);

  useEffect(() => {
    const storedHistory = localStorage.getItem('gorpor_score_history');
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        // Sort by date descending
        parsed.sort((a: ScoreRecord, b: ScoreRecord) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistory(parsed);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const clearHistory = () => {
    if(confirm('คุณต้องการลบประวัติการสอบทั้งหมดใช่หรือไม่?')) {
      localStorage.removeItem('gorpor_score_history');
      setHistory([]);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('th-TH', options);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          กลับหน้าหลัก
        </button>
        <h1 className="text-3xl font-bold text-gray-800">ประวัติคะแนนสอบ (Scoreboard)</h1>
        <button 
          onClick={clearHistory}
          className="text-sm text-red-500 hover:text-red-700 underline"
        >
          ล้างประวัติ
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p className="text-gray-500 text-lg">ยังไม่มีประวัติการสอบ</p>
          <p className="text-gray-400 text-sm">เริ่มทำข้อสอบเพื่อสะสมคะแนน!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => (
            <div key={record.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide 
                      ${record.mode === 'FULL_EXAM' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {record.mode === 'FULL_EXAM' ? 'จำลองสอบจริง' : 'ฝึกฝน'}
                    </span>
                    <span className="text-gray-500 text-sm">{formatDate(record.date)}</span>
                  </div>
                  <h3 className="font-bold text-lg text-gray-800">
                    {record.subject === Subject.FULL_MOCK ? 'สอบครบทุกวิชา (100 ข้อ)' : record.subject}
                  </h3>
                </div>

                <div className="flex items-center gap-6">
                  {record.details && (
                    <div className="hidden md:flex flex-col text-xs text-gray-500 text-right">
                       <span>วิเคราะห์: {record.details.analytical}/50</span>
                       <span>อังกฤษ: {record.details.english}/25</span>
                       <span>กม.และขรก: {record.details.law}/25</span>
                    </div>
                  )}
                  <div className="text-center min-w-[80px]">
                    <div className={`text-3xl font-extrabold ${(record.score / record.total) >= 0.6 ? 'text-green-600' : 'text-red-500'}`}>
                      {record.score}
                    </div>
                    <div className="text-xs text-gray-400 uppercase font-medium">คะแนนรวม ({record.total})</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Scoreboard;