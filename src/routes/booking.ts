// routes/booking.ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authOptional } from '../middlewares/authMiddleware';

export async function bookingRoutes(fastify: FastifyInstance) {
  fastify.post('/blocked_room', { preHandler: authOptional }, async (request, reply) => {
    const auth = (request as any).auth;
    const { room_id, check_in, check_out } = request.body as {
    room_id: number;
    check_in: string;
    check_out: string;
  };
  const user_id = auth.sub
  const checkIn = new Date(check_in);
  const checkOut = new Date(check_out);
  const now = new Date();

  if (checkIn >= checkOut) {
  return reply.code(400).send({ message: 'Check-in date must be before check-out date.' });
}

  // เวลาคัดกรองการจองที่ active → ห้ามเกิน 15 นาที
  const activeThreshold = new Date(now.getTime() - 15 * 60 * 1000); // 15 นาทีที่ผ่านมา

  // ตรวจสอบว่ามีการจองที่ "คาบเกี่ยวกัน" และ "สร้างไม่เกิน 15 นาที"
  const overlapping = await prisma.blocked_room.findFirst({
    where: {
      room_id: room_id,
      created_at: {
        gte: activeThreshold, // จองภายใน 15 นาทีเท่านั้นถึงจะนับ
      },
      NOT: {
      clerk_id: user_id, // ยกเว้นกรณีที่เป็นของผู้ใช้คนเดียวกัน
      },
      OR: [
        {
          AND: [
            { check_in: { lte: checkIn } },
            { check_out: { gte: checkIn } },
          ],
        },
        {
          AND: [
            { check_in: { lte: checkOut } },
            { check_out: { gte: checkOut } },
          ],
        },
        {
          AND: [
            { check_in: { gte: checkIn } },
            { check_out: { lte: checkOut } },
          ],
        },
      
      ],
    },
  });

  if (overlapping) {
    return reply.code(409).send({ message: 'This room is currently reserved by someone else.' });
  }

  // จองได้ → insert
  const created = await prisma.blocked_room.create({
    data: {
      clerk_id: user_id,
      room_id,
      check_in: checkIn,
      check_out: checkOut,
    },
  });

  return reply.code(201).send(created);
});

}
