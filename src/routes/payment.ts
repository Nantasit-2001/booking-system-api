import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import fetch from 'node-fetch';
import { simulateTestPaymentIfPending } from '../lib/testMode';
import { authOptional } from '../middlewares/authMiddleware';
interface OmiseError {
  id:string
  status: string;
  object: 'error';
  code: string;
  message: string;
  location: string;
  amount: number;
}

interface OmiseCharge {
  object: 'charge';
  id: string;
  status: string;
  amount: number;
  currency: string;
  source?: {
    scannable_code?: {
      image: {
        download_uri: string;
        uri: string;
      };
    };
  };
  [key: string]: any;
}

interface OmiseSource {
  object: string;
  id: string;
  livemode: boolean;
  amount: number;
  currency: string;
  type: string;
  flow: string;
  source_type: string;
  scannable_code?: {
    image: {
      download_uri: string;
      uri: string;
    };
  };
  [key: string]: any;
}


export async function paymentRoutes(fastify: FastifyInstance) {
  fastify.post('/create',{ preHandler: authOptional }, async (request, reply) => {
    const auth = (request as any)?.auth;
    console.log("----------------------------------------,",auth)
    const {
      roomId,
      checkInDate,
      checkOutDate,
      phoneNumber,
      specialRequests,
      totalPrice,
      deposit,
    } = request.body as {
      roomId: number;
      checkInDate: string;
      checkOutDate: string;
      phoneNumber: string;
      specialRequests: string;
      totalPrice: number; 
      deposit: number;
    };
    try {
      const reservation = await prisma.reservation.create({
        data: {
          room_id: roomId,
          clerk_id: auth.sub,
          check_in: new Date(checkInDate),
          check_out: new Date(checkOutDate),
          total_price: totalPrice,
          phone_number: phoneNumber,
          note: specialRequests,
          status_reservation:'Not yet paid'

        },
      });

      const secretKey = process.env.OMISE_SECRET_KEY ;
      const authHeader = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');

      // ✅ Create source
      const sourceRes = await fetch('https://api.omise.co/sources', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'promptpay',
          amount: `${deposit * 100}`,
          currency: 'thb',
        }),
      });

      const source = await sourceRes.json() as OmiseSource | OmiseError;
      if (source.object === 'error') {
        console.error('❌ Error from source creation:', source);
        return reply.status(500).send({ error: 'Create source failed' });
      }

      // ✅ Create charge
      const chargeRes = await fetch('https://api.omise.co/charges', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: `${deposit * 100}`,
          currency: 'thb',
          source: source.id,
        }),
      });

      const charge = await chargeRes.json() as OmiseCharge | OmiseError;
      if (charge.object === 'error') {
        console.error('❌ Error from charge creation:', charge);
        return reply.status(500).send({ error: 'Create charge failed' });
      }

      await prisma.payment.create({
        data: {
          reservation_id: reservation.id,
          charge_id: charge.id,
          amount: deposit,
          status: 'pending',
        },
      });

      return reply.send({
        qrCodeUrl: charge.source?.scannable_code?.image?.download_uri,
        chargeId: charge.id,
      });

    } catch (error) {
      console.error('Create QR Payment error:', error);
      return reply.status(500).send({ error: 'Create QR Payment failed' });
    }
  });



  fastify.get('/status',{ preHandler: authOptional }, async (request, reply) => {
    const auth = (request as any).auth;
    const chargeId = (request.query as any).chargeId as string;
    console.log("------------------------",auth)
    if (!chargeId) return reply.status(400).send({ error: 'Missing chargeId' });

    try {
      const secretKey = process.env.OMISE_SECRET_KEY;
      const authHeader = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');

      const chargeRes = await fetch(`https://api.omise.co/charges/${chargeId}`, {
        headers: { Authorization: authHeader },
      });
      let charge = await chargeRes.json() as OmiseCharge | OmiseError;


      //🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑 เอาออกใน production
      charge = await simulateTestPaymentIfPending(charge, authHeader);

      if (charge.status === 'successful') {
  await prisma.payment.updateMany({
    where: { charge_id: chargeId },
    data: {
      status: 'successful',
      paid_at: new Date(),
    },
  });
  await prisma.reservation.updateMany({
    where: {
      payment: { some: { charge_id: chargeId } },
    },
    data: {
      status_reservation: 'pending',
      paid_amount: charge.amount / 100,
    },
  });
  // ลบ blocked_room ที่ clerk_id ตรงกับ auth.sub
  await prisma.blocked_room.deleteMany({
    where: {
      clerk_id:auth.sub,
    },
  });
}
      return reply.send({ status: charge.status });
    } catch (error) {
      console.error('Check payment status error:', error);
      return reply.status(500).send({ error: 'Failed to retrieve payment status' });
    }
  });
}
