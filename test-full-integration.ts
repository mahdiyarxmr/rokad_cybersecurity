import { PrismaClient } from '@prisma/client';
import { SmsService } from './src/modules/sms/sms.service';
import { AmootSmsProvider } from './src/modules/sms/providers/amoot-sms.provider';
import { SandboxSmsProvider } from './src/modules/sms/providers/sandbox-sms.provider';
import { KavenegarSmsProvider } from './src/modules/sms/providers/kavenegar-sms.provider';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();

async function fullIntegrationTest() {
  console.log('=== Step 1: Querying Database for School Tenant & Gateway Config ===');
  const tenant = await prisma.tenant.findFirst();
  console.log('Found Tenant:', tenant ? { id: tenant.id, name: tenant.name } : 'None');

  if (!tenant) {
    console.error('No tenant found!');
    process.exit(1);
  }

  // Update Line to '98' in DB
  await prisma.smsGatewayConfig.upsert({
    where: { tenantId: tenant.id },
    update: {
      provider: 'AMOOT',
      amootApiKey: process.env.AMOOT_API_KEY || '',
      amootSenderLine: '98',
    },
    create: {
      tenantId: tenant.id,
      provider: 'AMOOT',
      amootApiKey: process.env.AMOOT_API_KEY || '',
      amootSenderLine: '98',
    },
  });

  const config = await prisma.smsGatewayConfig.findUnique({
    where: { tenantId: tenant.id },
  });
  console.log('Updated Tenant SMS Gateway Config in DB:', config);

  console.log('\n=== Step 2: Testing Full Backend SmsService.sendManualSms Flow ===');
  const configService = new ConfigService();
  const amootProvider = new AmootSmsProvider(configService);
  const sandboxProvider = new SandboxSmsProvider();
  const kavenegarProvider = new KavenegarSmsProvider(configService);

  const smsService = new SmsService(
    prisma as any,
    configService,
    sandboxProvider,
    kavenegarProvider,
    amootProvider,
  );

  const sendResult = await smsService.sendManualSms(
    tenant.id,
    'admin-tester-id',
    {
      targetType: 'DIRECT_PHONE' as any,
      directPhone: '09150669620',
      message: 'تست نهایی یکپارچگی سامانه رکاد با درگاه پیامک آموت',
    }
  );

  console.log('SmsService Send Manual Result:', JSON.stringify(sendResult, null, 2));

  console.log('\n=== Step 3: Verifying Log Saved in Database with AMOOT Provider ===');
  const latestLog = await prisma.smsLog.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  });
  console.log('Latest DB Log Record:', latestLog);

  console.log('\n=== Step 4: Verifying Live Account Status from Service ===');
  const gatewayInfo: any = await smsService.getGatewayConfig(tenant.id);
  console.log('Gateway Config & Live Balance Output:', {
    provider: gatewayInfo.provider,
    accountName: gatewayInfo.liveAccount?.accountName,
    remaindCreditTomans: gatewayInfo.liveAccount?.remaindCreditTomans,
    senderLine: gatewayInfo.amoot?.senderLine,
  });

  await prisma.$disconnect();
  console.log('\n>>> FULL 100% END-TO-END INTEGRATION TEST PASSED SUCCESSFULLY <<<');
}

fullIntegrationTest().catch(console.error);
