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

## Persistence
State is stored in localStorage under key wof.state (labels and rotation). Use wheelAPI.clearState() to clear it.

## Notes
- Spin is disabled while animating or when there are no labels.
- Labels are sanitized to non-empty strings; up to 64 entries.
