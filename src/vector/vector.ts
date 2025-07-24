// vector/vector.ts
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})


export const insertDocument = async (text: string, embedding: number[]) => {
  const sqlEmbeddingString = `[${embedding.join(',')}]`

  await pool.query(
    'INSERT INTO documents (text, embedding) VALUES ($1, $2)',
    [text, sqlEmbeddingString]
  )
}

export const deleteDocumentById = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM documents WHERE id = $1', [id])
  
}

export const viewDocument = async ()=>{
 const documents = await pool.query(
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
  const result = await pool.query(
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

