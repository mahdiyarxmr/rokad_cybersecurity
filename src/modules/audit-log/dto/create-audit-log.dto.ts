export class CreateAuditLogDto {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  appVersion?: string;
}
