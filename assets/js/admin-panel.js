/**
 * פאנל מנהל — עדכון מלאי בלחיצה
 * פתיחה: לחיצה שלוש פעמים על לוגו VIPO CONNECT, או ?admin=1 בכתובת
 */
(function () {
    const PIN_SESSION = 'vipo-admin-authed';
    let appConfig = null;
    let draft = { totalUnits: 54, soldUnits: 0 };

    function $(sel) {
        return document.querySelector(sel);
    }

    function remaining() {
        return Math.max(0, draft.totalUnits - draft.soldUnits);
    }

    function isAuthed() {
        try {
            return sessionStorage.getItem(PIN_SESSION) === '1';
        } catch (e) {
            return false;
        }
    }

    function setAuthed(value) {
        try {
            if (value) {
                sessionStorage.setItem(PIN_SESSION, '1');
            } else {
                sessionStorage.removeItem(PIN_SESSION);
            }
        } catch (e) {
            /* ignore */
        }
    }

    function getAdminPin() {
        const live = appConfig && appConfig.stockLive;
        return (live && live.adminPin) || '8426';
    }

    function renderDraft() {
        const leftEl = $('#adminStockLeft');
        const soldEl = $('#adminSoldUnits');
        const totalEl = $('#adminTotalUnits');
        if (leftEl) leftEl.textContent = remaining();
        if (soldEl) soldEl.value = draft.soldUnits;
        if (totalEl) totalEl.value = draft.totalUnits;
    }

    function previewOnPage() {
        if (typeof window.updateStockFomo === 'function') {
            window.updateStockFomo(draft.totalUnits, draft.soldUnits);
        }
    }

    function setStatus(msg, type) {
        const el = $('#adminStatus');
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'admin-status' + (type ? ' is-' + type : '');
    }

    function openPanel() {
        const overlay = $('#adminOverlay');
        if (!overlay) return;
        overlay.hidden = false;
        document.body.classList.add('admin-open');

        if (!isAuthed()) {
            $('#adminPinGate').hidden = false;
            $('#adminStockPanel').hidden = true;
            const pinInput = $('#adminPinInput');
            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
        } else {
            showStockPanel();
        }
    }

    function closePanel() {
        const overlay = $('#adminOverlay');
        if (overlay) overlay.hidden = true;
        document.body.classList.remove('admin-open');
        setStatus('');
    }

    function showStockPanel() {
        $('#adminPinGate').hidden = true;
        $('#adminStockPanel').hidden = false;

        const stock = StockLive.getLastStock();
        if (stock) {
            draft.totalUnits = stock.totalUnits;
            draft.soldUnits = stock.soldUnits;
        } else if (appConfig) {
            draft.totalUnits = Number(appConfig.totalUnits) || 54;
            draft.soldUnits = Number(appConfig.soldUnits) || 0;
        }

        renderDraft();

        const setup = $('#adminSetupNote');
        const keyRow = $('#adminKeyRow');
        if (setup) {
            setup.hidden = StockLive.isEnabled();
        }
        if (keyRow) {
            keyRow.hidden = !StockLive.isEnabled();
            const keyInput = $('#adminMasterKey');
            if (keyInput && StockLive.getMasterKey()) {
                keyInput.placeholder = 'Master Key שמור לסשן זה ✓';
            }
        }
    }

    function verifyPin() {
        const pin = ($('#adminPinInput') && $('#adminPinInput').value) || '';
        if (pin !== getAdminPin()) {
            setStatus('קוד מנהל שגוי', 'error');
            return;
        }
        setAuthed(true);
        setStatus('');
        showStockPanel();
    }

    function adjustSold(delta) {
        draft.soldUnits = Math.max(0, Math.min(draft.totalUnits, draft.soldUnits + delta));
        renderDraft();
        previewOnPage();
    }

    function bindInputs() {
        const soldEl = $('#adminSoldUnits');
        const totalEl = $('#adminTotalUnits');
        if (soldEl) {
            soldEl.addEventListener('input', () => {
                draft.soldUnits = Math.max(0, Math.min(draft.totalUnits, Number(soldEl.value) || 0));
                renderDraft();
                previewOnPage();
            });
        }
        if (totalEl) {
            totalEl.addEventListener('input', () => {
                draft.totalUnits = Math.max(1, Number(totalEl.value) || 1);
                draft.soldUnits = Math.min(draft.soldUnits, draft.totalUnits);
                renderDraft();
                previewOnPage();
            });
        }
    }

    async function saveStock() {
        if (!StockLive.isEnabled()) {
            setStatus('יש להפעיל stockLive ב-config.json (ראה הוראות למעלה)', 'error');
            return;
        }

        const keyInput = $('#adminMasterKey');
        const masterKey = (keyInput && keyInput.value.trim()) || StockLive.getMasterKey();
        const btn = $('#adminSaveBtn');
        if (btn) btn.disabled = true;
        setStatus('שומר…', 'info');

        try {
            await StockLive.saveStock(draft.totalUnits, draft.soldUnits, masterKey);
            if (keyInput) keyInput.value = '';
            setStatus('נשמר! כל המבקרים יראו את העדכון תוך כמה שניות.', 'ok');
        } catch (err) {
            setStatus(err.message || 'שגיאה בשמירה', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function buildUI() {
        if ($('#adminOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'adminOverlay';
        overlay.hidden = true;
        overlay.innerHTML = `
<div class="admin-sheet" role="dialog" aria-labelledby="adminTitle" aria-modal="true">
  <button type="button" class="admin-close" id="adminCloseBtn" aria-label="סגור">×</button>
  <h2 id="adminTitle">ניהול מלאי</h2>

  <div id="adminPinGate">
    <p class="admin-lead">הזן קוד מנהל</p>
    <input type="password" id="adminPinInput" class="admin-input" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="קוד">
    <button type="button" class="admin-btn admin-btn-primary" id="adminPinBtn">כניסה</button>
  </div>

  <div id="adminStockPanel" hidden>
    <div id="adminSetupNote" class="admin-setup" hidden>
      <strong>הפעלה חד-פעמית (5 דק׳):</strong>
      <ol>
        <li>צור חשבון ב-<a href="https://jsonbin.io" target="_blank" rel="noopener">jsonbin.io</a></li>
        <li>צור Bin עם: <code>{"totalUnits":54,"soldUnits":25}</code></li>
        <li>העתק Bin ID ו-Master Key ל-<code>config.json</code> → <code>stockLive</code></li>
        <li>הגדר <code>"enabled": true</code> ושמור</li>
      </ol>
    </div>

    <div class="admin-stats">
      <div class="admin-stat">
        <span class="admin-stat-label">נותרו</span>
        <span class="admin-stat-value" id="adminStockLeft">—</span>
      </div>
      <div class="admin-stat">
        <span class="admin-stat-label">נמכרו</span>
        <input type="number" id="adminSoldUnits" class="admin-input admin-input-num" min="0">
      </div>
      <div class="admin-stat">
        <span class="admin-stat-label">סה״כ במכולה</span>
        <input type="number" id="adminTotalUnits" class="admin-input admin-input-num" min="1">
      </div>
    </div>

    <div class="admin-quick">
      <span class="admin-quick-label">הזמנה חדשה:</span>
      <button type="button" class="admin-btn" id="adminSoldPlus1">+1 נמכר</button>
      <button type="button" class="admin-btn" id="adminSoldMinus1">−1</button>
    </div>

    <div id="adminKeyRow" class="admin-key-row" hidden>
      <label for="adminMasterKey">Master Key (JSONBin)</label>
      <input type="password" id="adminMasterKey" class="admin-input" autocomplete="off" placeholder="מוזן פעם אחת לסשן">
    </div>

    <button type="button" class="admin-btn admin-btn-primary admin-btn-save" id="adminSaveBtn">שמור לכל האתר</button>
    <p class="admin-status" id="adminStatus" aria-live="polite"></p>
  </div>
</div>`;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closePanel();
        });
        $('#adminCloseBtn').addEventListener('click', closePanel);
        $('#adminPinBtn').addEventListener('click', verifyPin);
        $('#adminPinInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') verifyPin();
        });
        $('#adminSoldPlus1').addEventListener('click', () => adjustSold(1));
        $('#adminSoldMinus1').addEventListener('click', () => adjustSold(-1));
        $('#adminSaveBtn').addEventListener('click', saveStock);
        bindInputs();
    }

    function bindLogoTrigger() {
        const logo = document.querySelector('.logo-btn');
        if (!logo) return;
        let clicks = 0;
        let timer = null;
        logo.addEventListener('click', (e) => {
            clicks += 1;
            clearTimeout(timer);
            timer = setTimeout(() => { clicks = 0; }, 700);
            if (clicks >= 3) {
                clicks = 0;
                e.preventDefault();
                openPanel();
            }
        });
    }

    function init(config) {
        appConfig = config;
        buildUI();
        bindLogoTrigger();

        if (new URLSearchParams(window.location.search).get('admin') === '1') {
            openPanel();
        }
    }

    document.addEventListener('vipo:config-loaded', (e) => {
        init(e.detail || {});
    });
})();
