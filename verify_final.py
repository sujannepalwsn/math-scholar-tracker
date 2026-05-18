import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        # Go to a page to set localStorage
        await page.goto('http://localhost:8080')
        await page.evaluate("() => { localStorage.setItem('is_sandbox', 'true'); localStorage.setItem('maintenance_dismissed', 'true'); }")

        # Navigate to dashboard
        await page.goto('http://localhost:8080/center-dashboard?show_stats=true')

        # Wait for content
        await page.wait_for_timeout(5000)

        await page.screenshot(path='final_verify.png', full_page=True)
        print("Screenshot saved to final_verify.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
