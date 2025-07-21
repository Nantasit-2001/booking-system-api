// src/routes/rag.ts
import { FastifyPluginAsync } from 'fastify'
import { embedText } from '../services/embedding'
import { searchSimilar,insertDocument,viewDocument,deleteDocumentById } from '../vector/vector'
import { generateAnswerFromGemini } from '../lib/gemini'
import { analyzeQuestionIntent } from '../lib/gemini-intent'
import { getAllRoomsFromDB,checkRoomAvailability,checkAllRoomAvailability,getUserBookings,   } from '../lib/query'
import { prisma } from '../lib/prisma';
import { authOptional } from '../middlewares/authMiddleware'
import dayjs from 'dayjs'

export type Message = {
  id: number
  text: string
  sender: 'user' | 'bot'
}

const ragRoute: FastifyPluginAsync = async (fastify) => {


fastify.get('/doc', async (request, reply) => {
  try {
    const res = await viewDocument() // ✅ เรียกฟังก์ชันด้วย ()
    return reply.send(res)
  } catch (err) {
    console.error('❌ Error fetching documents:', err)
    return reply.status(500).send({ error: 'Failed to fetch documents' })
  }
})

  fastify.post('/add-doc', async (request, reply) => {
    const { text } = request.body as { text: string }

    const embedding = await embedText(text)
    await insertDocument(text, embedding)

    return { message: 'Document inserted successfully' }
})

fastify.delete('/doc/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  try {
    await deleteDocumentById(parseInt(id))
    return reply.send({ message: "Deleted successfully" })
  } catch (err) {
    console.error("Delete error:", err)
    return reply.status(500).send({ error: "Failed to delete document" })
  }
})


  fastify.post('/query', async (request, reply) => {
    const { question } = request.body as { question: string }

    const questionEmbedding = await embedText(question)
    const similarDocs = await searchSimilar(questionEmbedding, 0.8, 5)

if (typeof similarDocs === "string") {
  return reply.send({ message: similarDocs }) // ไม่พบ
}

return reply.send({
  question,
  results: similarDocs,
})
  })

fastify.post('/ask', { preHandler: authOptional }, async (request, reply) => {
  const { question,message } = request.body as { question: string ,message: Message[]}
  const auth = (request as any).auth;
  const userClerk = auth?.sub
  try {
    const intentInfo = await analyzeQuestionIntent(question,message)

    let usedContext: string[] = []
    console.log(intentInfo.intent,"-----------------------first----------------------")
    console.log("intentInfo.need_context_from_documents: ",intentInfo.need_context_from_documents)
    if (intentInfo.intent.list_rooms) {
      const rooms = await getAllRoomsFromDB()

      usedContext.push("นี้คือข้อมูลห้องพัก :"+JSON.stringify(rooms, null, 2))
    }

    if (intentInfo.intent.check_room_availability) {
      let { room_name, start_date, end_date } = intentInfo.required_params

      const today = dayjs().format('YYYY-MM-DD')
      start_date = start_date || today
      end_date = end_date || dayjs(today).add(3, 'month').format('YYYY-MM-DD')
      if (!room_name) {
       const { availableRooms, unavailableRooms }= await checkAllRoomAvailability(start_date, end_date)
        usedContext.push( `ชื่อห้องที่ว่างและไม่ว่างในช่วง ${start_date} ถึง ${end_date}:\n\n` + JSON.stringify({ availableRooms,unavailableRooms, start_date, end_date, }, null, 2))
      }else{
        const { reservations } = await checkRoomAvailability(room_name, start_date, end_date)
        usedContext.push( `ข้อมูลชุดนี้คือข้อมูลห้องพักที่ว่าง ในช่วง ${start_date} ถึง ${end_date}:\n\n` + JSON.stringify({ room_name, start_date, end_date, reservations}, null, 2))
      }
    }

    if (intentInfo.intent.get_my_reservations) {
      if (!userClerk){
        usedContext.push("ผู้ใช้ยังไม่ login (ตอบแค่คำถามที่ไม่ต้อง login)")
      }else{
        const myBookings = await getUserBookings(userClerk)
        usedContext.push(JSON.stringify(myBookings, null, 2))
      }
    }

    if (intentInfo.need_context_from_documents) {
      const embedding = await embedText(question)
      const contexts = await searchSimilar(embedding, 0.65, 6)
      let info:string[]
      if (contexts.length === 0) {
        info = ['No relevant information was found in the database.']
      }else{
        info = contexts.map((c) => c.text)
      }
      usedContext.push("ข้อมูลโรงแรมของที่เกี่ยวข้องกับคำถาม: "+info)
    }

    // ส่ง context ให้ LLM ตอบกลับเสมอ
    console.log(usedContext,"-----------------------end------------------ agent")
    const answer = await generateAnswerFromGemini(question,message, usedContext, intentInfo.language)
    return reply.send({ question, answer })

  } catch (error:any) {
    console.log(error)
    if (error.message.includes('503') || error.message.includes('model is overloaded')) {
    return reply.send({
      question,
      answer: 'Gemini service unavailable after retries.😵🙏',
    })
  }
  if (error.message.includes('429') || error.message.includes('model is overloaded')) {
    return reply.send({
      question,
      answer: 'Gemini has exceeded its limits.❌🔒',
    })
  }
    console.error('❌ /ask error', error)
    return reply.status(500).send({ error: '❌An error occurred while processing the question.' })
  }
})

}

export default ragRoute
