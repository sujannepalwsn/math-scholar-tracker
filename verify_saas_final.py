import asyncio
from playwright.async_api import async_playwright
import os

async def capture(page, url, path, wait_text=None, action=None):
    print(f"Capturing {url} -> {path}")
    try:
        await page.goto(url)
        if wait_text:
            await page.get_by_text(wait_text).first.wait_for(state="visible", timeout=30000)
        if action:
            await action(page)
        await page.screenshot(path=path)
    except Exception as e:
        print(f"Error capturing {url}: {e}")
        await page.screenshot(path=f"{path}_error.png")

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        # 1. Public Pages
        await capture(page, "http://localhost:8081/", "screenshots/01_landing.png", wait_text="The Last School")
        await capture(page, "http://localhost:8081/features", "screenshots/02_features.png", wait_text="Modular Ecosystem")
        await capture(page, "http://localhost:8081/pricing", "screenshots/03_pricing.png", wait_text="Scalable Plans")
        await capture(page, "http://localhost:8081/about", "screenshots/04_about.png", wait_text="Why we built EduFlow")

        # 2. Admin Dashboard (with Role Switcher)
        await page.evaluate("""() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'demo-id',
                username: 'demo',
                role: 'admin',
                center_id: null,
                center_name: 'EduFlow Global',
                active_academic_year: '2024-2025'
            }));
            localStorage.setItem('user_role', 'admin');
        }""")
        await capture(page, "http://localhost:8081/admin-dashboard", "screenshots/05_admin_dashboard.png", wait_text="Admin Dashboard")

        # 3. Center Dashboard + Migration Tool
        await page.evaluate("""() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'demo-id',
                username: 'demo',
                role: 'center',
                center_id: 'demo-center',
                center_name: 'Demo Academy',
                active_academic_year: '2024-2025'
            }));
            localStorage.setItem('user_role', 'center');
        }""")

        async def open_migration(p):
            # Use breadcrumb or something unique to wait for
            await p.get_by_text("Command Center").first.click()
            await p.get_by_text("Terminal").first.wait_for(state="visible")
            await p.get_by_text("Import School Data").first.click()
            await asyncio.sleep(2)

        await capture(page, "http://localhost:8081/center-dashboard", "screenshots/06_migration_tool.png", wait_text="Total Students", action=open_migration)

        # 4. Upgrade Modal
        async def open_upgrade(p):
            await p.goto("http://localhost:8081/center-dashboard")
            await p.get_by_text("Predictive Risk").first.wait_for(state="visible")
            await p.get_by_text("Predictive Risk").first.click()
            await p.get_by_text("Upgrade to EduFlow Pro").first.wait_for(state="visible")
            await asyncio.sleep(1)

        await capture(page, "http://localhost:8081/center-dashboard", "screenshots/07_upgrade_modal.png", action=open_upgrade)

        await browser.close()

if __name__ == "__main__":
    if not os.path.exists("screenshots"):
        os.makedirs("screenshots")
    asyncio.run(run())
