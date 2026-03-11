# Tap Tycoon — Claude Code Instructions

## Testing

### Playwright (browser automation)
Use Playwright for automated UI and scroll testing against production or local dev.

**Setup** (already installed as devDependency):
```bash
npx playwright install chromium
```

**Running tests:**
```bash
node <test-file>.js
```

**Pattern used for scroll/UI tests:**
```js
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://basementtycoon.com/', { waitUntil: 'networkidle' });
```

**Production URL:** https://basementtycoon.com/

**Test credentials:**
- Email: `scrolltest@taptycoon.com` / Password: `test123456`

### Scroll test
To verify scroll works on prod, create a temp `scroll-test.js`, run it, then delete it.
Key check: find `div` with `overflowY=auto/scroll` where `scrollHeight > clientHeight`, set `scrollTop = 300`, verify it changed.
