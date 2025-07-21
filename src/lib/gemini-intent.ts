// src/lib/gemini-intent.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Message } from '../routes/agent'
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const analyzeQuestionIntent = async (
  question: string,
  message: Message[]
): Promise<{
  language: 'th' | 'en'
   intent: {
    list_rooms: boolean
    check_room_availability: boolean
    get_my_reservations: boolean
  }
  db: string | null
  required_params: Record<string, string | null>
  need_context_from_documents: boolean
}> => {
  const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' })

  const prompt = `
คุณคือระบบวิเคราะห์คำถาม เพื่อตอบกลับในรูปแบบ JSON เพื่อนำไปดึงข้อมูลว่าต้องใช้ข้อมูลอะไรบ้างเพื่อให้ llm อีกตัวตอบคำถามพวกนี้ได้ โดยไม่อธิบายเพิ่ม

ประวัติการคุย "${message}"
คำถามล่าสุด: "${question}"

ตอบกลับใน JSON:
{
  "language": "th" หรือ "en" หรือภาษาอื่นๆที่ได้รับเข้ามา
  "intent"(เป็น boolean เป็นtrueเมื่อต้องการข้อมูลนั้นๆ):{
    "list_rooms" (เพื่อดึงข้อมูลห้องพักในโรงแรม ซึ่งมีข้อมูล 1.ชื่อห้อง 2.ชนิดห้องพัก 3.ราคาแต่ละห้อง 4.จำนวนคนพักสูงสุดแต่ละห้อง)
    ,"check_room_availability"(ตรวจสอบห้องว่าง),
    "get_my_reservations"(ตรวจสอบห้องที่ user เคยจอง)
  }
  "db": "documents | rooms | reservation | null",
  "required_params": { "room_name": null, "start_date": null, "end_date": null },
  "need_context_from_documents": true หรือ false (ในกรณีที่เป็นข้อมูลที่เกี่ยวกับนโยบาย หรือ ข้อมูลทางโรงแรม เช่นเบอร์ติดต่อหรือเบอร์โทร)
}
กรุณาตอบกลับเป็น JSON เปล่าเท่านั้น โดยไม่มีเครื่องหมาย \`\`\` หรือ Markdown ใดๆ`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const json = await response.text()

  return JSON.parse(json)
}
