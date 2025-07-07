import Fastify from 'fastify';
import cors from '@fastify/cors';
import roomsRoutes from './routes/rooms';
import adminRoomRoutes from './routes/admin/rooms';
import clerkWebhook from './routes/clerkWebhook';
import { bookingRoutes } from './routes/booking';
import auth from './routes/auth';
const fastify = Fastify({ logger: true });

const start = async () => {
  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });
  fastify.register(clerkWebhook, { prefix: '/webhooks' });
  fastify.register(roomsRoutes, { prefix: '/rooms' });
  fastify.register(adminRoomRoutes, { prefix: '/admin/rooms' });
  fastify.register(bookingRoutes, { prefix: '/booking' });
  fastify.register(auth,{prefix:'/auth'})
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
