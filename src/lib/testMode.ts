export async function simulateTestPaymentIfPending(charge: any, authHeader: string): Promise<any> {
  const isTest = charge.livemode === false;
  const isPending = charge.status === 'pending';

  if (isTest && isPending) {
    console.log("💡 Mocking test payment as successful...");

    // จำลองว่า payment สำเร็จ
    return {
      ...charge,
      status: 'successful',
      paid: true,
      paid_at: new Date().toISOString(),
    };
  }

  return charge; // ถ้าไม่เข้าเงื่อนไข ให้ส่ง charge เดิมกลับ
}
