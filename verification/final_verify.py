from playwright.sync_api import Page, expect, sync_playwright
import time

def test_final_verification(page: Page):
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err.message}"))

    # 1. Check Login Page
    print("Navigating to login...")
    page.goto("http://localhost:8080/login")
    page.wait_for_load_state("networkidle")
    time.sleep(5)
    page.screenshot(path="verification/final_login.png")

    # 2. Check Admin Recovery Page
    print("Navigating to admin-recovery...")
    page.goto("http://localhost:8080/admin-recovery")
    page.wait_for_load_state("networkidle")
    time.sleep(5)
    page.screenshot(path="verification/final_recovery.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_final_verification(page)
        finally:
            browser.close()
