import React, { useState, useCallback, useEffect } from 'react';
import { Subject, QuizState, GameScreen, ScoreRecord } from './types';
import { generateQuizQuestions, generateFullExam } from './services/geminiService';
import SubjectCard from './components/SubjectCard';
import QuizCard from './components/QuizCard';
import LoadingSpinner from './components/LoadingSpinner';
import Scoreboard from './components/Scoreboard';
import Timer from './components/Timer';

const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('MENU');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: {},
    pinnedIndices: [],
    score: 0,
    isFinished: false,
    isLoading: false,
    error: null,
    mode: 'PRACTICE',
    timeLeft: 0,
    isReviewing: false
  });

  const [showCurrentResult, setShowCurrentResult] = useState(false);

  // Helper to save score
  const saveScoreData = (finalScore: number, totalQuestions: number, questions: any[], userAnswers: any, currentMode: 'PRACTICE' | 'FULL_EXAM' | 'CHALLENGE', currentSubject: Subject) => {
    let details = undefined;
    
    // Calculate breakdown for Full Exam / Challenge
    if (currentMode === 'FULL_EXAM' || currentMode === 'CHALLENGE') {
        let analyticalScore = 0;
        let englishScore = 0;
        let lawScore = 0;

        questions.forEach((q: any, idx: number) => {
            if (userAnswers[idx] === q.correctAnswerIndex) {
                if (q.category === Subject.GENERAL || q.category === Subject.THAI) analyticalScore++;
                else if (q.category === Subject.ENGLISH) englishScore++;
                else if (q.category === Subject.LAW) lawScore++;
            }
        });
        details = {
            analytical: analyticalScore,
            english: englishScore,
            law: lawScore
        };
    }

    const newRecord: ScoreRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mode: currentMode,
      subject: currentSubject || Subject.GENERAL, 
      score: finalScore,
      total: totalQuestions,
      details: details
    };

    const existingHistory = localStorage.getItem('gorpor_score_history');
    const history = existingHistory ? JSON.parse(existingHistory) : [];
    history.push(newRecord);
    localStorage.setItem('gorpor_score_history', JSON.stringify(history));
  };

  // Timer Effect
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    
    if (quizState.mode === 'CHALLENGE' && !quizState.isFinished && !quizState.isLoading && screen === 'QUIZ') {
        timer = setInterval(() => {
            setQuizState(prev => {
                if (prev.timeLeft <= 0) {
                    clearInterval(timer);
                    
                    // Time Up Logic: Auto submit
                    // Calculate score based on current answers
                    let score = 0;
                    prev.questions.forEach((q, idx) => {
                      if (prev.userAnswers[idx] === q.correctAnswerIndex) {
                        score++;
                      }
                    });
                    
                    saveScoreData(score, prev.questions.length, prev.questions, prev.userAnswers, prev.mode, subject!);

                    return {
                        ...prev,
                        isFinished: true,
                        timeLeft: 0,
                        score: score
                    };
                }
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizState.mode, quizState.isFinished, quizState.isLoading, screen, subject]); 

  // --- Handlers ---

  const handleStartQuiz = async (selectedSubject: Subject) => {
    setSubject(selectedSubject);
    
    const isFullExam = selectedSubject === Subject.FULL_MOCK;
    const isChallenge = selectedSubject === Subject.CHALLENGE;
    const mode = isChallenge ? 'CHALLENGE' : (isFullExam ? 'FULL_EXAM' : 'PRACTICE');
    
    // Challenge Mode: 3 Hours = 10800 seconds
    const initialTime = isChallenge ? 3 * 60 * 60 : 0; 

    setQuizState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      mode: mode,
      timeLeft: initialTime,
      isReviewing: false,
      pinnedIndices: []
    }));
    
    setScreen('QUIZ');
    
    try {
      let questions;
      if (isFullExam || isChallenge) {
        questions = await generateFullExam();
      } else {
        questions = await generateQuizQuestions(selectedSubject, 5);
      }

      setQuizState({
        questions,
        currentQuestionIndex: 0,
        userAnswers: {},
        pinnedIndices: [],
        score: 0,
        isFinished: false,
        isLoading: false,
        error: null,
        mode: mode,
        timeLeft: initialTime,
        isReviewing: false
      });
      setShowCurrentResult(false);
    } catch (error) {
      setQuizState(prev => ({
        ...prev,
        isLoading: false,
        error: "ไม่สามารถสร้างข้อสอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง หรือตรวจสอบ API Key"
      }));
    }
  };

  const handleAnswer = useCallback((choiceIndex: number) => {
    setQuizState(prev => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [prev.currentQuestionIndex]: choiceIndex
      }
    }));
    // Only show immediate result in PRACTICE mode
    if (quizState.mode === 'PRACTICE') {
      setShowCurrentResult(true);
    }
  }, [quizState.mode]);

  const handleTogglePin = useCallback(() => {
    setQuizState(prev => {
      const currentIndex = prev.currentQuestionIndex;
      const isPinned = prev.pinnedIndices.includes(currentIndex);
      return {
        ...prev,
        pinnedIndices: isPinned 
          ? prev.pinnedIndices.filter(i => i !== currentIndex)
          : [...prev.pinnedIndices, currentIndex]
      };
    });
  }, []);

  const handleJumpToQuestion = (index: number) => {
    setQuizState(prev => ({
      ...prev,
      currentQuestionIndex: index,
      isReviewing: false
    }));
    setShowCurrentResult(false); // Reset result view if moving around in Practice (though practice usually reveals instantly)
  };

  const submitExam = useCallback(() => {
    setQuizState(prev => {
        let score = 0;
        prev.questions.forEach((q, idx) => {
          if (prev.userAnswers[idx] === q.correctAnswerIndex) {
            score++;
          }
        });

        saveScoreData(score, prev.questions.length, prev.questions, prev.userAnswers, prev.mode, subject!);
        
        return {
          ...prev,
          score,
          isFinished: true,
          isReviewing: false
        };
    });
    setScreen('RESULT');
  }, [subject]);

  const handleNextQuestion = useCallback(() => {
    setQuizState(prev => {
      const isLastQuestion = prev.currentQuestionIndex === prev.questions.length - 1;
      
      if (isLastQuestion) {
        // If Practice Mode, just finish.
        if (prev.mode === 'PRACTICE') {
             // For practice, we can just finish immediately as usual
             // But to be consistent with user request "When last question, show review", let's apply review for all modes or just Exam?
             // User said "Make it 100 questions... Show review at the end". Usually for Practice (5 items) it's annoying.
             // Let's enable review only if items > 5 or specific request. 
             // But the request implies the pin/skip feature is general. Let's do it for all.
             return { ...prev, isReviewing: true };
        }

        // For Full Exam / Challenge, show review screen before submitting
        return {
          ...prev,
          isReviewing: true,
        };
      }

      return {
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      };
    });
    
    if (quizState.mode === 'PRACTICE') {
       if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
          setShowCurrentResult(false);
       }
    } 
  }, [quizState.questions, quizState.currentQuestionIndex, quizState.mode]);

  const handleRestart = () => {
    setScreen('MENU');
    setSubject(null);
    setQuizState({
        questions: [],
        currentQuestionIndex: 0,
        userAnswers: {},
        pinnedIndices: [],
        score: 0,
        isFinished: false,
        isLoading: false,
        error: null,
        mode: 'PRACTICE',
        timeLeft: 0,
        isReviewing: false
    });
  };

  // --- Renders ---

  const renderMenu = () => (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          ติวสอบ <span className="text-primary-600">ก.พ. 69</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
          เตรียมความพร้อมสู่การเป็นข้าราชการ ด้วยแบบทดสอบเสมือนจริงจาก AI 
          (Gemini 2.5) ครอบคลุมเนื้อหาล่าสุด
        </p>
        <button 
          onClick={() => setScreen('SCOREBOARD')}
          className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
        >
          <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ดูประวัติคะแนน (Scoreboard)
        </button>
      </div>

      {quizState.error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded shadow-sm">
          <p className="text-sm text-red-700">{quizState.error}</p>
        </div>
      )}

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Full Mock */}
        <button
          onClick={() => handleStartQuiz(Subject.FULL_MOCK)}
          className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 group text-left"
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                 <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded uppercase backdrop-blur-sm">Classic</span>
                 <h2 className="text-2xl font-bold">จำลองการสอบจริง</h2>
              </div>
              <p className="text-purple-100 text-sm mb-4">
              (คิดวิเคราะห์, อังกฤษ, กฎหมาย) ไม่จำกัดเวลา เน้นการทำความเข้าใจ
              </p>
              <div className="flex items-center text-xs font-semibold bg-white/10 w-fit px-3 py-1 rounded-full">
                 <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                 100 ข้อ
              </div>
          </div>
        </button>

        {/* Challenge Mode */}
        <button
          onClick={() => handleStartQuiz(Subject.CHALLENGE)}
          className="relative overflow-hidden bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 group text-left"
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                 <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded uppercase shadow-sm">HARDCORE</span>
                 <h2 className="text-2xl font-bold">Challenge Mode</h2>
              </div>
              <p className="text-red-100 text-sm mb-4">
                เสมือนสอบจริง 100 ข้อ จับเวลา 3 ชั่วโมง! ทดสอบความเร็วและความแม่นยำ
              </p>
              <div className="flex items-center text-xs font-semibold bg-white/10 w-fit px-3 py-1 rounded-full">
                 <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 3 ชั่วโมง
              </div>
          </div>
        </button>
      </div>

      <h3 className="text-xl font-bold text-gray-800 mb-6 pl-2 border-l-4 border-primary-500">ฝึกฝนรายวิชา (Practice Mode)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SubjectCard
          subject={Subject.GENERAL}
          description="อนุกรม, เงื่อนไขสัญลักษณ์, เงื่อนไขภาษา, คณิตศาสตร์ทั่วไป, การวิเคราะห์ข้อมูล (ตาราง/สดมภ์)"
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          onClick={handleStartQuiz}
        />
        <SubjectCard
          subject={Subject.THAI}
          description="การเรียงประโยค, การเลือกใช้คำ, บทความสั้น, บทความยาว, หลักภาษา"
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>}
          onClick={handleStartQuiz}
        />
        <SubjectCard
          subject={Subject.ENGLISH}
          description="Conversation, Vocabulary, Grammar, Reading Comprehension, Structure"
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M9 10a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          onClick={handleStartQuiz}
        />
        <SubjectCard
          subject={Subject.LAW}
          description="ระเบียบบริหารราชการแผ่นดิน, วิธีปฏิบัติราชการทางปกครอง, ละเมิด, จริยธรรม, กิจการบ้านเมืองที่ดี"
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
          onClick={handleStartQuiz}
        />
      </div>
      
      <div className="mt-12 text-center text-sm text-gray-400">
        Powered by Google Gemini 2.5 Flash | ข้อสอบถูกสร้างขึ้นใหม่ทุกครั้งเพื่อการฝึกฝน
      </div>
    </div>
  );

  const renderReviewScreen = () => {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4">
         <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">ตรวจสอบคำตอบ (Review)</h2>
            
            <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm">
                <div className="flex items-center gap-2"><span className="w-4 h-4 bg-primary-500 rounded-sm"></span> ทำแล้ว</div>
                <div className="flex items-center gap-2"><span className="w-4 h-4 bg-yellow-400 rounded-sm"></span> ปักหมุด</div>
                <div className="flex items-center gap-2"><span className="w-4 h-4 bg-gray-200 rounded-sm"></span> ยังไม่ทำ</div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 mb-10">
                {quizState.questions.map((_, index) => {
                    const isAnswered = quizState.userAnswers[index] !== undefined;
                    const isPinned = quizState.pinnedIndices.includes(index);
                    
                    let bgClass = 'bg-gray-100 text-gray-500 hover:bg-gray-200';
                    if (isPinned) bgClass = 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400 hover:bg-yellow-200';
                    else if (isAnswered) bgClass = 'bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100';

                    return (
                        <button 
                            key={index}
                            onClick={() => handleJumpToQuestion(index)}
                            className={`aspect-square rounded-lg font-bold text-sm flex items-center justify-center transition-all ${bgClass}`}
                        >
                            {index + 1}
                            {isPinned && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                        </button>
                    )
                })}
            </div>

            <div className="flex justify-center gap-4">
                <button 
                    onClick={() => handleJumpToQuestion(quizState.currentQuestionIndex)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                    กลับไปทำต่อ
                </button>
                <button 
                    onClick={submitExam}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold shadow-lg hover:bg-green-700 hover:shadow-xl transition-all"
                >
                    ยืนยันส่งคำตอบ
                </button>
            </div>
         </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (quizState.isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      );
    }

    if (!quizState.questions || quizState.questions.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center flex-col">
            <p className="text-gray-500 mb-4">ไม่พบข้อสอบ</p>
            <button onClick={handleRestart} className="px-4 py-2 bg-primary-600 text-white rounded">กลับหน้าหลัก</button>
        </div>
      );
    }

    // Check if showing review screen
    if (quizState.isReviewing) {
        return renderReviewScreen();
    }

    const currentQ = quizState.questions[quizState.currentQuestionIndex];
    const isLastQ = quizState.currentQuestionIndex === quizState.questions.length - 1;

    // Check if user is done (either finished via timer or manual finish)
    if (quizState.isFinished && screen === 'QUIZ') {
         // Force transition if stuck
         return (
             <div className="min-h-screen flex items-center justify-center bg-red-50">
                 <div className="text-center p-8">
                     <h2 className="text-3xl font-bold text-red-600 mb-4">หมดเวลา! (Time's Up)</h2>
                     <p className="mb-6 text-gray-700">ระบบได้ส่งคำตอบของคุณเรียบร้อยแล้ว</p>
                     <button onClick={() => setScreen('RESULT')} className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold">
                         ดูผลสอบ
                     </button>
                 </div>
             </div>
         )
    }

    return (
      <div className="min-h-screen flex flex-col items-center py-8 px-4 relative">
        {/* Top Bar */}
        <div className="w-full max-w-3xl flex justify-between items-center mb-6">
            <button onClick={handleRestart} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="hidden sm:inline">ยกเลิก</span>
            </button>
            
            <div className="flex items-center gap-3">
                 <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide
                  ${quizState.mode === 'CHALLENGE' ? 'bg-red-100 text-red-800' : 
                    (quizState.mode === 'FULL_EXAM' ? 'bg-purple-100 text-purple-800' : 'bg-primary-100 text-primary-800')}
                `}>
                    {subject === Subject.FULL_MOCK ? 'FULL EXAM' : (subject === Subject.CHALLENGE ? 'CHALLENGE' : subject)}
                </span>
                
                {/* Timer Display for Challenge Mode */}
                {quizState.mode === 'CHALLENGE' && (
                    <Timer timeLeft={quizState.timeLeft} />
                )}
            </div>
        </div>

        <QuizCard
          question={currentQ}
          questionNumber={quizState.currentQuestionIndex + 1}
          totalQuestions={quizState.questions.length}
          onAnswer={handleAnswer}
          selectedChoice={quizState.userAnswers[quizState.currentQuestionIndex]}
          showResult={showCurrentResult}
          isPinned={quizState.pinnedIndices.includes(quizState.currentQuestionIndex)}
          onTogglePin={handleTogglePin}
        />

        <div className="w-full max-w-3xl mt-6 flex justify-between items-center">
             <div className="text-sm text-gray-400">
                {quizState.pinnedIndices.length > 0 && (
                    <span className="text-yellow-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/></svg>
                        ปักหมุด {quizState.pinnedIndices.length} ข้อ
                    </span>
                )}
             </div>

             {/* Navigation */}
             <div className="flex gap-3">
                 {/* Show Review Button if not in Practice or if we want to allow jumping */}
                 {quizState.mode !== 'PRACTICE' && (
                    <button 
                        onClick={() => setQuizState(prev => ({...prev, isReviewing: true}))}
                        className="px-4 py-3 text-gray-600 hover:text-primary-600 font-medium text-sm"
                    >
                        ดูภาพรวม
                    </button>
                 )}

                 {(quizState.mode !== 'PRACTICE' || showCurrentResult) && (
                    <button
                    onClick={handleNextQuestion}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2"
                    >
                    {isLastQ ? 'ตรวจสอบและส่ง' : 'ข้อต่อไป'}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                 )}
             </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    // Recalculate score logic for display
    let finalScore = 0;
    let analyticalScore = 0;
    let englishScore = 0;
    let lawScore = 0;

    quizState.questions.forEach((q, idx) => {
        const isCorrect = quizState.userAnswers[idx] === q.correctAnswerIndex;
        if (isCorrect) {
            finalScore++;
            if (q.category === Subject.GENERAL || q.category === Subject.THAI) analyticalScore++;
            else if (q.category === Subject.ENGLISH) englishScore++;
            else if (q.category === Subject.LAW) lawScore++;
        }
    });
    
    const percentage = (finalScore / quizState.questions.length) * 100;
    const isPassed = percentage >= 60;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-lg w-full text-center border border-gray-100">
                <div className="mb-6">
                     {isPassed ? (
                         <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-short">
                             <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         </div>
                     ) : (
                        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                     )}
                     
                     <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        {isPassed ? 'สอบผ่าน!' : 'ยังไม่ผ่านเกณฑ์'}
                     </h2>
                     <p className="text-gray-500">
                        {isPassed ? 'คะแนนรวมเกิน 60% คุณมีความพร้อมสูงมาก' : 'ต้องการอีกนิดเพื่อถึง 60% สู้ต่อไป!'}
                     </p>
                     {quizState.mode === 'CHALLENGE' && (
                       <div className="mt-2 text-sm text-red-500 font-semibold uppercase tracking-wider">
                         Challenge Mode Completed
                       </div>
                     )}
                </div>

                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <div className="text-sm text-gray-500 mb-1">คะแนนรวม</div>
                    <div className="text-5xl font-extrabold text-primary-600">
                        {finalScore} <span className="text-2xl text-gray-400 font-normal">/ {quizState.questions.length}</span>
                    </div>
                </div>

                {/* Breakdown for Full Exam / Challenge */}
                {(quizState.mode === 'FULL_EXAM' || quizState.mode === 'CHALLENGE') && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8 text-left">
                    <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">คะแนนรายวิชา</h3>
                    <div className="space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span className="text-gray-600">การคิดวิเคราะห์ (คณิต/ไทย)</span>
                         <span className="font-bold">{analyticalScore} / 50</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-600">ภาษาอังกฤษ</span>
                         <span className="font-bold">{englishScore} / 25</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-600">ความรู้และลักษณะข้าราชการฯ</span>
                         <span className="font-bold">{lawScore} / 25</span>
                       </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                     <button 
                        onClick={() => setScreen('SCOREBOARD')}
                        className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-colors shadow-sm"
                    >
                        ดู Scoreboard
                    </button>
                    <button 
                        onClick={() => handleStartQuiz(subject!)}
                        className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-primary-500/30"
                    >
                        สอบใหม่อีกครั้ง
                    </button>
                    <button 
                        onClick={handleRestart}
                        className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-semibold transition-colors"
                    >
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
        {screen === 'MENU' && renderMenu()}
        {screen === 'QUIZ' && renderQuiz()}
        {screen === 'RESULT' && renderResult()}
        {screen === 'SCOREBOARD' && <Scoreboard onBack={() => setScreen('MENU')} />}
    </div>
  );
};

export default App;
