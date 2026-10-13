import { Module } from '@nestjs/common';
import { GradebookService } from './gradebook.service';
import { GradebookController } from './gradebook.controller';

@Module({
  controllers: [GradebookController],
  providers: [GradebookService],
  exports: [GradebookService],
})
export class GradebookModule {}
