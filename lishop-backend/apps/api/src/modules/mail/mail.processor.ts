import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailJobData } from './mail.service';

@Processor('mail')
export class MailProcessor extends WorkerHost {
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async process(job: Job<MailJobData>): Promise<void> {
    const { type, to, token } = job.data;
    const clientUrl = this.config.get<string>('CLIENT_URL');
    const from = this.config.get<string>('SMTP_FROM');

    if (type === 'verify-email') {
      const link = `${clientUrl}/auth/verify-email?token=${token}`;
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Xác nhận email của bạn — Lishop',
        html: `<p>Nhấp vào liên kết để xác nhận email của bạn:</p><p><a href="${link}">${link}</a></p><p>Liên kết hết hạn sau 24 giờ.</p>`,
      });
    } else if (type === 'reset-password') {
      const link = `${clientUrl}/auth/reset-password?token=${token}`;
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Đặt lại mật khẩu — Lishop',
        html: `<p>Nhấp vào liên kết để đặt lại mật khẩu của bạn:</p><p><a href="${link}">${link}</a></p><p>Liên kết hết hạn sau 1 giờ.</p>`,
      });
    }
  }
}
