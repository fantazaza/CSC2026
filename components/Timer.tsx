import React from 'react';

interface TimerProps {
  timeLeft: number;
}

const Timer: React.FC<TimerProps> = ({ timeLeft }) => {
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const getColorClass = () => {
    if (timeLeft < 300) return 'text-red-600 animate-pulse bg-red-50 border-red-200'; // Last 5 mins
    if (timeLeft < 1800) return 'text-orange-600 bg-orange-50 border-orange-200'; // Last 30 mins
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  return (
    <div className={`font-mono text-lg md:text-xl font-bold px-4 py-2 rounded-lg shadow-sm border flex items-center gap-2 transition-colors duration-500 ${getColorClass()}`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span>
        {hours.toString().padStart(2, '0')}:
        {minutes.toString().padStart(2, '0')}:
        {seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
};

export default Timer;