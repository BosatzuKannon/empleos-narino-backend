import { generateOtp, hashOtp, verifyOtp, OTP_EXPIRATION_MS } from './otp.util';

describe('otp.util', () => {
  describe('generateOtp', () => {
    it('debería generar códigos de 6 dígitos', () => {
      for (let i = 0; i < 50; i++) {
        const otp = generateOtp();
        expect(otp).toMatch(/^\d{6}$/);
      }
    });
  });

  describe('hashOtp / verifyOtp', () => {
    it('debería verificar un OTP correcto', () => {
      const otp = generateOtp();
      const stored = hashOtp(otp);
      expect(stored.startsWith('scrypt$')).toBe(true);
      expect(verifyOtp(otp, stored)).toBe(true);
    });

    it('debería rechazar un OTP incorrecto', () => {
      const stored = hashOtp('123456');
      expect(verifyOtp('654321', stored)).toBe(false);
    });

    it('debería rechazar formatos inválidos', () => {
      expect(verifyOtp('123456', 'not-a-hash')).toBe(false);
      expect(verifyOtp('123456', '')).toBe(false);
    });

    it('debería generar hashes distintos para el mismo OTP (sal aleatoria)', () => {
      expect(hashOtp('123456')).not.toBe(hashOtp('123456'));
    });
  });

  describe('OTP_EXPIRATION_MS', () => {
    it('debería ser de 15 minutos', () => {
      expect(OTP_EXPIRATION_MS).toBe(15 * 60 * 1000);
    });
  });
});
