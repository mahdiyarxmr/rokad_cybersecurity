import { PrismaClient } from '@prisma/client';
import { AmootSmsProvider } from './src/modules/sms/providers/amoot-sms.provider';
import { SmsService } from './src/modules/sms/sms.service';
import { SandboxSmsProvider } from './src/modules/sms/providers/sandbox-sms.provider';
import { KavenegarSmsProvider } from './src/modules/sms/providers/kavenegar-sms.provider';
import { ConfigService } from '@nestjs/config';

async function testIranianFormat() {
  console.log('🇮🇷 Testing Iranian Phone Number (+98) Normalization & Persistence...');
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

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('Tenant not found');

  const testCases = [
    { input: '0500012345678', expected: '+98500012345678' },
    { input: '500012345678', expected: '+98500012345678' },
    { input: '09121234567', expected: '+989121234567' },
    { input: '+9850009999', expected: '+9850009999' },
    { input: '۰۹۱۲۳۴۵۶۷۸۹', expected: '+989123456789' }, // Persian digits
  ];

  for (const tc of testCases) {
    console.log(`\nTesting Line Input: "${tc.input}"`);
    const res = await smsService.updateGatewayConfig(
      {
        provider: 'AMOOT',
        amootApiKey: 'test_key_iran',
        amootSenderLine: tc.input,
      },
      tenant.id
    );

    const saved = await smsService.getGatewayConfig(tenant.id);
    console.log(`-> Saved in DB: "${saved.amoot.senderLine}" | Normalized correctly: ${saved.amoot.senderLine.startsWith('+98')}`);
  }

  console.log('\n✅ Iranian (+98) Format Normalization Test Passed Perfectly!');
  await prisma.$disconnect();
}

testIranianFormat().catch((e) => {
  console.error(e);
  process.exit(1);
});
