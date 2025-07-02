  // server/routes/rooms.ts
  import { FastifyInstance } from 'fastify';
  import { prisma } from '../../../lib/prisma';

  export default async function adminRoomRoutes(fastify: FastifyInstance) {
    console.log(">>> adminRoomRoutes registered")
    // GET /rooms
    fastify.get('/', async () => {
      return await prisma.rooms.findMany();
    });

    // POST /rooms
    fastify.post('/', async (request, reply) => {
      const body = request.body as any;
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
        await prisma.rooms.delete({
          where: { id: Number(id) },
        });
        return reply.code(204).send();
      } catch (error) {
        return reply.code(404).send({ error: 'Room not found' });
      }
    });
  }
