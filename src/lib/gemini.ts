// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Message } from '../routes/agent'
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const generateAnswerFromGemini = async (
  question: string,
  message:Message[],
  contexts: string[],
  language: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' })

  const prompt = `
คุณคือพนักงานตอบคำถาม(เพศหญิง)ของระบบจองห้องพักของโรงแรม Ease Hotel(มีอยู่ที่เดียว) โดยต้องตอบด้วยภาษามนุษย์ โดยใช้ภาษา: ${language} (ตัวย่อตามมหลักสากร) ที่สุภาพ เป็นกันเอง และเข้าใจง่าย
- ถ้าข้อมูลในคำถามไม่ครบ หรือไม่สามารถให้ข้อมูลได้ ให้ตอบกลับอย่างสุภาพว่า "ยังไม่สามารถให้ข้อมูลได้ เพราะ..."
- ถ้าข้อมูลในคำถามครบ และมีข้อมูลในระบบ ให้ตอบกลับผู้ใช้ตามข้อมูลที่มี 
- ถ้าเข้าพักเกินจำนวนสูงสุดของห้อง อาจต้องจ่ายค่าเตียงเสริม

ข้อมูลจากระบบ:
${contexts.join('\n\n')}

ประวัติการคุย "${message}"
คำถามของผู้ใช้:
${question}

คำตอบที่สุภาพและเข้าใจง่าย:
`


  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  return text
}
