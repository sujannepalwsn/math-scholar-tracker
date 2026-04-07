from playwright.sync_api import sync_playwright
import time
import os
import re

def run_verification(page):
    print("Step 1: Setup Sandbox Mode")
    page.goto("http://localhost:8080/login-parent")
    page.evaluate("localStorage.setItem('is_sandbox', 'true')")
    page.reload()
    page.wait_for_timeout(1000)

    print("Step 2: Login as Parent (Mock)")
    page.locator("input#username").fill("parent@demo.com")
    page.locator("input#password").fill("demo1234")
    # Using get_by_role for the submit button
    page.get_by_role("button", name=re.compile("Login|Enter|Sign In", re.I)).click()
    page.wait_for_timeout(3000)

    # Check if we are on the dashboard
    print(f"Current URL: {page.url}")

    # Take screenshot of Dashboard
    page.screenshot(path="/home/jules/verification/screenshots/parent_dashboard.png")
    print("Captured parent_dashboard.png")

    pages_to_verify = [
        ("Performance", "http://localhost:8080/parent/performance"),
        ("Attendance", "http://localhost:8080/parent/attendance"),
        ("Homework", "http://localhost:8080/parent-homework"),
        ("Routine", "http://localhost:8080/parent/routine"),
        ("Finance", "http://localhost:8080/parent/fees")
    ]

    for name, url in pages_to_verify:
        print(f"Verifying {name} at {url}")
        page.goto(url)
        page.wait_for_timeout(2000)
        filename = f"parent_{name.lower()}.png"
        page.screenshot(path=f"/home/jules/verification/screenshots/{filename}")
        print(f"Captured {filename}")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={'width': 1280, 'height': 800}
        )
        page = context.new_page()
        try:
            run_verification(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/screenshots/error_parent_verify.png")
        finally:
            context.close()
            browser.close()
