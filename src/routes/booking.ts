// routes/booking.ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authOptional } from '../middlewares/authMiddleware';

export async function bookingRoutes(fastify: FastifyInstance) {
  
  fastify.delete('/cancelBooking', { preHandler: authOptional }, async (request, reply) => {
  const auth = (request as any).auth;

  if (!auth || !auth.sub) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  try {
    const deleted = await prisma.blocked_room.deleteMany({
      where: { clerk_id: auth.sub },
    });

    return reply.send({
      success: true,
      message: `${deleted.count} booking(s) cancelled.`,
    });
  } catch (err) {
    return reply.status(500).send({ message: 'Server error' });
  }
});


  fastify.post('/blocked_room', { preHandler: authOptional }, async (request, reply) => {
    const auth = (request as any).auth;
    const { room_id, check_in, check_out } = request.body as {
      room_id: number;
      check_in: string;
      check_out: string;
    };
    const user_id = auth.sub;
    const checkIn = new Date(check_in);
    const checkOut = new Date(check_out);
    const now = new Date();

    if (checkIn >= checkOut) {
      return reply.code(400).send({ message: 'Check-in date must be before check-out date.' });
    }

    // ✅ เวลาคัดกรองการจองที่ active → ห้ามเกิน 15 นาที
    const activeThreshold = new Date(now.getTime() - 15 * 60 * 1000); // 15 นาทีที่ผ่านมา

    // ✅ ตรวจสอบ Blocked ที่ยัง valid
    const overlappingBlocked = await prisma.blocked_room.findFirst({
      where: {
        room_id,
        created_at: {
          gte: activeThreshold,
        },
        NOT: {
          clerk_id: user_id,
        },
        OR: [
          {
            AND: [{ check_in: { lte: checkIn } }, { check_out: { gte: checkIn } }],
          },
          {
            AND: [{ check_in: { lte: checkOut } }, { check_out: { gte: checkOut } }],
          },
          {
            AND: [{ check_in: { gte: checkIn } }, { check_out: { lte: checkOut } }],
          },
        ],
      },
    });

    if (overlappingBlocked) {
      return reply.code(409).send({ message: 'This room is currently reserved by someone else (blocked).' });
    }

    // ✅ ตรวจสอบ Reservation ที่จองแล้ว (ยกเว้น Not yet paid)
    const overlappingReservation = await prisma.reservation.findFirst({
      where: {
        room_id,
        status_reservation: {
          notIn: ['Not yet paid', 'canceled']
        },
        OR: [
          {
            AND: [{ check_in: { lte: checkIn } }, { check_out: { gte: checkIn } }],
          },
          {
            AND: [{ check_in: { lte: checkOut } }, { check_out: { gte: checkOut } }],
          },
          {
            AND: [{ check_in: { gte: checkIn } }, { check_out: { lte: checkOut } }],
          },
        ],
      },
    });

    if (overlappingReservation) {
      return reply.code(409).send({ message: 'This room is already reserved (confirmed).' });
    }

    // ✅ Insert Blocked
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