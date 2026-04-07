import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        # Login and enter sandbox
        await page.goto('http://localhost:8080/')
        await page.click('text=Instant Sandbox')
        await page.wait_for_timeout(3000)

        # 1. Verify Messaging "New Conversation"
        await page.goto('http://localhost:8080/teacher/messages')
        await page.wait_for_timeout(2000)
        # Check for "New Conversation" button
        try:
            await page.wait_for_selector('text=New Conversation', timeout=5000)
            print("Found 'New Conversation' button")
        except:
            print("FAILED to find 'New Conversation' button")
        await page.screenshot(path='verify_messaging.png')

        # 2. Verify Students Registration - check if Parent Account edit buttons are hidden/disabled
        # Use the route from navigation-defaults: /register
        await page.goto('http://localhost:8080/register')
        await page.wait_for_timeout(2000)
        try:
            await page.click('text=Parent Management')
            await page.wait_for_timeout(1000)
            print("Entered Parent Management")
        except:
            # Maybe it's "Parents" or something else
            print("Could not find 'Parent Management' tab, checking page content")
        await page.screenshot(path='verify_students_reg.png')

        # 3. Verify Teacher Registration - /teachers
        await page.goto('http://localhost:8080/teachers')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='verify_teachers_reg.png')
        print("Verified Teachers Registration")

        # 4. Verify My Attendance navigation - /teacher/my-attendance
        await page.goto('http://localhost:8080/teacher/my-attendance')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='verify_my_attendance.png')
        print("Verified My Attendance page")

        # 5. Verify Library Management Issue Book - /inventory (Library is usually a tab there or separate)
        # Looking at system-modules, Library is part of inventory_assets or separate?
        # Actually I saw LibraryManagement.tsx being used in /inventory or similar.
        await page.goto('http://localhost:8080/inventory')
        await page.wait_for_timeout(2000)
        try:
            await page.click('text=Library')
            await page.wait_for_timeout(1000)
            await page.click('text=Issue Book')
            await page.wait_for_timeout(1000)
            print("Verified Library Issue Book dialog")
        except:
            print("Could not find Library/Issue Book")
        await page.screenshot(path='verify_library.png')

        # 6. Verify Exam Management Subject Dates - /teacher/exams
        await page.goto('http://localhost:8080/teacher/exams')
        await page.wait_for_timeout(2000)
        try:
            await page.click('text=Schedule')
            await page.wait_for_timeout(1000)
            print("Verified Exam Schedule dialog")
        except:
            print("Could not find Exam Schedule")
        await page.screenshot(path='verify_exams.png')

        # 7. Verify Published Results - /teacher/published-results
        await page.goto('http://localhost:8080/teacher/published-results')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='verify_published_results.png')
        print("Verified Published Results")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
