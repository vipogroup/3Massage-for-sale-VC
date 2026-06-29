/**
 * טופס הזמנה → וואטסאפ + עדכון מלאי (כש-StockApi מחובר)
 */
(function () {
    const COLOR_OPTIONS = [
        { value: 'חום', hex: '#8b5e34' },
        { value: "בז'", hex: '#d4c4a8' },
        { value: 'כחול', hex: '#4a6fa5' }
    ];

    let appConfig = null;
    let isSubmitting = false;

    function $(sel) {
        return document.querySelector(sel);
    }

    function normalizePhone(raw) {
        return String(raw || '').replace(/\D/g, '').replace(/^972/, '').replace(/^0/, '');
    }

    function formatPhoneDisplay(raw) {
        const d = normalizePhone(raw);
        if (d.length === 9) {
            return '0' + d;
        }
        return raw;
    }

    function validatePhone(raw) {
        const d = normalizePhone(raw);
        return /^5\d{8}$/.test(d);
    }

    function getPriceText() {
        const el = document.querySelector('.current-price');
        return el ? el.textContent.trim() : '₪2,900';
    }

    function getSellerWhatsAppUrl(message) {
        const phone = normalizePhone((appConfig && appConfig.contactPhone) || '587009938');
        return `https://wa.me/972${phone}?text=${encodeURIComponent(message)}`;
    }

    function buildOrderMessage(data, orderResult) {
        const product = (appConfig && appConfig.productName) || 'כורסת עיסוי VC - LUXURY';
        const price = getPriceText();
        let msg = `🛒 *הזמנה חדשה מהאתר*\n\n`;
        msg += `מוצר: ${product}\n`;
        msg += `מחיר: ${price}\n\n`;
        msg += `שם: ${data.name}\n`;
        msg += `טלפון: ${formatPhoneDisplay(data.phone)}\n`;
        if (data.color) {
            msg += `צבע: ${data.color}\n`;
        }
        if (data.city) {
            msg += `עיר: ${data.city}\n`;
        }
        if (data.note) {
            msg += `הערות: ${data.note}\n`;
        }
        if (orderResult && orderResult.purchaseNumber) {
            msg += `\nמספר רכישה: #${orderResult.purchaseNumber}`;
        }
        if (orderResult && orderResult.reviewUrl) {
            msg += `\n\n⭐ *קישור ביקורת ללקוח* (העבר לאחר אישור):\n${orderResult.reviewUrl}`;
        }
        msg += `\n\n_נשלח מדף הנחיתה_`;
        return msg;
    }

    function setStatus(msg, type) {
        const el = $('#orderFormStatus');
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'order-form-status' + (type ? ' is-' + type : '');
    }

    function isSoldOut() {
        const remaining = StockApi.getRemaining();
        if (remaining != null) {
            return remaining <= 0;
        }
        const leftEl = document.querySelector('.stock-left-count');
        if (leftEl) {
            return Number(leftEl.textContent) <= 0;
        }
        return false;
    }

    function updateSoldOutUI() {
        const soldOut = isSoldOut();
        document.querySelectorAll('.join-group-btn').forEach(btn => {
            if (soldOut) {
                btn.classList.add('is-sold-out');
                const textEl = btn.querySelector('.btn-text');
                if (textEl) {
                    textEl.textContent = 'אזל המלאי';
                } else if (btn.childNodes.length) {
                    btn.textContent = 'אזל המלאי';
                }
                btn.setAttribute('aria-disabled', 'true');
            }
        });
        const note = $('#orderApiNote');
        if (note && soldOut) {
            note.textContent = 'לצערנו, המלאי במחיר המכולה אזל. ניתן ליצור קשר לבדיקת זמינות.';
            note.classList.add('is-warn');
        }
    }

    function openForm(e) {
        if (e) {
            e.preventDefault();
        }
        if (isSoldOut()) {
            setStatus('המלאי אזל במחיר המכולה.', 'error');
            return;
        }
        const overlay = $('#orderOverlay');
        if (!overlay) return;
        overlay.hidden = false;
        document.body.classList.add('order-open');
        setStatus('');
        const nameInput = $('#orderName');
        if (nameInput) {
            nameInput.focus();
        }
    }

    function closeForm() {
        const overlay = $('#orderOverlay');
        if (overlay) overlay.hidden = true;
        document.body.classList.remove('order-open');
        setStatus('');
        resetColorSelection();
    }

    function getSelectedColor() {
        const input = $('#orderColor');
        return input ? input.value.trim() : '';
    }

    function setSelectedColor(value) {
        const input = $('#orderColor');
        const field = $('#orderColorField');
        if (input) input.value = value || '';
        if (field) field.classList.remove('is-error');
        document.querySelectorAll('.order-color-swatch').forEach((btn) => {
            const selected = btn.dataset.color === value;
            btn.classList.toggle('is-on', selected);
            btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
    }

    function resetColorSelection() {
        setSelectedColor('');
    }

    function bindColorSwatches() {
        const field = $('#orderColorField');
        if (!field) return;
        field.addEventListener('click', (e) => {
            const btn = e.target.closest('.order-color-swatch');
            if (!btn || !field.contains(btn)) return;
            setSelectedColor(btn.dataset.color || '');
            setStatus('');
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (isSubmitting || isSoldOut()) {
            return;
        }

        const name = ($('#orderName') && $('#orderName').value.trim()) || '';
        const phone = ($('#orderPhone') && $('#orderPhone').value.trim()) || '';
        const city = ($('#orderCity') && $('#orderCity').value.trim()) || '';
        const color = getSelectedColor();
        const note = ($('#orderNote') && $('#orderNote').value.trim()) || '';

        if (name.length < 2) {
            setStatus('נא להזין שם מלא', 'error');
            return;
        }
        if (!validatePhone(phone)) {
            setStatus('נא להזין מספר נייד ישראלי תקין (05X)', 'error');
            return;
        }
        if (!color) {
            setStatus('נא לבחור צבע כורסה', 'error');
            const colorField = $('#orderColorField');
            if (colorField) {
                colorField.classList.add('is-error');
                const firstSwatch = colorField.querySelector('.order-color-swatch');
                if (firstSwatch) firstSwatch.focus();
            }
            return;
        }

        isSubmitting = true;
        const btn = $('#orderSubmitBtn');
        if (btn) {
            btn.disabled = true;
            const textEl = btn.querySelector('.order-btn-text');
            if (textEl) textEl.textContent = 'שולח…';
        }

        const orderData = { name, phone, city, color, note };
        let orderResult = null;

        try {
            if (StockApi.isEnabled()) {
                setStatus('שומרים את ההזמנה ומעדכנים מלאי…', 'info');
                orderResult = await StockApi.submitOrder(orderData);
                if (orderResult.error === 'sold_out' || orderResult.ok === false) {
                    setStatus('מצטערים — המלאי נגמר הרגע.', 'error');
                    updateSoldOutUI();
                    return;
                }
            } else {
                setStatus('פותחים וואטסאפ…', 'info');
            }

            const waUrl = getSellerWhatsAppUrl(buildOrderMessage(orderData, orderResult));
            window.open(waUrl, '_blank', 'noopener');

            setStatus(
                StockApi.isEnabled()
                    ? (orderResult && orderResult.reviewUrl
                        ? 'ההזמנה נשמרה. בוואטסאפ יש קישור ביקורת אישי ללקוח.'
                        : 'ההזמנה נשמרה והמלאי עודכן. שלחנו אותך לוואטסאפ.')
                    : 'נפתח וואטסאפ — שלח את ההודעה כדי להשלים את ההזמנה.',
                'ok'
            );

            setTimeout(closeForm, 1800);
        } catch (err) {
            setStatus(err.message || 'שגיאה בשליחה. נסה שוב או צור קשר בוואטסאפ.', 'error');
        } finally {
            isSubmitting = false;
            if (btn) {
                btn.disabled = false;
                const textEl = btn.querySelector('.order-btn-text');
                if (textEl) textEl.textContent = 'שלח הזמנה בוואטסאפ';
            }
        }
    }

    function buildUI() {
        if ($('#orderOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'orderOverlay';
        overlay.hidden = true;
        overlay.innerHTML = `
<div class="order-sheet" role="dialog" aria-labelledby="orderTitle" aria-modal="true">
  <header class="order-sheet-header">
    <button type="button" class="order-back" id="orderCloseBtn" aria-label="חזרה"><i class="fas fa-arrow-right"></i></button>
    <h2 id="orderTitle">הזמנה במחיר מפעל</h2>
    <span class="order-sheet-header-spacer" aria-hidden="true"></span>
  </header>
  <div class="order-sheet-body">
    <div class="order-price-card">
      <span class="order-price-label">מחיר מכולה · VIPO</span>
      <span class="order-price-now current-price">₪2,900</span>
      <span class="order-price-was original-price">₪12,000</span>
    </div>
    <p class="order-lead">מלא/י פרטים — נפתח וואטסאפ עם ההזמנה שלך</p>
    <p class="order-api-note" id="orderApiNote"></p>
    <div class="order-form-card">
      <form id="orderForm" novalidate>
        <label for="orderName">שם מלא *</label>
        <input type="text" id="orderName" class="order-input" required autocomplete="name" placeholder="ישראל ישראלי">
        <label for="orderPhone">נייד *</label>
        <input type="tel" id="orderPhone" class="order-input" required autocomplete="tel" inputmode="tel" placeholder="050-0000000">
        <label id="orderColorLabel">צבע כורסה *</label>
        <div class="order-color-field" id="orderColorField">
          <input type="hidden" id="orderColor" value="">
          <div class="order-color-swatches" role="radiogroup" aria-labelledby="orderColorLabel">
            ${COLOR_OPTIONS.map((c) => `
            <button type="button" class="order-color-swatch" data-color="${c.value}" aria-label="${c.value}" aria-pressed="false">
              <span class="order-color-swatch-dot" style="--swatch:${c.hex}"></span>
              <span class="order-color-swatch-label">${c.value}</span>
            </button>`).join('')}
          </div>
        </div>
        <label for="orderCity">עיר</label>
        <input type="text" id="orderCity" class="order-input" autocomplete="address-level2" placeholder="תל אביב">
        <label for="orderNote">הערות</label>
        <textarea id="orderNote" class="order-input order-textarea" rows="2" placeholder="שאלה, זמן מועדף…"></textarea>
        <button type="submit" class="order-btn order-btn-primary" id="orderSubmitBtn">
          <span class="order-btn-text">שלח הזמנה בוואטסאפ</span>
          <i class="fab fa-whatsapp" aria-hidden="true"></i>
        </button>
        <p class="order-form-status" id="orderFormStatus" aria-live="polite"></p>
        <p class="order-fine">בלחיצה תועבר/י לוואטסאפ עם פרטי ההזמנה. אין חיוב אוטומטי.</p>
        <div class="order-trust-row">
          <span><i class="fas fa-lock"></i> מאובטח</span>
          <span><i class="fas fa-shield-alt"></i> אחריות יצרן</span>
        </div>
      </form>
    </div>
  </div>
</div>`;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (ev) => {
            if (ev.target === overlay) closeForm();
        });
        $('#orderCloseBtn').addEventListener('click', closeForm);
        $('#orderForm').addEventListener('submit', handleSubmit);
        bindColorSwatches();
    }

    function bindTriggers() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.join-group-btn');
            if (!btn || btn.classList.contains('is-sold-out')) {
                return;
            }
            openForm(e);
        });
    }

    function updateApiNote() {
        const note = $('#orderApiNote');
        if (!note) return;
        if (StockApi.isEnabled()) {
            note.hidden = false;
            note.textContent = 'המלאי באתר יתעדכן אוטומטית עם שליחת ההזמנה.';
            note.classList.remove('is-muted');
        } else {
            note.hidden = true;
            note.textContent = '';
        }
    }

    function init(config) {
        appConfig = config;
        buildUI();
        bindTriggers();
        updateApiNote();
        updateSoldOutUI();
    }

    document.addEventListener('vipo:config-loaded', (e) => {
        init(e.detail || {});
    });

    document.addEventListener('vipo:stock-updated', () => {
        updateSoldOutUI();
    });
})();
