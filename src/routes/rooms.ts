import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
export default async function roomsRoutes(fastify: FastifyInstance) {
  // GET /rooms

fastify.get('/type', async () => {
    // ดึงเฉพาะห้องที่ available และ type ไม่ซ้ำกัน
    const rooms = await prisma.rooms.findMany({
        where: { room_status: 'available' },
        orderBy: { id: 'asc' },
        distinct: ['room_type'],
    });
    return rooms;
});

fastify.get('/show', async () => {
    // ดึงเฉพาะห้องที่ available และ type ไม่ซ้ำกัน
    const rooms = await prisma.rooms.findMany({
        where: { room_status: 'available' },
        orderBy: { id: 'asc' },
        distinct: ['room_type']
    });
    // แปลงข้อมูลให้เหลือแค่รูปแรกของแต่ละห้อง
    const result = rooms.map(room => room.url_picture && room.url_picture.length > 0 ? room.url_picture[0] : null).filter(url => url !== null);
    return result;
});

 fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const room = await prisma.rooms.findUnique({
        where: {
          id: Number(id),
        },
      });

      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      return reply.send(room);
    } catch (error) {
      console.error('Error fetching room by ID:', error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });


fastify.get('/available', async (request) => {
    const { check_in, check_out } = request.query as { check_in?: string; check_out?: string };

    // ถ้าไม่มี check_in หรือ check_out ให้ query ห้องว่างทั้งหมดโดยไม่กรองวันที่
    let availableRooms;
    if (!check_in || !check_out) {
        availableRooms = await prisma.rooms.findMany({
            where: { room_status: 'available' },
            orderBy: { price: 'desc' },
        });
    } else {
        // Find rooms that are available and NOT reserved in the given date range
        availableRooms = await prisma.rooms.findMany({
            where: {
                room_status: 'available',
                reservation: {
                    // No reservation overlaps with the requested period
                    none: {
                        OR: [
                            {
                                check_in: {
                                    lt: new Date(check_out),
                                },
                                check_out: {
                                    gt: new Date(check_in),
                                },
                            },
                        ],
                    },
                },
            },
            orderBy: { price: 'desc' },
        });
    }

    return availableRooms;
});


}