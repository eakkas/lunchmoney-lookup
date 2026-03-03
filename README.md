# LunchMoney Transaction Lookup

A Chrome/Edge extension that adds a lookup sidebar to [LunchMoney](https://my.lunchmoney.app) so you can instantly investigate unrecognized transactions — without leaving the page.

No accounts, no API keys, no OAuth. Just load and go.

## What it does

Hover over any transaction row and click the 🔍 button that appears. The sidebar slides in with:

- **Google** — opens a Google search for the merchant name
- **Gmail** — opens your existing Gmail tab filtered by the transaction amount

Both open in your existing Google/Gmail tabs rather than spawning new ones.

## Installation

> The extension is not on the Chrome Web Store. Load it unpacked in developer mode.

1. Download or clone this repo
2. Open Chrome/Edge and go to `chrome://extensions` or `edge://extensions`
3. Enable **Developer mode** (toggle in the top-right or bottom-left)
4. Click **Load unpacked** and select the `lunchmoney-lookup` folder
5. Navigate to [my.lunchmoney.app/transactions](https://my.lunchmoney.app/transactions)
6. Hover over a transaction row → click 🔍

## Permissions

| Permission | Why |
|------------|-----|
| `tabs` | Navigate your existing Gmail/Google tab instead of opening a new one |
| `my.lunchmoney.app` host | Inject the sidebar into LunchMoney |

## Troubleshooting

**The 🔍 button doesn't appear on rows**
LunchMoney is a React SPA and their DOM can change. Open DevTools, inspect a transaction row, and update `ROW_SELECTORS` in `content/content.js` to match the current structure.

**Gmail opens a new tab anyway**
Make sure you have a Gmail tab open before clicking. The extension looks for an existing `mail.google.com` tab to reuse — if none exists it opens a fresh one.
