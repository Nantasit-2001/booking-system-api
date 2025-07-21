// server/middleware/authOptional.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "@clerk/backend";

export async function authOptional(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;

  // ถ้าไม่มี token → ข้ามไปเลย (ถือว่า anonymous)
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    (req as any).auth = null;
    return;
  }
  const token = authHeader.split(" ")[1];
  console.log("-0-----------------",token)
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    console.log("----------",payload);
    // แนบ auth ลง req
    (req as any).auth = payload;
  } catch (err) {
    console.log("----------",err);
    // Token ผิด → ไม่ต้อง throw, แค่ถือว่าไม่ login
    (req as any).auth = null;
  }
}
