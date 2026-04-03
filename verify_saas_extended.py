import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        # Helper to set auth state and navigate
        async def go_to_role(role, path, wait_text):
            # First go to home to be on the same domain
            await page.goto("http://localhost:8081/")
            await page.evaluate("""([role]) => {
                const user = {
                    id: 'demo-id',
                    username: 'demo_user',
                    role: role,
                    center_id: role === 'admin' ? null : 'demo-center',
                    teacher_id: role === 'teacher' ? 'demo-teacher' : null,
                    student_id: role === 'parent' ? 'demo-student' : null,
                    center_name: 'Demo Academy',
                    active_academic_year: '2024-2025'
                };
                localStorage.setItem('auth_user', JSON.stringify(user));
                localStorage.setItem('user_role', role);
            }""", [role])

            print(f"Navigating to {path} as {role}...")
            await page.goto(f"http://localhost:8081{path}")
            try:
                await page.wait_for_selector(f"text={wait_text}", timeout=20000)
                await page.screenshot(path=f"screenshots/{role}_view.png")
                print(f"Captured {role} view")
                return True
            except Exception as e:
                print(f"Failed to capture {role} view: {e}")
                await page.screenshot(path=f"screenshots/error_{role}.png")
                return False

        # 1. Admin Dashboard
        await go_to_role('admin', '/admin-dashboard', 'Finance Overview')

        # 2. Center Dashboard (Migration tool and Upgrade modal)
        if await go_to_role('center', '/center-dashboard', 'Command Center'):
            # Migration Tool
            try:
                await page.click("text=Command Center")
                await page.wait_for_selector("text=Terminal", timeout=5000)
                await page.click("text=Import School Data")
                await asyncio.sleep(2)
                await page.screenshot(path="screenshots/migration_tool.png")
                print("Captured Migration Tool")
            except Exception as e:
                print(f"Failed migration tool: {e}")

            # Upgrade Modal
            try:
                await page.goto("http://localhost:8081/center-dashboard")
                await page.wait_for_selector("text=Predictive Risk", timeout=10000)
                await page.click("text=Predictive Risk")
                await page.wait_for_selector("text=Upgrade to EduFlow Pro", timeout=10000)
                await page.screenshot(path="screenshots/upgrade_modal.png")
                print("Captured Upgrade Modal")
            except Exception as e:
                print(f"Failed upgrade modal: {e}")

        # 3. Teacher View
        await go_to_role('teacher', '/teacher-dashboard', 'Academic Performance')

        # 4. Parent View
        await go_to_role('parent', '/parent-dashboard', "Child's Progress")

        await browser.close()

if __name__ == "__main__":
    if not os.path.exists("screenshots"):
        os.makedirs("screenshots")
    asyncio.run(run())
