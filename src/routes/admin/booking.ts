// server/routes/adminBooking.ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';
import { FastifyRequest, FastifyReply } from 'fastify';

export default async function adminBookingRoutes(fastify: FastifyInstance) {
fastify.get('/', async (request, reply) => {
  try {
    const bookings = await prisma.reservation.findMany({
      orderBy: { check_in: 'desc' },
      select: {
        id: true,
        room_id: true,
        status_reservation: true,
        check_in: true,
        check_out: true,
        total_price: true,
        paid_amount: true,
        note: true,
        phone_number: true,
        rooms: {
          select: {
            room_name: true,
            room_type: true,
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
    console.error('Error fetching reservations:', error);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
});

  
  fastify.get('/infoAdmin', async () => {
    // 1. total booking (ไม่นับ canceled และ checkout)
    const totalBooking = await prisma.reservation.count({
      where: {
        NOT: {
          status_reservation: {
            in: ['canceled', 'checkout'], // หรือเปลี่ยนเป็น "cancelled", "completed" ตาม DB จริง
          },
        },
      },
    });

    // 2. total room
    const totalRooms = await prisma.rooms.count();

    // 3. occupancy rate (จำนวน booking ที่ไม่ถูกยกเลิก / ห้องทั้งหมด)
    // นับจำนวนทั้งหมดใน reservation (ทุกสถานะ)
const totalReservations = await prisma.reservation.count();

// นับเฉพาะที่ไม่ถูกยกเลิก
const activeReservations = await prisma.reservation.count({
  where: {
    NOT: {
      status_reservation: 'canceled',
    },
  },
});

// คำนวณ occupancy rate
const occupancyRate = totalReservations > 0 
  ? (activeReservations / totalReservations) * 100 
  : 0;


    // 4. pending reservations
    const pendingCount = await prisma.reservation.count({
      where: {
        status_reservation: 'pending',
      },
    });

    // 5. revenue from paid_amount
    const revenueResult = await prisma.reservation.aggregate({
      _sum: {
        paid_amount: true,
      },
    });
    const revenue = revenueResult._sum.paid_amount ?? 0;

    return {
      totalBooking,
      totalRooms,
      occupancyRate: occupancyRate.toFixed(2) + '%',
      pendingCount,
      revenue: revenue.toFixed(2),
    };
  });

fastify.patch('/update-status', async (request, reply) => {
  const { id, status } = request.body as { id: string; status: string };

  // ตรวจสอบเองแบบ manual
  if (!id || !status) {
    return reply.status(400).send({ message: 'Invalid request data' });
  }
  try {
    const updated = await prisma.reservation.update({
      where: { id: Number(id) },
      data: { status_reservation: status },
      select: { status_reservation: true },
    });

    return reply.send({ status: updated.status_reservation });
  } catch (err) {
    console.error('Failed to update status:', err);
    return reply.status(500).send({ message: 'Server error' });
  }
});

fastify.patch('/update-paid', async (request, reply) => {
  const { id, amount } = request.body as { id: string; amount: number };

  if (!id || isNaN(Number(id)) || isNaN(amount) || amount <= 0) {
    return reply.status(400).send({ message: 'Invalid input' });
  }

  try {
    const existing = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      select: { paid_amount: true },
    });

    const currentPaid = Number(existing?.paid_amount ?? 0); // ✅ แปลง Decimal เป็น number
    const newPaidAmount = currentPaid + amount;

    const updated = await prisma.reservation.update({
      where: { id: Number(id) },
      data: {
        paid_amount: newPaidAmount,
        status_reservation: 'pending',
      },
      select: {
        paid_amount: true,
        status_reservation: true,
      },
    });

    return reply.send(updated);
  } catch (err) {
    console.error('Error updating payment:', err);
    return reply.status(500).send({ message: 'Server error' });
  }
});

fastify.delete('/deleteOrCancel/:id', async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  const booking = await prisma.reservation.findUnique({ where: { id: Number(id) } });

  if (!booking) {
    return reply.code(404).send({ message: 'Booking not found' });
  }

  if (booking.status_reservation === 'Not yet paid') {
    await prisma.reservation.delete({ where: { id: Number(id) } });
    return reply.send({ action: 'deleted' }); // 🔁 เปลี่ยนตรงนี้
  } else {
    await prisma.reservation.update({
      where: { id: Number(id) },
      data: { status_reservation: 'canceled' },
    });
    return reply.send({ action: 'canceled' }); // 🔁 เปลี่ยนตรงนี้
  }
});


}