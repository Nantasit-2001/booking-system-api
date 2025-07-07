import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authOptional } from '../middlewares/authMiddleware';

export default async function auth(fastify: FastifyInstance) {
    // POST /role
    fastify.get('/role', { preHandler: authOptional }, async (request, reply) => {
        const auth = (request as any).auth;
        if (!auth) {
            // ยังไม่ได้ login
            return reply.code(200).send({ role: 'guest' });
        }
        const user = await prisma.users.findUnique({
            where: { clerkId: auth.sub },
            select: { role: true },
        });
        if (!user) {
            return reply.code(200).send({ role: 'guest' });
        }
        return reply.code(200).send({ role: user.role });
    });

    fastify.get('/user_infomation', { preHandler: authOptional }, async (request, reply) => {
        const auth = (request as any).auth;
        if (!auth) {
            // ยังไม่ได้ login
            return reply.code(200).send({ role: 'guest' });
        }
        const user = await prisma.users.findUnique({
            where: { clerkId: auth.sub },
        });
        return reply.code(200).send( user );
    });
}