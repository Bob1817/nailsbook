from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto('http://localhost:5174/designs/4')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='/Users/shibo/Documents/Codex/nailBook/screenshot_designs_4.png', full_page=True)
    print("Screenshot saved")
    input("Press Enter to close...")
    browser.close()
