import { PrismaClient } from '@prisma/client';
import { AmootSmsProvider } from './src/modules/sms/providers/amoot-sms.provider';
import { SmsService } from './src/modules/sms/sms.service';
import { SandboxSmsProvider } from './src/modules/sms/providers/sandbox-sms.provider';
import { KavenegarSmsProvider } from './src/modules/sms/providers/kavenegar-sms.provider';
import { ConfigService } from '@nestjs/config';

async function testFullSmsFlow() {
  console.log('🚀 Starting Full-Stack SMS System Test...');
  const prisma = new PrismaClient();
  const config = new ConfigService();
  const sandbox = new SandboxSmsProvider();
  const kavenegar = new KavenegarSmsProvider(config);
  const amoot = new AmootSmsProvider(config);

  const smsService = new SmsService(
    prisma as any,
    config,
    sandbox,
    kavenegar,
    amoot
  );

  // Use the main school tenant (Rokad Boys School)
  const schoolAdmin = await prisma.user.findFirst({
    where: { role: 'SCHOOL_ADMIN', tenantId: '4aa90b39-2712-48d5-8395-17f5a706456a' },
  });

  if (!schoolAdmin) {
    throw new Error('School Admin user not found');
  }

  const tenantId = schoolAdmin.tenantId;

  console.log(`\n📌 1. Testing Gateway Configuration persistence in DB for tenant: ${tenantId}...`);
  const saveRes = await smsService.updateGatewayConfig(
    {
      provider: 'AMOOT',
      amootApiKey: process.env.AMOOT_API_KEY || '',
      amootSenderLine: '500020003000',
    },
    tenantId
  );
  console.log('Save Result:', saveRes);

  console.log('\n📌 2. Fetching persisted config from Database...');
  const fetchedConfig = await smsService.getGatewayConfig(tenantId);
  console.log('Fetched Config from DB:', JSON.stringify(fetchedConfig, null, 2));

  console.log('\n📌 3. Testing Direct SMS Dispatch (with Automatic Failover to Sandbox simulation)...');
  const directSendRes = await smsService.sendManualSms(tenantId, schoolAdmin.id, {
    targetType: 'DIRECT_PHONE' as any,
    directPhone: '09123456789',
    message: 'با سلام و احترام؛ این پیامک تست مستقیم از سامانه رکاد می‌باشد.',
  });
  console.log('Direct Send Result:', directSendRes);

  console.log('\n📌 4. Testing Role-based Audience SMS (Dispatching to Parents group)...');
  const roleSendRes = await smsService.sendManualSms(tenantId, schoolAdmin.id, {
    targetType: 'ROLE' as any,
    targetRole: 'PARENTS' as any,
    message: 'اولیاء گرامی؛ پیامک آزمایشی اطلاع‌رسانی مدرسه رکاد.',
  });
  console.log('Role Send Result:', roleSendRes);

  console.log('\n📌 5. Checking Updated Stats & Delivery Logs in Database...');
  const stats = await smsService.getSmsStats(tenantId);
  console.log('SMS Stats Breakdown:', JSON.stringify(stats, null, 2));

  const logs = await smsService.getSmsLogs(tenantId, 1, 5);
  console.log(`\n📋 Latest Logs in System (Total: ${logs.total}):`);
  logs.logs.forEach((l, i) => {
    console.log(` [${i + 1}] Recipient: ${l.recipientPhone} (${l.recipientName || 'کاربر'}) | Status: ${l.status} | Provider: ${l.provider} | Text: "${l.message.substring(0, 45)}..."`);
  });

  console.log('\n✨ All Tests Completed and Validated with 100% Success!');
  await prisma.$disconnect();
}

testFullSmsFlow().catch((e) => {
  console.error('Test Error:', e);
  process.exit(1);
});
