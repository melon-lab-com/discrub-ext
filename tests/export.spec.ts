import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Required env vars for integration tests:
//   DISCORD_TOKEN    - Discord user token for authentication
//   TEST_CHANNEL_ID  - ID of the Discord channel to test against
//
// Local development: place these in ~/.openclaw/.env
// CI: set them as repository secrets and expose via env: in the workflow
//
// This test suite only runs when CI_INTEGRATION=1 is set explicitly.
// Example: CI_INTEGRATION=1 npx playwright test

if (process.env.CI_INTEGRATION !== '1') {
  test.skip(() => true, 'Skipping integration tests: set CI_INTEGRATION=1 to run');
}

const envPath = path.resolve(process.env.HOME || '', '.openclaw', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Fail fast if required env vars are absent rather than proceeding to an
// opaque Discord auth failure at runtime.
const REQUIRED_ENV_VARS = ['DISCORD_TOKEN', 'TEST_CHANNEL_ID'];
const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables for integration tests: ${missingVars.join(', ')}.\n` +
      'Set them in ~/.openclaw/.env (local) or as CI secrets (CI).'
  );
}

// Discord session state file path. Override with DISCORD_STATE_PATH env var.
// The file must contain a JSON object with the shape:
//   { cookies: [...], origins: [{ origin: string, localStorage: [...] }] }
// Generate it with the capture-state helper (see docs/integration-tests.md).
const DISCORD_STATE_PATH = process.env.DISCORD_STATE_PATH || path.join(os.tmpdir(), 'discord-state.json');

if (!fs.existsSync(DISCORD_STATE_PATH)) {
  throw new Error(
    `Discord session state file not found at: ${DISCORD_STATE_PATH}\n` +
      'Set DISCORD_STATE_PATH to the path of a valid discord-state.json, or\n' +
      'generate one with the capture-state helper (see docs/integration-tests.md).'
  );
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
  const stateStr = fs.readFileSync(DISCORD_STATE_PATH, 'utf8');
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
