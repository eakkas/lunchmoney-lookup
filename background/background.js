// LunchMoney Lookup — Background Service Worker
// Handles tab navigation so Gmail searches reuse an existing tab

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_URL') {
    openInExistingTab(message.url, message.matchPattern)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function openInExistingTab(url, matchPattern) {
  const tabs = await chrome.tabs.query({ url: matchPattern });

  if (tabs.length > 0) {
    // Reuse the first matching tab
    const tab = tabs[0];
    await chrome.tabs.update(tab.id, { url, active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    // No existing tab — open a new one
    await chrome.tabs.create({ url });
  }
}
