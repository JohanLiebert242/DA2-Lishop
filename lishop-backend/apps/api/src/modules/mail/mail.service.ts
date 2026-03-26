import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface MailJobData {
  type: 'verify-email' | 'reset-password';
  to: string;
  token: string;
}

@Injectable()
export class MailService {
  constructor(@InjectQueue('mail') private readonly mailQueue: Queue) {}

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    await this.mailQueue.add(
      'send-email',
      { type: 'verify-email', to, token } satisfies MailJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    await this.mailQueue.add(
      'send-email',
      { type: 'reset-password', to, token } satisfies MailJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }
}
