import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const mockContext = (headers: Record<string, string>) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  it('debería estar definido', () => {
    expect(guard).toBeDefined();
  });

  it('debería permitir acceso a rutas públicas', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    const context = mockContext({});
    expect(guard.canActivate(context)).toBe(true);
  });

  it('debería lanzar UnauthorizedException si no hay header de autorización', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    const context = mockContext({});
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('debería lanzar UnauthorizedException si el header no es Bearer', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    const context = mockContext({ authorization: 'Basic token123' });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('debería lanzar UnauthorizedException si el token no tiene payload', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    const context = mockContext({ authorization: 'Bearer invalid-token' });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('debería retornar true para un token válido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    const payload = Buffer.from(
      JSON.stringify({ sub: 'mock-user-id', email: 'test@test.com' }),
    ).toString('base64');
    const token = `header.${payload}.signature`;

    const context = mockContext({ authorization: `Bearer ${token}` });
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });
});
