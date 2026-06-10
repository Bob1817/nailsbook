from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    # Navigate to the page
    page.goto('http://localhost:5173/nailbook-app.html')
    page.wait_for_load_state('networkidle')

    # Take full page screenshot
    page.screenshot(path='/tmp/nailbook_design.png', full_page=True)
    print("Screenshot saved to /tmp/nailbook_design.png")

    # Get page title
    title = page.title()
    print(f"Page title: {title}")

    # Get full HTML content
    content = page.content()

    # Save HTML content
    with open('/tmp/nailbook_content.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("HTML content saved to /tmp/nailbook_content.html")

    # Get computed styles for body
    body_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    body_color = page.evaluate("getComputedStyle(document.body).color")
    body_font = page.evaluate("getComputedStyle(document.body).fontFamily")
    print(f"Body background: {body_bg}")
    print(f"Body color: {body_color}")
    print(f"Body font: {body_font}")

    # Get all colors used in the page
    colors = page.evaluate("""
        () => {
            const colors = new Set();
            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
                const style = getComputedStyle(el);
                if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    colors.add(style.backgroundColor);
                }
                if (style.color) {
                    colors.add(style.color);
                }
                if (style.borderColor) {
                    colors.add(style.borderColor);
                }
            });
            return Array.from(colors);
        }
    """)
    print(f"All colors found: {json.dumps(colors, indent=2)}")

    # Get CSS custom properties (design tokens)
    css_vars = page.evaluate("""
        () => {
            const styles = getComputedStyle(document.documentElement);
            const vars = {};
            for (let i = 0; i < styles.length; i++) {
                const prop = styles[i];
                if (prop.startsWith('--')) {
                    vars[prop] = styles.getPropertyValue(prop);
                }
            }
            return vars;
        }
    """)
    print(f"CSS Custom Properties: {json.dumps(css_vars, indent=2)}")

    browser.close()
    print("Done!")
