// server/routes/myroom.ts
import { authOptional } from '../middlewares/authMiddleware';
import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
export async function myroomRoutes(fastify: FastifyInstance) {
    fastify.get('/', { preHandler: authOptional }, async (request, reply) => {
    const auth = (request as any).auth;
  try {
    const clerk_id = auth?.sub;
    if (!clerk_id) return reply.code(401).send({ error: 'Unauthorized' });

    const bookings = await prisma.reservation.findMany({
      where: { clerk_id }, // เฉพาะคนที่ login
      orderBy: { check_in: 'desc' },
      select: {
        id: true,
        status_reservation: true,
        check_in: true,
        check_out: true,
        total_price: true,
        paid_amount: true,
        rooms: {
          select: {
            room_name: true,
            room_type: true,
            url_picture: true,
          },
        },
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return reply.code(200).send(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
});
}