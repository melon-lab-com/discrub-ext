import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Required env vars for integration tests:
//   DISCORD_TOKEN    - Discord user token for authentication
//   TEST_CHANNEL_ID  - ID of the Discord DM channel to test against
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
  test.setTimeout(180000);
  const extensionPath = path.resolve(__dirname, '../dist');
  const channelId = process.env.TEST_CHANNEL_ID!;

  const userDataDir = path.resolve(os.tmpdir(), 'test-user-data-dir');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  // Inject Discord session state
  const stateStr = fs.readFileSync(DISCORD_STATE_PATH, 'utf8');
  const state = JSON.parse(stateStr);

  await context.addCookies(state.cookies);

  const page = context.pages()[0] || await context.newPage();

  // Navigate to discord.com first to set localStorage
  await page.goto('https://discord.com/robots.txt');

  await page.evaluate((origins) => {
    origins.forEach(origin => {
      if (origin.origin.includes('discord.com')) {
        origin.localStorage.forEach(item => {
          localStorage.setItem(item.name, item.value);
        });
      }
    });
  }, state.origins);

  // Navigate directly to the test DM channel
  await page.goto(`https://discord.com/channels/@me/${channelId}`);

  // Wait for Discord app to finish loading
  await page.waitForSelector('[aria-label="Friends"], [aria-label="Inbox"]', { timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click the Discrub extension button (inside the injected button iframe)
  const buttonFrame = page.frameLocator('#injected_iframe_button');
  await buttonFrame.locator('button').click({ timeout: 15000 });

  // Wait for the main Discrub dialog iframe to appear
  await page.waitForSelector('#injected_dialog_iframe', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const mainFrame = page.frameLocator('#injected_dialog_iframe');

  // Dismiss the "Latest News" announcement dialog if it pops up
  try {
    const closeButton = mainFrame.locator('button:has-text("Close")');
    await closeButton.waitFor({ state: 'visible', timeout: 8000 });
    await closeButton.click();
    await page.waitForTimeout(1000);
  } catch {
    // Dialog did not appear — continue
  }

  // Open the Menu and navigate to Direct Messages
  await mainFrame.locator('button:has-text("Menu")').first().click({ timeout: 10000 });
  await mainFrame.locator('[role="menuitem"]:has-text("Direct Messages")').click({ timeout: 5000 });
  await page.waitForTimeout(2000);

  // Click the DM combobox to open the dropdown and wait for DMs to load
  const dmCombobox = mainFrame.locator('[role="combobox"]').first();
  await dmCombobox.click({ timeout: 10000 });

  // Wait for listbox with DM options to appear
  const listbox = mainFrame.locator('[role="listbox"]');
  await listbox.waitFor({ state: 'visible', timeout: 20000 });

  // Select the first available DM option
  const firstOption = mainFrame.locator('[role="option"]').first();
  await firstOption.waitFor({ state: 'visible', timeout: 10000 });
  await firstOption.click();

  // Close the dropdown
  await dmCombobox.press('Escape');
  await page.waitForTimeout(500);

  // Click the Search button (enabled once exactly one DM is selected)
  const searchButton = mainFrame.locator('button:has-text("Search")').last();
  await expect(searchButton).toBeEnabled({ timeout: 5000 });
  await searchButton.click();

  // Wait for message loading to complete (LinearProgress disappears)
  await page.waitForTimeout(3000);
  await mainFrame.locator('.MuiLinearProgress-root')
    .waitFor({ state: 'detached', timeout: 60000 })
    .catch(() => { /* loading may have already finished */ });
  await page.waitForTimeout(2000);

  // Verify the Quick Export TXT button is visible (only shown when messages are loaded)
  const quickExportButton = mainFrame.locator('button:has-text("Quick Export TXT")').first();
  await expect(quickExportButton).toBeVisible({ timeout: 30000 });

  // Click Quick Export TXT and await the file download
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    quickExportButton.click(),
  ]);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const content = fs.readFileSync(downloadPath!, 'utf8');
  expect(content.length).toBeGreaterThan(0);
  console.log('Downloaded TXT content snippet:', content.substring(0, 100));

  await context.close();
});
