import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const envPath = path.resolve(process.env.HOME || '', '.openclaw', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Discrub extension - Quick Export TXT end-to-end', async () => {
  test.setTimeout(120000);
  const extensionPath = path.resolve(__dirname, '../dist');

  const userDataDir = path.resolve(os.tmpdir(), 'test-user-data-dir');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  // Inject state manually
  const stateStr = fs.readFileSync('/tmp/discord-state.json', 'utf8');
  const state = JSON.parse(stateStr);
  
  await context.addCookies(state.cookies);

  const page = context.pages()[0] || await context.newPage();

  // Navigate to discord.com first to set local storage
  await page.goto('https://discord.com');

  // Inject origins storage
  await page.evaluate((origins) => {
    origins.forEach(origin => {
      if (origin.origin.includes('discord.com')) {
        origin.localStorage.forEach(item => {
          localStorage.setItem(item.name, item.value);
        });
      }
    });
  }, state.origins);

  // Navigate to app directly
  await page.goto('https://discord.com/app');

  // Wait for app to load
  await page.waitForSelector('[aria-label="Friends"], [aria-label="Inbox"]', { timeout: 30000 });
  await page.waitForTimeout(5000);

  // Click a DM channel
  const dmLinks = page.locator('a[href^="/channels/@me/"]').first();
  if (await dmLinks.isVisible()) {
      await dmLinks.click();
  }
  
  await page.waitForTimeout(3000);

  const iframeElement = page.locator('#injected_iframe_button');
  await expect(iframeElement).toBeVisible({ timeout: 15000 });
  
  const frame = await iframeElement.elementHandle();
  const frameContent = await frame?.contentFrame();
  
  if (frameContent) {
     await frameContent.click('button'); 
  }

  await expect(page.locator('text="Quick Export TXT"').first()).toBeVisible({ timeout: 15000 });

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('text="Quick Export TXT"')
  ]);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const content = fs.readFileSync(downloadPath, 'utf8');
  expect(content.length).toBeGreaterThan(0);
  console.log("Downloaded TXT content snippet:", content.substring(0, 100));

  await context.close();
});
