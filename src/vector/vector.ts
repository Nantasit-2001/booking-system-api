// vector/vector.ts
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // ปิดการตรวจสอบใบรับรอง (เหมาะสำหรับ dev เท่านั้น)
  },
})

// เราจะเชื่อมต่อแค่ตอนแรกของแอปเท่านั้น
export const connectVectorDB = async () => {
  await client.connect()
  console.log("✅ Connected!")
}

export const insertDocument = async (text: string, embedding: number[]) => {
  const sqlEmbeddingString = `[${embedding.join(',')}]`

  await client.query(
    'INSERT INTO documents (text, embedding) VALUES ($1, $2)',
    [text, sqlEmbeddingString]
  )
}

export const deleteDocumentById = async (id: number): Promise<void> => {
  await client.query('DELETE FROM documents WHERE id = $1', [id])
  
}

export const viewDocument = async ()=>{
 const documents = await client.query(
    'SELECT id, text FROM documents'
  )
  return documents.rows
}

export const searchSimilar = async (
  embedding: number[],
  threshold = 0.8,
  limit = 3
) => {
  const sqlEmbeddingString = `[${embedding.join(',')}]`
console.log(threshold)
  const result = await client.query(
    `SELECT id, text, 1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     ORDER BY embedding <-> $1::vector
     LIMIT $2`,
    [sqlEmbeddingString, limit]
  )

  // กรองเฉพาะที่ similarity >= threshold
  const filtered = result.rows.filter((row) => row.similarity >= threshold)
  return filtered
}

