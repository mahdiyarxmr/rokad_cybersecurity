async function sendAmootVariants() {
  const token = process.env.AMOOT_API_KEY || '';
  const targetPhone = process.env.SMS_TEST_PHONE || '';
  const message = 'با سلام و احترام؛\nاین یک پیامک آزمایشی تایید اتصال وب‌سرویس آموت به سامانه هوشمند رکاد است.';

  // 1. Amoot Quick Send (بدون نیاز به خط اختصاصی / خط خدماتی پیش‌فرض)
  const quickEndpoints = [
    'https://portal.amootsms.com/rest/SendQuick',
    'https://portal.amootsms.com/rest/SendWithPublicLine',
    'https://portal.amootsms.com/rest/SendWithDefaultLine',
  ];

  for (const url of quickEndpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Token': token,
        },
        body: JSON.stringify({
          SendDateTime: '',
          SMSMessageText: message,
          Mobiles: targetPhone,
        }),
      });
      const text = await res.text();
      console.log(`Endpoint [${url.split('/').pop()}]:`, text);
    } catch (e: any) {
      console.log(`Endpoint [${url.split('/').pop()}] Error:`, e.message);
    }
  }
}

sendAmootVariants();
