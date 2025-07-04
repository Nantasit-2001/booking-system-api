  // server/routes/rooms.ts
  import { FastifyInstance } from 'fastify';
  import { prisma } from '../../lib/prisma';
  import { v2 as cloudinary } from 'cloudinary';
  cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});


  export default async function adminRoomRoutes(fastify: FastifyInstance) {
    console.log(">>> adminRoomRoutes registered")
    // GET /rooms
    fastify.get('/', async () => {
      return await prisma.rooms.findMany();
    });


    // POST /rooms
fastify.post('/create', async (request, reply) => {
  const body = request.body as {
    room_name: string;
    room_type: string;
    max_guests: number;
    description: string;
    price: number;
    url_picture: string[];
    room_status: 'available' | 'unavailable' | 'under Maintenance';
  };

  const existingRoom = await prisma.rooms.findFirst({
  where: {
    room_name: body.room_name,
  },
});

if (existingRoom) {
  return reply.status(409).send({ error: 'DUPLICATE_ROOM_NAME' });
}
  const room = await prisma.rooms.create({
    data: {
      room_name: body.room_name,
      room_type: body.room_type,
      max_guests: body.max_guests,
      description: body.description,
      price: body.price,
      url_picture: body.url_picture,
      room_status: body.room_status,
    },
  });

  return reply.code(201).send(room);
});

    // PUT /rooms/:id
    fastify.put('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      try {
        const updatedRoom = await prisma.rooms.update({
          where: { id: Number(id) },
          data: {
            room_name: body.room_name,
            room_type: body.room_type,
            max_guests: body.max_guests,
            description: body.description,
            price: body.price,
            url_picture: body.url_picture,
            room_status: body.room_status,
          },
        });
        return reply.send(updatedRoom);
      } catch (error) {
        return reply.code(404).send({ error: 'Room not found' });
      }
    });

    // DELETE /rooms/:id
   fastify.delete('/:id', async (request, reply) => {
  const { id } = request.params as { id: string };

  try {
    // 1. ค้นหา room ก่อน
    const room = await prisma.rooms.findUnique({
      where: { id: Number(id) },
    });

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    // 2. ลบรูปใน Cloudinary
    if (Array.isArray(room.url_picture)) {
      const deletePromises = room.url_picture.map((url) => {
        // ✅ ตัด https://res.cloudinary.com/.../upload/ แล้วเอาส่วนที่เหลือ
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/); // ดึง public_id
        const publicId = match ? match[1] : null;

        if (!publicId) return null;
        return cloudinary.uploader.destroy(publicId); // ✅ public_id อาจเป็น room_photos/xxxx
      });

      await Promise.all(deletePromises);
    }

    // 3. ลบ room ใน DB
    await prisma.rooms.delete({
      where: { id: Number(id) },
    });

    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to delete room or images' });
  }
});

    fastify.get('/:id', async (request, reply) => {
  const { id } = request.params as { id: string };

  try {
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return reply.code(400).send({ message: 'Invalid ID format' });
    }

    const room = await prisma.rooms.findUnique({
      where: { id: numericId }, // ✅ ต้องใช้ key + value แบบถูกต้อง
    });

    if (!room) {
      return reply.code(404).send({ message: 'Room not found' });
    }
    return reply.send(room);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: 'Server error' });
  }
});

}


  