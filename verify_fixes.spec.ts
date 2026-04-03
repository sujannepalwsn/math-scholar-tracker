import { test, expect } from '@playwright/test';

test('Landing page header has Login and Get Started buttons', async ({ page }) => {
  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(1000);
  const loginBtn = page.getByRole('link', { name: /Login/i }).first();
  const getStartedBtn = page.getByRole('link', { name: /Get Started/i }).first();
  await expect(loginBtn).toBeVisible();
  await expect(getStartedBtn).toBeVisible();
});

test('Instant Sandbox flow', async ({ page }) => {
  await page.goto('http://localhost:8080/');
  const sandboxBtn = page.getByRole('button', { name: /Instant Sandbox/i });
  await sandboxBtn.click();

  await page.waitForURL('**/center-dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Check if dashboard content loaded
  await expect(page.getByText(/Dashboard/i).first()).toBeVisible();

  // Find the bell - it's in the desktop header or mobile header
  // Let's just look for any visible bell icon
  const bell = page.locator('.lucide-bell').filter({ visible: true }).first();
  await expect(bell).toBeVisible();
});

test('Parent Dashboard consistency', async ({ page }) => {
  const mockParentUser = {
    id: 'demo-parent-id',
    username: 'parent@eduflow.com',
    role: 'parent',
    center_id: 'demo-center-id',
    center_name: 'Demo Academy',
    linked_students: [{ id: 's1', name: 'John Doe' }]
  };

  await page.goto('http://localhost:8080/');
  await page.evaluate((u) => {
    localStorage.setItem('is_sandbox', 'true');
    localStorage.setItem('auth_user', JSON.stringify(u));
  }, mockParentUser);

  await page.goto('http://localhost:8080/parent-dashboard');
  await page.waitForTimeout(3000);

  // Better selectors: Sidebar links are 'a' inside the desktop sidebar container
  // The sidebar has 'w-20' or 'w-64'
  const sidebarLinks = await page.locator('div.md\\:flex a').allInnerTexts();
  console.log('Sidebar Items:', sidebarLinks.map(s => s.trim()).filter(Boolean));

  // Switch to mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000);

  // Bottom nav items are buttons in the bottom-0 container
  const bottomNavItems = await page.locator('div.fixed.bottom-0 button span').allInnerTexts();
  console.log('Bottom Nav Items:', bottomNavItems.map(s => s.trim()).filter(Boolean));

  // Verify common items
  expect(sidebarLinks.some(s => s.includes('Dashboard'))).toBeTruthy();
  expect(bottomNavItems.some(s => s.includes('Dashboard'))).toBeTruthy();
});
