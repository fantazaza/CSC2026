import React from 'react';
import { Subject } from '../types';

interface SubjectCardProps {
  subject: Subject;
  icon: React.ReactNode;
  description: string;
  onClick: (subject: Subject) => void;
  disabled?: boolean;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, icon, description, onClick, disabled }) => {
  return (
    <button
      onClick={() => onClick(subject)}
      disabled={disabled}
      className={`
        flex flex-col items-start p-6 rounded-xl border-2 transition-all duration-300 w-full text-left group
        ${disabled 
          ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' 
          : 'bg-white border-gray-100 hover:border-primary-500 hover:shadow-lg hover:-translate-y-1'
        }
      `}
    >
      <div className={`
        p-3 rounded-lg mb-4 transition-colors
        ${disabled ? 'bg-gray-200 text-gray-400' : 'bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white'}
      `}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{subject}</h3>
      <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
    </button>
  );
};

export default SubjectCard;