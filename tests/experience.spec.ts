import { expect, test } from '@playwright/test';

test('the world, four views, motion controls, sound, and clean image export work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.webgl-mount')).toHaveClass(/is-ready/, { timeout: 30000 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aetheria');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.keyboard.press('Space');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'artifacts/verified-panorama.png' });

  for (const [number, hash] of [[2, 'castle'], [3, 'wheel'], [4, 'whale'], [1, 'panorama']] as const) {
    const button = page.getByRole('button', { name: new RegExp(`View ${number}:`) });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `artifacts/verified-${hash}.png` });
  }

  await page.getByRole('button', { name: 'Open experience settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Make yourself at home.' })).toBeVisible();
  const motion = page.getByRole('switch', { name: 'Let the world move' });
  await motion.click();
  await expect(motion).toHaveAttribute('aria-checked', 'true');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('switch', { name: 'Drifting blossoms' }).click();
  await expect(page.getByRole('switch', { name: 'Drifting blossoms' })).toHaveAttribute('aria-checked', 'false');
  await page.getByLabel('Rendering detail').selectOption('gentle');
  await expect(page.getByLabel('Rendering detail')).toHaveValue('gentle');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Let the world move', exact: true }).click();

  await page.getByRole('button', { name: 'Turn ambient sound on', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Turn ambient sound off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Turn ambient sound off', exact: true }).click();

  await page.mouse.move(1100, 480);
  await page.mouse.down();
  await page.mouse.move(1170, 510, { steps: 6 });
  await expect(page.locator('canvas')).toHaveClass(/is-dragging/);
  await page.mouse.up();
  await expect(page.locator('canvas')).not.toHaveClass(/is-dragging/);
  await page.mouse.wheel(0, -150);

  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save this moment as an image' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('aetheria-panorama.png');
  await download.saveAs('artifacts/exported-moment.png');
  await expect(page.getByRole('status').filter({ hasText: 'A little piece of Aetheria' })).toBeVisible();

  await page.getByRole('button', { name: 'Hide interface' }).click();
  await expect(page.locator('.interface')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Return to Aetheria/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.interface')).toHaveCount(1);
  await page.getByRole('button', { name: 'Enter fullscreen' }).click();
  await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible();
  await page.getByRole('button', { name: 'Exit fullscreen' }).click();
  await page.getByRole('button', { name: 'About this world' }).click();
  await expect(page.getByRole('dialog', { name: /Not every journey/ })).toBeVisible();
  await page.getByRole('button', { name: 'Behind the dream' }).click();
  await expect(page.getByText('This is a composed dreamscape', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Take the scenic route' }).click();
  await expect(page.getByRole('button', { name: 'Stop guided tour' })).toBeVisible();
  await expect(page).toHaveURL(/#castle$/, { timeout: 18000 });
  await page.getByRole('button', { name: 'Stop guided tour' }).click();
  expect(errors).toEqual([]);
});

test('the mobile composition, touch controls, and settings stay accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.webgl-mount')).toHaveClass(/is-ready/, { timeout: 30000 });
  await page.waitForTimeout(1600);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/verified-mobile.png' });
  for (const number of [2, 3, 4]) {
    await page.getByRole('button', { name: new RegExp(`View ${number}:`) }).click();
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `artifacts/mobile-view-${number}.png` });
  }
  await page.getByRole('button', { name: 'Open experience settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Make yourself at home.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Hide interface' }).click();
  await page.getByRole('button', { name: /Return to Aetheria/ }).click();
  await expect(page.getByRole('button', { name: 'View 1: The panorama' })).toBeVisible();
});

test('reduced motion is honored and deep links choose the requested camera', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#wheel');
  await expect(page.getByRole('button', { name: 'View 3: The sky wheel' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Let the world move', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open experience settings' }).click();
  await expect(page.getByRole('switch', { name: 'Let the world move' })).toHaveAttribute('aria-checked', 'false');
});