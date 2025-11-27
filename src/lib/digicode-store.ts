// src/lib/digicode-store.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function setCode(email: string, code: string) {
  await redis.setex(`digicode:${email.toLowerCase()}`, 600, code); // 10 min
}

export async function getCode(email: string): Promise<string | null> {
  return await redis.get(`digicode:${email.toLowerCase()}`);
}

export async function deleteCode(email: string) {
  await redis.del(`digicode:${email.toLowerCase()}`);
}