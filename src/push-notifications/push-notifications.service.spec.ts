import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { PushNotificationService } from './push-notifications.service';
import { Expo } from 'expo-server-sdk';

interface ExpoSdkMock extends jest.Mock {
  __sendPushNotificationsAsync: jest.Mock;
  isExpoPushToken: (token: unknown) => boolean;
}

jest.mock('expo-server-sdk', () => {
  const sendPushNotificationsAsync = jest.fn();
  const chunkPushNotifications = jest.fn((messages: unknown[]): unknown[][] => {
    const chunks: unknown[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }
    return chunks;
  });
  const ExpoMock = jest.fn().mockImplementation(() => ({
    sendPushNotificationsAsync,
    chunkPushNotifications,
  }));

  Object.assign(ExpoMock, {
    __sendPushNotificationsAsync: sendPushNotificationsAsync,
    isExpoPushToken: (token: unknown): boolean =>
      typeof token === 'string' && token.startsWith('ExponentPushToken'),
  });

  return { Expo: ExpoMock };
});

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: string;
  data: Record<string, unknown>;
}

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let prismaMock: {
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    device: { deleteMany: jest.Mock };
  };

  const expoMock = Expo as unknown as ExpoSdkMock;

  function getSendMock(): jest.Mock {
    return expoMock.__sendPushNotificationsAsync;
  }

  function getSentChunks(): PushMessage[][] {
    const calls = getSendMock().mock.calls as unknown as PushMessage[][][];
    return calls.map((call) => call[0]);
  }

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        EXPO_ACCESS_TOKEN: 'mock-access-token',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    getSendMock().mockReset();
    getSendMock().mockResolvedValue([]);

    prismaMock = {
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      device: { deleteMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendToUser', () => {
    it('debería omitir el envío si el usuario desactivó pushNotifications', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        preferences: { pushNotifications: false },
        devices: [{ pushToken: 'ExponentPushToken[valid-1]' }],
      });

      await service.sendToUser('user-1', { title: 'T', body: 'B' });

      expect(getSendMock()).not.toHaveBeenCalled();
    });

    it('debería omitir el envío si el usuario no tiene tokens válidos', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        preferences: null,
        devices: [{ pushToken: 'token-inválido' }],
      });

      await service.sendToUser('user-1', { title: 'T', body: 'B' });

      expect(getSendMock()).not.toHaveBeenCalled();
    });

    it('debería omitir el envío si no existe el usuario', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await service.sendToUser('user-desconocido', { title: 'T', body: 'B' });

      expect(getSendMock()).not.toHaveBeenCalled();
    });

    it('debería enviar cuando hay token válido y preferencias por defecto', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        preferences: null,
        devices: [{ pushToken: 'ExponentPushToken[valid-1]' }],
      });

      await service.sendToUser('user-1', {
        title: 'Nueva oferta',
        body: 'Dev — ¡Postúlate ya!',
        data: { type: 'new_offer', offerId: 'offer-1' },
      });

      const chunks = getSentChunks();
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(1);
      expect(chunks[0][0].to).toBe('ExponentPushToken[valid-1]');
      expect(chunks[0][0].title).toBe('Nueva oferta');
      expect(chunks[0][0].sound).toBe('default');
      expect(chunks[0][0].data).toEqual({
        type: 'new_offer',
        offerId: 'offer-1',
      });
    });

    it('debería eliminar el dispositivo ante DeviceNotRegistered', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        preferences: { pushNotifications: true },
        devices: [{ pushToken: 'ExponentPushToken[stale-1]' }],
      });
      getSendMock().mockResolvedValueOnce([
        {
          status: 'error',
          message: 'Device not registered',
          details: { error: 'DeviceNotRegistered' },
        },
      ]);

      await service.sendToUser('user-1', { title: 'T', body: 'B' });

      expect(prismaMock.device.deleteMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.device.deleteMany).toHaveBeenCalledWith({
        where: { pushToken: 'ExponentPushToken[stale-1]' },
      });
    });

    it('no debería eliminar el dispositivo ante otros errores', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        preferences: { pushNotifications: true },
        devices: [{ pushToken: 'ExponentPushToken[valid-1]' }],
      });
      getSendMock().mockResolvedValueOnce([
        {
          status: 'error',
          message: 'Message too big',
          details: { error: 'MessageTooBig' },
        },
      ]);

      await service.sendToUser('user-1', { title: 'T', body: 'B' });

      expect(prismaMock.device.deleteMany).not.toHaveBeenCalled();
    });

    it('no debería lanzar si el envío falla', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        preferences: { pushNotifications: true },
        devices: [{ pushToken: 'ExponentPushToken[valid-1]' }],
      });
      getSendMock().mockRejectedValueOnce(new Error('network error'));

      await expect(
        service.sendToUser('user-1', { title: 'T', body: 'B' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('sendToCandidates', () => {
    it('debería enviar solo a candidatos con push habilitado y token válido', async () => {
      prismaMock.user.findMany.mockResolvedValueOnce([
        {
          id: 'c1',
          preferences: { pushNotifications: false },
          devices: [{ pushToken: 'ExponentPushToken[skip-1]' }],
        },
        {
          id: 'c2',
          preferences: { pushNotifications: true },
          devices: [
            { pushToken: 'ExponentPushToken[a]' },
            { pushToken: 'ExponentPushToken[b]' },
          ],
        },
        {
          id: 'c3',
          preferences: null,
          devices: [{ pushToken: 'token-inválido' }],
        },
      ]);

      await service.sendToCandidates({ title: 'T', body: 'B' });

      const chunks = getSentChunks();
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(2);
      expect(chunks[0][0].to).toBe('ExponentPushToken[a]');
      expect(chunks[0][1].to).toBe('ExponentPushToken[b]');
    });

    it('debería dividir en lotes de máximo 100 mensajes', async () => {
      const devices = Array.from({ length: 250 }, (_, i) => ({
        pushToken: `ExponentPushToken[${i}]`,
      }));
      prismaMock.user.findMany.mockResolvedValueOnce([
        {
          id: 'c1',
          preferences: { pushNotifications: true },
          devices,
        },
      ]);

      await service.sendToCandidates({ title: 'T', body: 'B' });

      const chunks = getSentChunks();
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(100);
      expect(chunks[1]).toHaveLength(100);
      expect(chunks[2]).toHaveLength(50);
    });

    it('debería omitir el envío si no hay candidatos con tokens', async () => {
      prismaMock.user.findMany.mockResolvedValueOnce([
        {
          id: 'c1',
          preferences: { pushNotifications: true },
          devices: [],
        },
      ]);

      await service.sendToCandidates({ title: 'T', body: 'B' });

      expect(getSendMock()).not.toHaveBeenCalled();
    });
  });
});
