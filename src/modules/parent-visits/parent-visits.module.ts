import { Module } from '@nestjs/common';
import { ParentVisitsService } from './parent-visits.service';
import { ParentVisitsController } from './parent-visits.controller';

@Module({
  controllers: [ParentVisitsController],
  providers: [ParentVisitsService],
  exports: [ParentVisitsService],
})
export class ParentVisitsModule {}
