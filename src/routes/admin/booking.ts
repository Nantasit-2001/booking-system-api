// server/routes/adminBooking.ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';

export default async function adminBookingRoutes(fastify: FastifyInstance) {
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
    const activeReservations = await prisma.reservation.count({
      where: {
        NOT: {
          status_reservation: 'canceled',
        },
      },
    });
    const occupancyRate = totalRooms > 0 ? (activeReservations / totalRooms) * 100 : 0;

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
}
