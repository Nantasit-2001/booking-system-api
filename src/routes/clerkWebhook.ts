// server/routes/clerkWebhook.ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';

export default async function clerkWebhook(fastify: FastifyInstance) {
  fastify.post('/clerk/webhook', async (request, reply) => {
    const body = request.body as any;

    if (body.type === 'user.created') {
      const user = body.data;
      const email = user.email_addresses?.[0]?.email_address;

      if (!email) {
        reply.code(400).send({ message: 'Email not found' });
        return;
      }

      // ตรวจสอบว่ามีอยู่แล้วหรือยัง
      const existingUser = await prisma.users.findUnique({
        where: { email },
      });

      if (!existingUser) {
        await prisma.users.create({
          data: {
            email,
            name: `${user.first_name} ${user.last_name}`,
            clerkId: user.id,
          },
        });
        reply.send({ message: 'User created in DB' });
      } else {
        reply.send({ message: 'User already exists' });
      }
    } else {
      reply.code(200).send({ message: 'No action for this event' });
    }
  });
}
