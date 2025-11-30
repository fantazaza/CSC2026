import React, { useState } from 'react';
import { Question } from '../types';

interface QuizCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (choiceIndex: number) => void;
  selectedChoice: number | undefined;
  showResult: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
}

const QuizCard: React.FC<QuizCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  selectedChoice,
  showResult,
  isPinned,
  onTogglePin
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

  // If we move to a new question, hide explanation
  React.useEffect(() => {
    setShowExplanation(false);
  }, [question.id]);

  const getChoiceClass = (index: number) => {
    const baseClass = "w-full p-4 rounded-lg border-2 text-left transition-all duration-200 flex items-center mb-3 group relative overflow-hidden";
    
    if (!showResult) {
      return selectedChoice === index
        ? `${baseClass} border-primary-500 bg-primary-50 text-primary-900 ring-1 ring-primary-500`
        : `${baseClass} border-gray-200 hover:border-primary-300 hover:bg-gray-50`;
    }

    if (index === question.correctAnswerIndex) {
      return `${baseClass} border-green-500 bg-green-50 text-green-900 font-medium`;
    }

    if (selectedChoice === index && index !== question.correctAnswerIndex) {
      return `${baseClass} border-red-500 bg-red-50 text-red-900`;
    }

    return `${baseClass} border-gray-100 opacity-60`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
      {/* Header / Progress */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          คำถามที่ {questionNumber} / {totalQuestions}
        </span>
        
        {/* Pin Button */}
        <button 
          onClick={onTogglePin}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${isPinned ? 'bg-yellow-100 text-yellow-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
        >
           <svg className={`w-5 h-5 ${isPinned ? 'fill-yellow-500' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
           </svg>
           {isPinned ? 'ปักหมุดแล้ว' : 'ปักหมุด'}
        </button>
      </div>

      <div className="p-6 md:p-8">
        {/* Question Text */}
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 leading-relaxed">
          {question.text}
        </h2>

        {/* SVG Image (if present) */}
        {question.svg && (
          <div className="mb-8 flex justify-center">
            <div 
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-inner"
              dangerouslySetInnerHTML={{ __html: question.svg }} 
            />
          </div>
        )}

        {/* Choices */}
        <div className="space-y-2">
          {question.choices.map((choice, index) => (
            <button
              key={index}
              onClick={() => !showResult && onAnswer(index)}
              disabled={showResult}
              className={getChoiceClass(index)}
            >
              <span className={`
                w-8 h-8 flex items-center justify-center rounded-full mr-4 text-sm font-bold border shrink-0
                ${showResult && index === question.correctAnswerIndex ? 'bg-green-500 text-white border-green-500' : ''}
                ${showResult && selectedChoice === index && index !== question.correctAnswerIndex ? 'bg-red-500 text-white border-red-500' : ''}
                ${!showResult && selectedChoice === index ? 'bg-primary-500 text-white border-primary-500' : 'bg-white border-gray-300 text-gray-500 group-hover:border-primary-400 group-hover:text-primary-600'}
              `}>
                {['ก', 'ข', 'ค', 'ง'][index]}
              </span>
              <span className="flex-1">{choice}</span>
              
              {/* Status Icons */}
              {showResult && index === question.correctAnswerIndex && (
                 <svg className="w-6 h-6 text-green-600 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              )}
              {showResult && selectedChoice === index && index !== question.correctAnswerIndex && (
                 <svg className="w-6 h-6 text-red-600 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </button>
          ))}
        </div>

        {/* Explanation Section */}
        {showResult && (
          <div className="mt-8 animate-fade-in">
             <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <div className="flex items-start gap-3">
                   <div className="mt-1 bg-blue-100 p-2 rounded-lg text-blue-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <div>
                      <h4 className="font-bold text-blue-900 mb-1">เฉลยและคำอธิบาย</h4>
                      <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-line">{question.explanation}</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizCard;
