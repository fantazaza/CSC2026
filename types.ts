export enum Subject {
  GENERAL = 'ความสามารถทั่วไป (คณิต/ตรรกะ)',
  THAI = 'ภาษาไทย',
  ENGLISH = 'ภาษาอังกฤษ',
  LAW = 'ความรู้และลักษณะการเป็นข้าราชการที่ดี',
  FULL_MOCK = 'จำลองการสอบจริง (100 ข้อ)',
  CHALLENGE = 'Challenge Mode (3 ชั่วโมง)'
}

export interface Question {
  id: string;
  text: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation: string;
  category: Subject; // Track which category this question belongs to
}

export interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<number, number>; // questionIndex -> choiceIndex
  score: number;
  isFinished: boolean;
  isLoading: boolean;
  error: string | null;
  mode: 'PRACTICE' | 'FULL_EXAM' | 'CHALLENGE';
  timeLeft: number; // Remaining time in seconds
}

export interface ScoreRecord {
  id: string;
  date: string;
  mode: 'PRACTICE' | 'FULL_EXAM' | 'CHALLENGE';
  subject: Subject;
  score: number;
  total: number;
  details?: {
    analytical: number;
    english: number;
    law: number;
  };
}

export type GameScreen = 'MENU' | 'QUIZ' | 'RESULT' | 'SCOREBOARD';