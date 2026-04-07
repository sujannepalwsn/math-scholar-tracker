from playwright.sync_api import sync_playwright
import time
import os

def run_verification(page):
    # Go to landing page
    print("Navigating to landing page...")
    page.goto("http://localhost:8080")
    page.wait_for_timeout(2000)

    # Enter Sandbox Mode (Instant Sandbox)
    print("Entering Instant Sandbox...")
    sandbox_button = page.get_by_role("button", name="Instant Sandbox")
    if sandbox_button.is_visible():
        sandbox_button.click()
    else:
        # Fallback to direct navigation or finding the link
        page.goto("http://localhost:8080/center-dashboard")

    page.wait_for_timeout(3000)

    # Verify Dashboard
    print("Verifying Dashboard...")
    page.screenshot(path="/home/jules/verification/screenshots/dashboard.png")

    # Navigate to Settings -> Suggestions (Center Admin role in sandbox)
    print("Navigating to Suggestions...")
    page.goto("http://localhost:8080/settings")
    page.wait_for_timeout(2000)

    suggestions_tab = page.get_by_role("tab", name="Suggestions")
    if suggestions_tab.is_visible():
        suggestions_tab.click()
        page.wait_for_timeout(2000)

        # Verify Suggestions list
        print("Verifying Suggestions...")
        page.screenshot(path="/home/jules/verification/screenshots/suggestions.png")
    else:
        print("Suggestions tab not found, attempting direct navigation...")
        # Since it's a tab in CenterSettings, we might need to stay on /settings

    # Check if there are any errors in the console
    print("Verification complete.")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()

        # Log console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))

        try:
            run_verification(page)
        finally:
            context.close()
            browser.close()
