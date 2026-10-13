import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { SchoolCalendarService } from './school-calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, SchoolCalendarService],
  exports: [CalendarService, SchoolCalendarService],
})
export class CalendarModule {}
