from playwright.sync_api import sync_playwright
import time

def run_verification(page):
    print("Step 1: Landing Page Session Start")
    page.goto("http://localhost:8083", wait_until="networkidle")
    page.wait_for_timeout(2000)

    print("Step 2: Login as Admin (Registered User Session)")
    page.goto("http://localhost:8083/login-admin", wait_until="networkidle")
    page.locator("input#username").fill("admin@eduflow.com")
    page.locator("input#password").fill("admin1234")
    page.get_by_role("button", name="Enter Dashboard").click()
    page.wait_for_timeout(5000)

    print("Step 3: Navigate to Visitor Logs & Verify Instrumentation")
    page.goto("http://localhost:8083/admin/visitor-logs", wait_until="networkidle")
    page.wait_for_timeout(5000)

    # Take screenshot of Logs tab with filters
    page.screenshot(path="/home/jules/verification/screenshots/logs_tab.png")

    # Try to expand a session
    try:
        page.locator("table tbody tr").first.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="/home/jules/verification/screenshots/expanded_session.png")
    except:
        print("No sessions to expand")

    print("Step 4: Verify Analytics Tab")
    # Toggling tabs
    page.get_by_role("tab", name="Analytics").click()
    page.wait_for_timeout(3000)
    page.screenshot(path="/home/jules/verification/screenshots/analytics_tab.png")

    print("Step 5: Perform tracked feature action (Take Attendance)")
    page.goto("http://localhost:8083/attendance", wait_until="networkidle")
    page.wait_for_timeout(2000)

    # Go back to logs to see if it registered (it might be in batch, but we can check UI)
    page.goto("http://localhost:8083/admin/visitor-logs", wait_until="networkidle")
    page.wait_for_timeout(2000)

if __name__ == "__main__":
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
            page.screenshot(path="/home/jules/verification/screenshots/error_final.png")
        finally:
            context.close()
            browser.close()
