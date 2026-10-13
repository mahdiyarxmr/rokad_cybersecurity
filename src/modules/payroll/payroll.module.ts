import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { TeacherContractService } from './teacher-contract.service';
import { PayrollExportService } from './payroll-export.service';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, TeacherContractService, PayrollExportService],
  exports: [PayrollService, TeacherContractService, PayrollExportService],
})
export class PayrollModule {}
