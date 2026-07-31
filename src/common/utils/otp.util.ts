import { randomInt, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export const OTP_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutos

export function generateOtp(): string {
  return String(randomInt(0, 1000000)).padStart(6, '0');
}

// Almacenamos el OTP hasheado con scrypt y una sal aleatoria: "scrypt$<salt>$<hash>"
export function hashOtp(otp: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(otp, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyOtp(otp: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, salt, expectedHash] = parts;
  const actualHash = scryptSync(otp, salt, 64);

  let expectedBuffer: Buffer;
  try {
    expectedBuffer = Buffer.from(expectedHash, 'hex');
  } catch {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
}
