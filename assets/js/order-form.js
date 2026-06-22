/**
 * טופס הזמנה → וואטסאפ + עדכון מלאי (כש-StockApi מחובר)
 */
(function () {
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

    function buildOrderMessage(data) {
        const product = (appConfig && appConfig.productName) || 'כורסת עיסוי VC';
        const price = getPriceText();
        let msg = `🛒 *הזמנה חדשה מהאתר*\n\n`;
        msg += `מוצר: ${product}\n`;
        msg += `מחיר: ${price}\n\n`;
        msg += `שם: ${data.name}\n`;
        msg += `טלפון: ${formatPhoneDisplay(data.phone)}\n`;
        if (data.city) {
            msg += `עיר: ${data.city}\n`;
        }
        if (data.note) {
            msg += `הערות: ${data.note}\n`;
        }
        msg += `\n_נשלח מדף הנחיתה_`;
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
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (isSubmitting || isSoldOut()) {
            return;
        }

        const name = ($('#orderName') && $('#orderName').value.trim()) || '';
        const phone = ($('#orderPhone') && $('#orderPhone').value.trim()) || '';
        const city = ($('#orderCity') && $('#orderCity').value.trim()) || '';
        const note = ($('#orderNote') && $('#orderNote').value.trim()) || '';

        if (name.length < 2) {
            setStatus('נא להזין שם מלא', 'error');
            return;
        }
        if (!validatePhone(phone)) {
            setStatus('נא להזין מספר נייד ישראלי תקין (05X)', 'error');
            return;
        }

        isSubmitting = true;
        const btn = $('#orderSubmitBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'שולח…';
        }

        const orderData = { name, phone, city, note };

        try {
            if (StockApi.isEnabled()) {
                setStatus('שומרים את ההזמנה ומעדכנים מלאי…', 'info');
                const result = await StockApi.submitOrder(orderData);
                if (result.error === 'sold_out' || result.ok === false) {
                    setStatus('מצטערים — המלאי נגמר הרגע.', 'error');
                    updateSoldOutUI();
                    return;
                }
            } else {
                setStatus('פותחים וואטסאפ…', 'info');
            }

            const waUrl = getSellerWhatsAppUrl(buildOrderMessage(orderData));
            window.open(waUrl, '_blank', 'noopener');

            setStatus(
                StockApi.isEnabled()
                    ? 'ההזמנה נשמרה והמלאי עודכן. שלחנו אותך לוואטסאפ.'
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
                btn.innerHTML = '<span>שלח הזמנה בוואטסאפ</span> <i class="fab fa-whatsapp"></i>';
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
  <button type="button" class="order-close" id="orderCloseBtn" aria-label="סגור">×</button>
  <h2 id="orderTitle">הזמנה במחיר מפעל</h2>
  <p class="order-lead">מלא פרטים — נפתח וואטסאפ עם ההזמנה שלך</p>
  <p class="order-api-note" id="orderApiNote"></p>
  <form id="orderForm" novalidate>
    <label for="orderName">שם מלא *</label>
    <input type="text" id="orderName" class="order-input" required autocomplete="name" placeholder="ישראל ישראלי">
    <label for="orderPhone">נייד *</label>
    <input type="tel" id="orderPhone" class="order-input" required autocomplete="tel" inputmode="tel" placeholder="050-0000000">
    <label for="orderCity">עיר</label>
    <input type="text" id="orderCity" class="order-input" autocomplete="address-level2" placeholder="תל אביב">
    <label for="orderNote">הערות</label>
    <textarea id="orderNote" class="order-input order-textarea" rows="2" placeholder="צבע, שאלה, זמן מועדף…"></textarea>
    <button type="submit" class="order-btn order-btn-primary" id="orderSubmitBtn">
      <span>שלח הזמנה בוואטסאפ</span> <i class="fab fa-whatsapp"></i>
    </button>
    <p class="order-form-status" id="orderFormStatus" aria-live="polite"></p>
    <p class="order-fine">בלחיצה תועבר/י לוואטסאפ עם פרטי ההזמנה. אין חיוב אוטומטי.</p>
  </form>
</div>`;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (ev) => {
            if (ev.target === overlay) closeForm();
        });
        $('#orderCloseBtn').addEventListener('click', closeForm);
        $('#orderForm').addEventListener('submit', handleSubmit);
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
            note.textContent = 'המלאי באתר יתעדכן אוטומטית עם שליחת ההזמנה.';
            note.classList.remove('is-muted');
        } else {
            note.textContent = 'ההזמנה תישלח אליך בוואטסאפ. לעדכון מלאי אוטומטי — יש לחבר Google Sheet (הסבר ב-setup).';
            note.classList.add('is-muted');
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
