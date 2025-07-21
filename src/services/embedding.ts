// src/services/embedding.ts
import { pipeline } from '@xenova/transformers'

let extractor: any = null

export const loadModel = async () => {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/bge-m3')
  }
  return extractor
}

export const embedText = async (text: string): Promise<number[]> => {
  const model = await loadModel()
  const output = await model(text, { pooling: 'mean', normalize: true })

  // ✅ กรณี output.data = [[...]] → ดึง index 0
  const vector = Array.isArray(output.data) && Array.isArray(output.data[0])
    ? output.data[0]
    : output.data

  return Array.from(vector)  // เพื่อให้แน่ใจว่าเป็น number[]
}
