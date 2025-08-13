# Wheel of Fortune (Canvas)

A minimal, dependency-free prize wheel. Spins with easing, removes the winning slice after each spin, and persists state across reloads.

## Files
- wheel.html – host page (includes canvas and controls)
- wheel.css – styles
- wheel.js – logic (drawing, spin animation, persistence, APIs)

## Quick start
Open wheel.html in a browser. Click Spin to select a random slice; it’s removed automatically. Click Reset to restore S1–S12.

## Custom labels
You can provide labels at load time via URL or at runtime via an API.

### URL query (on load)
- Comma-separated: wheel.html?labels=Alice,Bob,Carol
- JSON array: wheel.html?labels=["Alice","Bob","Carol"]
- Force defaults: wheel.html?reset

If labels are provided via the URL, they override saved state and are persisted.

### Runtime API (from console)
Inside wheel.html (same window):
- window.wheelAPI.setLabels(["Alice","Bob"]) – set custom labels (max 64)
- window.wheelAPI.spin() – start a spin
- window.wheelAPI.reset() – restore defaults
- window.wheelAPI.getLabels() – get current labels
- window.wheelAPI.getRotation() / setRotation(radians)
- window.wheelAPI.clearState() – remove localStorage state

If wheel.html is embedded in an iframe, call the API on the iframe’s contentWindow, e.g.:
- const w = document.querySelector('iframe').contentWindow;
- w.wheelAPI.setLabels(["A","B"]); w.wheelAPI.spin();

### postMessage bridge
When embedded, you can also control it via postMessage.
- Send:
  - { type: 'setLabels', labels: ["A","B"] }
  - { type: 'spin' }
  - { type: 'reset' }
  - { type: 'getState' }
- Receive reply (same window): { type: '<request>Result', ...payload }

Example:
```
const frame = document.querySelector('iframe');
frame.contentWindow.postMessage({ type: 'setLabels', labels: ['Alice','Bob'] }, '*');
frame.contentWindow.postMessage({ type: 'spin' }, '*');
window.addEventListener('message', e => { if (e.data?.type === 'getStateResult') console.log(e.data); });
frame.contentWindow.postMessage({ type: 'getState' }, '*');
```

## Run in Confluence

Confluence Cloud (recommended: external hosting + iframe macro)
- Host these files on a static site (e.g., DigitalOcean App Platform, Spaces, GitHub Pages).
- Install an iframe/HTML macro from Atlassian Marketplace (search “iframe” or “HTML” macro).
- Add the macro to your page and point it at your hosted wheel.html:
  <iframe src="https://your.domain/wheel.html?labels=Alice,Bob,Carol"
          style="width:100%; max-width:900px; aspect-ratio:1/1; border:0;"></iframe>
- Notes:
  - Confluence Cloud won’t execute arbitrary inline JS; use an iframe macro with an external URL.
  - The URL labels parameter works as shown above.
  - State persists per user/browser (localStorage). For shared state across users, you’ll need a small backend.

Confluence Data Center/Server
Option A — External hosting (simplest)
- Enable the built-in HTML macro (admin).
- Insert an HTML macro and paste the iframe (same as Cloud example).

Option B — Attach files to the page (same-origin)
- Upload wheel.html, wheel.css, wheel.js as attachments to the same page.
- Insert an HTML macro with an iframe to the attachment URL:
  <iframe src="/download/attachments/<PAGE_ID>/wheel.html?labels=Alice,Bob,Carol"
          style="width:100%; max-width:900px; aspect-ratio:1/1; border:0;"></iframe>
  - Replace <PAGE_ID> with your pageId (see the page URL).
  - Relative links in wheel.html will load wheel.css and wheel.js from the same attachments path.
- If you update the files, upload new versions; the URL continues to serve the latest version.

Tips
- Adjust iframe sizing via CSS (width/height or aspect-ratio) to fit your page layout.
- You can drive the wheel from another macro on the same page using postMessage (see above).

## Persistence
State is stored in localStorage under key wof.state (labels and rotation). Use wheelAPI.clearState() to clear it.

## Notes
- Spin is disabled while animating or when there are fewer than 2 labels.
- Labels are sanitized to non-empty strings; up to 64 entries.