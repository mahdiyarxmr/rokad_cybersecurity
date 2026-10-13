async function getAmootAccountInfo() {
  const token = process.env.AMOOT_API_KEY || '';
  console.log('🔍 Checking Account Lines from Amoot SMS...');

  const endpoints = [
    'https://portal.amootsms.com/rest/AccountLines',
    'https://portal.amootsms.com/rest/GetAccountLines',
    'https://portal.amootsms.com/rest/AccountInfo',
    'https://portal.amootsms.com/rest/GetCredit',
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Token': token,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      console.log(`Endpoint [${url.split('/').pop()}]:`, JSON.stringify(data, null, 2));
    } catch (e: any) {
      console.log(`Endpoint [${url.split('/').pop()}] Error:`, e.message);
    }
  }
}

getAmootAccountInfo();
