import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', msg => console.log('[browser]', msg.type(), msg.text()));
page.on('pageerror', err => console.log('[pageerror]', err.stack || err.message));

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.click('#run');
await page.waitForFunction(() => {
  const status = document.querySelector('#status')?.textContent || '';
  return !status.includes('Loading') && !status.includes('Running') && status !== 'Idle.';
}, { timeout: 120000 });

const status = await page.locator('#status').innerText();
const output = await page.locator('#output').innerText();
console.log('STATUS:', status);
console.log('OUTPUT:', output);

await browser.close();
