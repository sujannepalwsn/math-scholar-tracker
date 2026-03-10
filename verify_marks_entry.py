import asyncio
from playwright.async_api import async_playwright
import json

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        # Bypass login
        auth_user = {
            "id": "teacher-uuid",
            "email": "teacher@school.com",
            "role": "teacher",
            "center_id": "center-uuid",
            "teacher_id": "teacher-id-123"
        }
        await page.add_init_script(f"window.localStorage.setItem('auth_user', '{json.dumps(auth_user)}');")

        # Go to Marks Entry with a mock exam ID (or just check the list)
        # Since I don't have real data in the DB for this test, I'll just check if the page loads and the dropdown has options
        # Actually, I can't easily mock the DB response in this environment without a full mock server.
        # But I can check if the UI elements for "All Grades" etc are there.

        await page.goto("http://localhost:8081/#/marks-entry")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="marks_entry_initial.png")

        # Check Lesson Plans page to see if "All Grades" students appear in the selection
        await page.goto("http://localhost:8081/#/lesson-tracking")
        await page.wait_for_timeout(2000)
        await page.click("button:has-text('RECORD SESSION')")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="lesson_tracking_record_dialog.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
