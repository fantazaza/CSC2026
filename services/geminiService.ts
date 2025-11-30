import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Subject, Question } from '../types';

// Define the response schema for the quiz generation
const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "The question text in Thai.",
          },
          choices: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 4 possible answers in Thai.",
          },
          correctAnswerIndex: {
            type: Type.INTEGER,
            description: "The index (0-3) of the correct answer.",
          },
          explanation: {
            type: Type.STRING,
            description: "A detailed explanation in Thai of why the answer is correct.",
          },
          svg: {
            type: Type.STRING,
            description: "Optional: SVG xml string (starting with <svg) for geometry, graphs, or visual logic. Max size 300x300. Return null if not needed.",
          },
        },
        required: ["text", "choices", "correctAnswerIndex", "explanation"],
      },
    },
  },
  required: ["questions"],
};

const getSubjectGuidelines = (subject: Subject): string => {
  switch (subject) {
    case Subject.GENERAL:
      return `Include a mix of:
      1. Number Series (อนุกรม) - complex patterns.
      2. General Math (คณิตศาสตร์ทั่วไป) - percentage, ratio, probability, equation. *Important: If a question involves Geometry (shapes) or Data Analysis (Charts/Graphs), YOU MUST PROVIDE THE 'svg' FIELD with valid SVG code to visualize it.*
      3. Logical Reasoning (เงื่อนไขสัญลักษณ์/เงื่อนไขภาษา) - ensure logic is strictly valid.
      4. Data Analysis (ตารางข้อมูล) - simple interpretation.`;
    case Subject.THAI:
      return `Include a mix of:
      1. Sentence Ordering (เรียงประโยค).
      2. Reading Comprehension (บทความสั้น/ยาว) - finding main idea or inference.
      3. Grammar/Word Usage (การเลือกใช้คำ/คำราชาศัพท์/คำเชื่อม).`;
    case Subject.ENGLISH:
      return `Include a mix of:
      1. Conversation/Dialogues.
      2. Grammar (Tenses, If-clause, Prepositions).
      3. Vocabulary (Synonyms/Antonyms in context).
      4. Reading Comprehension.`;
    case Subject.LAW:
      return `Strictly cover these official OCSC Law topics:
      1. State Administration Act (พรบ.ระเบียบบริหารราชการแผ่นดิน).
      2. Good Governance Decree (พรฎ.ว่าด้วยหลักเกณฑ์และวิธีการบริหารกิจการบ้านเมืองที่ดี).
      3. Administrative Procedure Act (วิธีปฏิบัติราชการทางปกครอง).
      4. Tort Liability of Officials (ความรับผิดทางละเมิดของเจ้าหน้าที่).
      5. Ethical Standards (ประมวลจริยธรรม).
      6. Civil Service Act (พรบ.ระเบียบข้าราชการพลเรือน).`;
    default:
      return "";
  }
};

// Internal helper to fetch a small batch of questions
const fetchBatch = async (subject: Subject, count: number, ai: GoogleGenAI): Promise<Question[]> => {
    const prompt = `
      You are an expert tutor for the Thailand OCSC (Gor Por) Exam (Year 2569).
      Create EXACTLY ${count} multiple-choice questions for the subject: "${subject}".
      
      Target Audience: University graduates taking the government service entrance exam.
      Language: Thai (Strictly).
      Format: JSON.
      
      Specific Guidelines for "${subject}":
      ${getSubjectGuidelines(subject)}
      
      Requirements:
      1. Questions must be realistic and match the official OCSC exam difficulty.
      2. Choices must be plausible (distractors should be tricky).
      3. Explanation must be detailed and educational.
      4. If the question requires a visual aid (especially Math/Logic), provide a clean, simple SVG string in the 'svg' field.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        thinkingConfig: { thinkingBudget: 1024 }, // Reduced slightly for stability/speed
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No data received from AI.");
    }

    const parsedData = JSON.parse(jsonText);
    
    // Transform and sanitize
    return parsedData.questions.map((q: any, index: number) => ({
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: q.text,
      choices: q.choices,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation,
      category: subject,
      svg: (q.svg && q.svg !== 'null' && q.svg.trim() !== '') ? q.svg : undefined
    }));
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateQuizQuestions = async (subject: Subject, count: number = 5): Promise<Question[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const BATCH_SIZE = 5; // Fetch in small chunks to avoid timeout/payload errors
  const questions: Question[] = [];
  const totalBatches = Math.ceil(count / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const remaining = count - questions.length;
    const currentBatchSize = Math.min(remaining, BATCH_SIZE);
    
    let attempts = 0;
    let success = false;

    // Retry mechanism
    while (attempts < 3 && !success) {
      try {
        const batch = await fetchBatch(subject, currentBatchSize, ai);
        questions.push(...batch);
        success = true;
      } catch (error) {
        console.warn(`Batch ${i + 1}/${totalBatches} for ${subject} failed (Attempt ${attempts + 1}). Retrying...`, error);
        attempts++;
        if (attempts >= 3) {
            // If we have some questions, maybe we can proceed, but for strictness let's throw
            // or we could just break and return partial results.
            // Let's throw to ensure the user gets what they asked for, or a clear error.
             console.error(`Failed to fetch batch after 3 attempts.`);
             throw error;
        }
        await delay(1500 * attempts); // Exponential backoff-ish
      }
    }
    
    // Small delay between batches to be gentle on the API
    if (i < totalBatches - 1) await delay(500);
  }

  // Ensure we return exactly the requested amount
  return questions.slice(0, count);
};

export const generateFullExam = async (): Promise<Question[]> => {
  try {
    // Run subjects in parallel, but inside each subject, requests are sequential (batched).
    // This creates 4 concurrent streams, which is safe for browsers (limit is usually 6).
    const [mathQuestions, thaiQuestions, englishQuestions, lawQuestions] = await Promise.all([
      generateQuizQuestions(Subject.GENERAL, 25),
      generateQuizQuestions(Subject.THAI, 25),
      generateQuizQuestions(Subject.ENGLISH, 25),
      generateQuizQuestions(Subject.LAW, 25)
    ]);

    return [
      ...mathQuestions,
      ...thaiQuestions,
      ...englishQuestions,
      ...lawQuestions
    ];
  } catch (error) {
    console.error("Error generating full exam:", error);
    throw new Error("Failed to generate the full exam. Please try again.");
  }
};