import { Module } from '@nestjs/common';
import { MockEmailProvider } from './mock-email.provider';
import { NotificationService } from './notification.service';

@Module({
  providers: [MockEmailProvider, NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
