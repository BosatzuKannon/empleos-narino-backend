import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { WompiService } from './wompi.service';
import { PrismaService } from '../prisma.service';

// Ejemplo oficial de las docs de Wompi (payout.updated) con checksum conocido.
const DOC_EXAMPLE_EVENT = {
  event: 'payout.updated',
  data: {
    payout: {
      id: '04a6e53d-a244-4140-ab9e-48fa541f9fe5',
      reference: 'ref_98765',
      amountInCents: 7500000,
      paymentType: 'PAYROLL',
      status: 'FAILED',
      totalTransactions: 3,
      currency: 'COP',
    },
  },
  signature: {
    properties: ['payout.id', 'payout.status', 'payout.amountInCents'],
    checksum:
      '82f0e769716170e202edfd348f604bd8461cdeeb416594cde563a890215a5282',
  },
  timestamp: 1747673128600,
  sentAt: '2025-05-15T15:00:00.000Z',
};

describe('WompiService', () => {
  let service: WompiService;

  beforeAll(() => {
    process.env.WOMPI_EVENTS_SECRET =
      'prod_events_7b193c8afd7b47949f90d443cb1e1742';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WompiService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<WompiService>(WompiService);
  });

  it('debería aceptar un evento con firma válida (ejemplo oficial)', async () => {
    await expect(
      service.handleWebhook(DOC_EXAMPLE_EVENT),
    ).resolves.toEqual({ received: true });
  });

  it('debería aceptar el checksum del header X-Event-Checksum', async () => {
    await expect(
      service.handleWebhook(DOC_EXAMPLE_EVENT, DOC_EXAMPLE_EVENT.signature.checksum),
    ).resolves.toEqual({ received: true });
  });

  it('debería rechazar un evento con checksum alterado', async () => {
    const tampered = {
      ...DOC_EXAMPLE_EVENT,
      signature: { ...DOC_EXAMPLE_EVENT.signature, checksum: '0'.repeat(64) },
    };
    await expect(service.handleWebhook(tampered)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debería rechazar si falta el objeto signature', async () => {
    const { signature: _sig, ...noSignature } = DOC_EXAMPLE_EVENT;
    await expect(service.handleWebhook(noSignature)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
