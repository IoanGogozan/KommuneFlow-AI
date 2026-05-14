import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  AdminDepartmentsController,
  DepartmentsController,
} from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  imports: [AuthModule],
  controllers: [DepartmentsController, AdminDepartmentsController],
  providers: [DepartmentsService],
})
export class DepartmentsModule {}
