from playwright.sync_api import sync_playwright
import time

def run_verification(page):
    print("Navigating to login page...")
    page.goto("http://localhost:8083/login-admin", wait_until="networkidle")

    print("Filling credentials...")
    page.locator("input#username").fill("admin@eduflow.com")
    page.locator("input#password").fill("admin1234")

    print("Submitting login...")
    # Click using coordinate or more precise locator
    page.get_by_role("button", name="Enter Dashboard").click()

    # Wait for URL to change to dashboard
    # Let's check for the text "Admin Panel"
    try:
        page.wait_for_selector("text=Admin Panel", timeout=20000)
    except:
        print("Admin Panel not found.")

    print(f"Current URL: {page.url}")
    page.screenshot(path="/home/jules/verification/screenshots/after_login.png")

    print("Navigating to Visitor Logs directly...")
    page.goto("http://localhost:8083/admin/visitor-logs", wait_until="networkidle")
    page.wait_for_timeout(5000)

    print(f"At Visitor Logs. URL: {page.url}")
    # Take screenshot of Logs tab
    page.screenshot(path="/home/jules/verification/screenshots/logs_tab.png")

    # Switch to Analytics tab
    print("Switching to Analytics tab...")
    # Click using text - tabs in Shadcn are buttons
    page.click("button:has-text('Analytics')")
    page.wait_for_timeout(3000)
    page.screenshot(path="/home/jules/verification/screenshots/analytics_tab.png")

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
            page.screenshot(path="/home/jules/verification/screenshots/error.png")
        finally:
            context.close()
            browser.close()
