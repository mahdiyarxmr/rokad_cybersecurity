async function sendLiveTestSms() {
  const token = process.env.AMOOT_API_KEY || '';
  const targetPhone = process.env.SMS_TEST_PHONE || '';
  const message = 'با سلام و احترام؛\nاین یک پیامک آزمایشی تایید اتصال وب‌سرویس آموت به سامانه هوشمند رکاد می‌باشد.\nموفق و پیروز باشید.';

  console.log(`📡 Sending Live SMS to ${targetPhone} with Mobiles as comma-separated string / single string...`);

  // Variant A: Mobiles as a single phone string from SMS_TEST_PHONE
  try {
    const url = 'https://portal.amootsms.com/rest/SendSimple';
    const bodyPayload = {
      SendDateTime: '',
      SMSMessageText: message,
      LineNumber: '',
      Mobiles: targetPhone,
    };

    console.log('Sending payload with Mobiles as string...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify(bodyPayload),
    });

    const data = await response.json();
    console.log('Amoot API Response (String Variant):', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('❌ Request error:', err.message);
  }
}

sendLiveTestSms();
