// LunchMoney Lookup — Content Script
// Injects sidebar and detects transaction clicks

(function () {
  'use strict';

  if (document.getElementById('lm-lookup-sidebar')) return; // already injected

  // ── Inject sidebar HTML ──────────────────────────────────────────────────
  const sidebar = document.createElement('div');
  sidebar.id = 'lm-lookup-sidebar';
  sidebar.innerHTML = `
    <div id="lm-overlay"></div>
    <div id="lm-panel">
      <div id="lm-header">
        <div id="lm-header-info">
          <div id="lm-payee">Select a transaction</div>
          <div id="lm-meta"></div>
        </div>
        <button id="lm-close" title="Close">✕</button>
      </div>

      <div id="lm-body">
        <div class="lm-section">
          <div class="lm-section-title">Google Search</div>
          <button id="lm-google-btn" class="lm-btn lm-btn-icon" disabled>
            <span class="lm-icon lm-icon-google">G</span>
            Search Google for merchant
          </button>
        </div>

        <div class="lm-section">
          <div class="lm-section-title">Gmail</div>
          <button id="lm-gmail-btn" class="lm-btn lm-btn-icon" disabled>
            <span class="lm-icon lm-icon-gmail">M</span>
            Search Gmail by amount
          </button>
          <div id="lm-custom-search">
            <input id="lm-query-input" type="text" placeholder="Custom Gmail query…" />
            <button id="lm-query-btn" class="lm-btn">Search</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(sidebar);

  // ── State ────────────────────────────────────────────────────────────────
  let currentTransaction = null;

  const overlay = document.getElementById('lm-overlay');
  const payeeEl = document.getElementById('lm-payee');
  const metaEl = document.getElementById('lm-meta');
  const googleBtn = document.getElementById('lm-google-btn');
  const gmailBtn = document.getElementById('lm-gmail-btn');
  const queryInput = document.getElementById('lm-query-input');
  const queryBtn = document.getElementById('lm-query-btn');
  const closeBtn = document.getElementById('lm-close');

  // ── Open / Close ─────────────────────────────────────────────────────────
  function openSidebar() { sidebar.classList.add('lm-open'); }
  function closeSidebar() { sidebar.classList.remove('lm-open'); }

  closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  // ── Google search ─────────────────────────────────────────────────────────
  googleBtn.addEventListener('click', () => {
    if (!currentTransaction?.payee) return;
    const url = `https://www.google.com/search?q=${encodeURIComponent(currentTransaction.payee)}`;
    chrome.runtime.sendMessage({ type: 'OPEN_URL', url, matchPattern: '*://www.google.com/*' });
  });

  // ── Gmail search ──────────────────────────────────────────────────────────
  gmailBtn.addEventListener('click', () => openGmail(queryInput.value.trim()));

  queryBtn.addEventListener('click', () => {
    const q = queryInput.value.trim();
    if (q) openGmail(q);
  });

  queryInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') queryBtn.click();
  });

  function openGmail(query) {
    const url = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
    chrome.runtime.sendMessage({ type: 'OPEN_URL', url, matchPattern: '*://mail.google.com/*' });
  }

  function normalizeAmount(raw) {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? raw : num.toFixed(2);
  }

  // ── Transaction selected ──────────────────────────────────────────────────
  function onTransactionSelected(payee, amount, date) {
    currentTransaction = { payee, amount, date };

    payeeEl.textContent = payee || 'Unknown merchant';
    metaEl.textContent = [amount, date].filter(Boolean).join(' · ');

    googleBtn.disabled = !payee;

    const normalAmount = amount ? normalizeAmount(amount) : '';
    queryInput.value = normalAmount;
    gmailBtn.disabled = !normalAmount;

    openSidebar();
  }

  // ── Extract data from a transaction row ───────────────────────────────────
  function isDate(text) {
    // Matches: "Dec 31, 2025" / "Dec 31 2025" / "12/31/2025" / "2025-12-31"
    return /^[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}$/.test(text) ||
           /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(text) ||
           /^\d{4}-\d{2}-\d{2}$/.test(text);
  }

  function isAmount(text) {
    // Matches: "$45.67" / "-$45.67" / "45.67"
    return /^-?[\$€£¥]?\s*\d+\.\d{2}$/.test(text);
  }

  function extractFromRow(row) {
    const cells = row.querySelectorAll('td, [class*="cell"], [class*="Cell"]');
    let payee = null, amount = null, date = null;

    for (const cell of cells) {
      const text = cell.textContent.trim();
      if (!text) continue;

      if (!amount && isAmount(text)) {
        amount = text;
      } else if (!date && isDate(text)) {
        date = text;
      } else if (!payee && text.length > 1 && text.length < 100 && !/^\$?[\d,.-]+$/.test(text)) {
        payee = text;
      }
    }

    return { payee, amount, date };
  }

  // ── Row listeners ─────────────────────────────────────────────────────────
  function attachRowListeners(rows) {
    rows.forEach(row => {
      if (row.dataset.lmAttached) return;
      row.dataset.lmAttached = '1';

      const existingPosition = getComputedStyle(row).position;
      if (existingPosition === 'static') row.style.position = 'relative';

      const trigger = document.createElement('button');
      trigger.className = 'lm-trigger';
      trigger.title = 'Lookup transaction';
      trigger.textContent = '🔍';
      row.appendChild(trigger);

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const data = extractFromRow(row);
        if (data.payee || data.amount) onTransactionSelected(data.payee, data.amount, data.date);
      });
    });
  }

  // ── DOM selectors for LunchMoney transaction rows ─────────────────────────
  const ROW_SELECTORS = [
    'tr.MuiTableRow-root',
    '[class*="TransactionRow"]',
    '[class*="transaction-row"]',
    'tr[data-transaction-id]',
    '.transactions-table tr',
    'table tr[class]',
  ];

  function findTransactionRows() {
    for (const sel of ROW_SELECTORS) {
      const rows = document.querySelectorAll(sel);
      if (rows.length > 0) return rows;
    }
    return [];
  }

  // ── MutationObserver for React SPA ───────────────────────────────────────
  const observer = new MutationObserver(() => attachRowListeners(findTransactionRows()));
  observer.observe(document.body, { childList: true, subtree: true });
  attachRowListeners(findTransactionRows());

})();
