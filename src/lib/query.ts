// src/lib/query.ts
import { prisma } from '../lib/prisma'

export const getAllRoomsFromDB = async () => {
  return await prisma.rooms.findMany()
}

export const checkRoomAvailability = async (
  roomName: string,
  startDate: string,
  endDate: string
): Promise<{ available: boolean; reservations: any[] }> => {
  const room = await prisma.rooms.findFirst({
    where: { room_name: roomName },
    select: { id: true },
  })

  if (!room) {
    console.warn(`ไม่พบห้องชื่อ "${roomName}" ในระบบ`)
    return { available: false, reservations: [] }
  }
const check_in = new Date(startDate)
const check_out = new Date(endDate)
  const conflicts = await prisma.reservation.findMany({
    where: {
      room_id: room.id,
      OR: [
        {
          check_in: { lte: check_in },
          check_out: { gte: check_out },
        },
      ],
    },
  })

  return {
    available: conflicts.length === 0,
    reservations: conflicts,
  }
}

export const checkAllRoomAvailability = async (
  startDate: string,
  endDate: string
): Promise<{
  availableRooms: string[]
  unavailableRooms: { roomName: string; reservations: any[] }[]
}> => {
  const allRooms = await prisma.rooms.findMany({
    select: { id: true, room_name: true }
  })

  const check_in = new Date(startDate)
  const check_out = new Date(endDate)

  const availableRooms: string[] = []
  const unavailableRooms: { roomName: string; reservations: any[] }[] = []

  for (const room of allRooms) {
    const conflicts = await prisma.reservation.findMany({
      where: {
        room_id: room.id,
        OR: [
          {
            check_in: { lte: check_out },
            check_out: { gte: check_in },
          },
        ],
      },
    })

    if (conflicts.length === 0) {
      availableRooms.push(room.room_name)
    } else {
      unavailableRooms.push({ roomName: room.room_name, reservations: conflicts })
    }
  }

  return { availableRooms, unavailableRooms }
}


export const getUserBookings = async (userClerk: string) => {
  const bookings = await prisma.reservation.findMany({
    where: {
      clerk_id: userClerk
    },
    include: {
      rooms: true, // ถ้ามี relation ไปยัง table room
    },
    orderBy: {
      check_in: 'desc'
    }
  });

  return {
    message: 'ข้อมูลต่อไปนี้คือข้อมูลห้องพักของ user คนนี้',
    data: bookings
  };
};
