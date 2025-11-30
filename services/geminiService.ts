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

export const generateQuizQuestions = async (subject: Subject, count: number = 5): Promise<Question[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please check your environment configuration.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
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
        thinkingConfig: { thinkingBudget: 2048 },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No data received from AI.");
    }

    const parsedData = JSON.parse(jsonText);
    
    // Transform to our internal type and add IDs
    let questions = parsedData.questions.map((q: any, index: number) => ({
      id: `q-${Date.now()}-${subject}-${index}`,
      text: q.text,
      choices: q.choices,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation,
      category: subject,
      svg: q.svg || undefined
    }));

    // Enforce strict count limit
    if (questions.length > count) {
      questions = questions.slice(0, count);
    }

    return questions;

  } catch (error) {
    console.error(`Error generating quiz for ${subject}:`, error);
    throw error;
  }
};

export const generateFullExam = async (): Promise<Question[]> => {
  // According to user request:
  // 1. Analytical Thinking (50 items) -> We split this into 25 Math/Logic (General) + 25 Thai
  // 2. English (25 items)
  // 3. Law (25 items)
  // Total 100 items.

  try {
    // Run requests in parallel to speed up generation
    const [mathQuestions, thaiQuestions, englishQuestions, lawQuestions] = await Promise.all([
      generateQuizQuestions(Subject.GENERAL, 25),
      generateQuizQuestions(Subject.THAI, 25),
      generateQuizQuestions(Subject.ENGLISH, 25),
      generateQuizQuestions(Subject.LAW, 25)
    ]);

    // Combine all questions
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
