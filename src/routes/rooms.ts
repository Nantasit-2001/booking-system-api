import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';

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

fastify.post('/filter', async (request) => {
    const { FilterRoom, check_in, check_out } = request.body as {
        FilterRoom: { type?: string; price?: number; guests?: number };
        check_in: string;
        check_out: string;
    };

    // 1. กรองห้องตาม FilterRoom
    const filteredRooms = await prisma.rooms.findMany({
        where: {
            ...(FilterRoom.type && { room_type: FilterRoom.type }),
            ...(FilterRoom.price && { price: { lte: FilterRoom.price } }),
            ...(FilterRoom.guests && { guests: { gte: FilterRoom.guests } }),
            room_status: 'available',
        },
        orderBy: { id: 'asc' },
    });

    // 2. หา id ห้องที่ถูกจอง (unavailable) ในช่วง check_in/check_out
    const reservations = await prisma.reservation.findMany({
        where: {
            OR: [
                {
                    check_in: { lte: check_out },
                    check_out: { gte: check_in },
                },
            ],
        },
        select: { room_id: true },
    });
const unavailableIds: number[] = reservations.map((r:{ room_id: number }) => r.room_id);

    // 3. แยกห้องที่ว่างและไม่ว่าง
    const available = filteredRooms.filter((room: { id: number }) => !unavailableIds.includes(room.id));
    const unavailable = filteredRooms.filter((room: { id: number }) => unavailableIds.includes(room.id));

    return { available, unavailable };
});


}