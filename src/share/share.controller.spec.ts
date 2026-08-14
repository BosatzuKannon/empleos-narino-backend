import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { ShareController } from './share.controller';

describe('ShareController', () => {
  let controller: ShareController;
  const mockSend = jest.fn();
  const mockRes = { setHeader: jest.fn(), send: mockSend };
  const mockPrisma = {
    jobVacancy: { findUnique: jest.fn() },
    service: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShareController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get<ShareController>(ShareController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería rechazar tipos de contenido inválidos', async () => {
    await expect(
      controller.share('javascript', 'x', mockRes as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('debería generar HTML con deep link, fallback a Play Store y títulos escapados', async () => {
    const malicious = '<img src=x onerror=alert(1)>';
    mockPrisma.service.findUnique.mockResolvedValue({
      title: malicious,
      description: 'desc "comillas"',
    });

    await controller.share('service', 'abc123', mockRes as any);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const html = mockSend.mock.calls[0][0] as string;
    expect(html).toContain('og:title');
    expect(html).toContain('og:description');
    expect(html).toContain('empleosnarino://service/abc123');
    expect(html).toContain(
      'https://play.google.com/store/apps/details?id=com.bosatzu.empleosnarino',
    );
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain(malicious);
  });
});