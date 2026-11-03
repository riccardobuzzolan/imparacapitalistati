const fs = require('node:fs');
const { spawn } = require('node:child_process');
(async () => {
  const chrome = spawn('google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--remote-debugging-port=9224', '--user-data-dir=/tmp/map-preview',
    'about:blank'
  ], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let ok = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:9224/json/version');
      if (response.ok) { ok = true; break; }
    } catch {}
    await sleep(200);
  }
  if (!ok) throw new Error('Chrome not available');
  const tab = await (await fetch('http://127.0.0.1:9224/json/new?preview', { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (pending.has(message.id)) {
      const job = pending.get(message.id);
      pending.delete(message.id);
      message.error ? job.reject(Error(JSON.stringify(message.error))) : job.resolve(message.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await sleep(8000);
  const info = await send('Runtime.evaluate', {
    expression: `(() => {
      document.querySelectorAll('button').forEach((b) => {
        if (b.textContent?.trim() === 'Rifiuta') b.click();
      });
      const wrap = document.getElementById('mapWrap');
      const svg = wrap?.querySelector('svg');
      return {
        title: document.title,
        svgWidth: svg?.getBoundingClientRect().width,
        viewportWidth: innerWidth,
        mapScrollWidth: wrap?.scrollWidth,
        mapClientWidth: wrap?.clientWidth,
        label: document.getElementById('mapHint')?.textContent,
        stateCount: svg?.querySelectorAll('.state-path').length
      };
    })()`,
    returnByValue: true,
  });
  console.log('Map layout:', JSON.stringify(info.result.value));
  if (!info.result.value || info.result.value.svgWidth < 600 || info.result.value.stateCount < 40) {
    throw new Error('Map zoom or SVG failed');
  }
  await sleep(1000);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.mkdirSync('docs/images', { recursive: true });
  fs.writeFileSync('docs/images/mobile-map-zoom.png', Buffer.from(shot.data, 'base64'));
  ws.close();
  chrome.kill();
})().catch((error) => { console.error(error); process.exitCode = 1; });
