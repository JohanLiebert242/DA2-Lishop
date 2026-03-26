import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  const mockQueue = { add: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: getQueueToken('mail'), useValue: mockQueue },
      ],
    }).compile();
    service = module.get(MailService);
  });

  it('sendVerificationEmail should enqueue a job', async () => {
    await service.sendVerificationEmail('user@example.com', 'token123');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'send-email',
      expect.objectContaining({ type: 'verify-email', to: 'user@example.com' }),
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  });

  it('sendPasswordResetEmail should enqueue a job', async () => {
    await service.sendPasswordResetEmail('user@example.com', 'token456');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'send-email',
      expect.objectContaining({ type: 'reset-password', to: 'user@example.com' }),
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  });
});
