/**
 * טופס הזמנה → וואטסאפ + עדכון מלאי (כש-StockApi מחובר)
 */
(function () {
    const COLOR_OPTIONS = [
        { value: 'חום', hex: '#8b5e34' },
        { value: "בז'", hex: '#d4c4a8' },
        { value: 'כחול', hex: '#4a6fa5' }
    ];

    const PAYMENT_OPTIONS = [
        { value: 'העברה בנקאית', label: 'העברה בנקאית' },
        { value: 'אשראי (טלפוני)', label: 'אשראי טלפוני' },
        { value: 'Bit', label: 'Bit' },
        { value: 'מזומן במסירה', label: 'מזומן במסירה' }
    ];

    const DELIVERY_BASE = 400;
    const DELIVERY_INCLUDED_KM = 40;
    const DELIVERY_EXTRA_PER_10KM = 100;

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

    function validateZip(raw) {
        return /^\d{5,7}$/.test(String(raw || '').replace(/\D/g, ''));
    }

    function getProductPrice() {
        if (appConfig && appConfig.discountPrice != null) {
            return Number(appConfig.discountPrice);
        }
        const el = document.querySelector('.current-price');
        if (el) {
            const n = Number(String(el.textContent).replace(/[^\d]/g, ''));
            if (n) return n;
        }
        return 2900;
    }

    function formatMoney(amount) {
        return '₪' + Number(amount).toLocaleString('he-IL');
    }

    function calcDeliveryCost(km) {
        const distance = Number(km);
        if (!distance || distance <= 0) return null;
        if (distance <= DELIVERY_INCLUDED_KM) return DELIVERY_BASE;
        const extraBlocks = Math.ceil((distance - DELIVERY_INCLUDED_KM) / 10);
        return DELIVERY_BASE + extraBlocks * DELIVERY_EXTRA_PER_10KM;
    }

    function getSellerWhatsAppUrl(message) {
        const phone = normalizePhone((appConfig && appConfig.contactPhone) || '587009938');
        return `https://wa.me/972${phone}?text=${encodeURIComponent(message)}`;
    }

    function buildOrderNote(data) {
        const parts = [];
        if (data.note) parts.push(data.note);
        parts.push('תשלום: ' + data.payment);
        parts.push(data.deliveryType === 'delivery' ? 'משלוח עד הבית' : 'איסוף עצמי');
        if (data.deliveryType === 'delivery') {
            parts.push('כתובת: ' + data.addressFull);
            parts.push('מרחק: ' + data.distanceKm + ' ק"מ');
            parts.push('משלוח: ' + formatMoney(data.deliveryCost));
        }
        parts.push('סה"כ: ' + formatMoney(data.totalPrice));
        return parts.join(' | ');
    }

    function buildOrderMessage(data, orderResult) {
        const product = (appConfig && appConfig.productName) || 'כורסת עיסוי VC - LUXURY';
        let msg = `🛒 *הזמנה חדשה מהאתר*\n\n`;
        msg += `מוצר: ${product}\n`;
        msg += `מחיר כורסה: ${formatMoney(data.productPrice)}\n`;
        if (data.deliveryType === 'delivery') {
            msg += `משלוח (${data.distanceKm} ק"מ): ${formatMoney(data.deliveryCost)}\n`;
        } else {
            msg += `משלוח: איסוף עצמי (ללא עלות)\n`;
        }
        msg += `*סה"כ: ${formatMoney(data.totalPrice)}*\n`;
        msg += `תשלום: ${data.payment}\n\n`;
        msg += `שם: ${data.name}\n`;
        msg += `טלפון: ${formatPhoneDisplay(data.phone)}\n`;
        if (data.color) {
            msg += `צבע: ${data.color}\n`;
        }
        if (data.deliveryType === 'delivery') {
            msg += `עיר: ${data.city}\n`;
            msg += `כתובת: ${data.street} ${data.houseNumber}`;
            if (data.apartment) msg += `, ${data.apartment}`;
            msg += `\nמיקוד: ${data.zip}\n`;
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
        updatePriceSummary();
        const nameInput = $('#orderName');
        if (nameInput && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            nameInput.focus();
        }
    }

    function resetChoiceField(fieldId, inputId) {
        const field = $(fieldId);
        const input = $(inputId);
        if (input) input.value = '';
        if (field) {
            field.classList.remove('is-error');
            field.querySelectorAll('.order-choice-btn').forEach((btn) => {
                btn.classList.remove('is-on');
                btn.setAttribute('aria-pressed', 'false');
            });
        }
    }

    function resetFormState() {
        resetColorSelection();
        resetChoiceField('#orderPaymentField', '#orderPayment');
        resetChoiceField('#orderDeliveryField', '#orderDelivery');
        const panel = $('#orderDeliveryPanel');
        if (panel) panel.hidden = true;
        ['#orderDelCity', '#orderDelStreet', '#orderDelHouse', '#orderDelApt', '#orderDelZip', '#orderDelKm'].forEach((sel) => {
            const el = $(sel);
            if (el) el.value = '';
        });
        updatePriceSummary();
    }

    function closeForm() {
        const overlay = $('#orderOverlay');
        if (overlay) overlay.hidden = true;
        document.body.classList.remove('order-open');
        setStatus('');
        resetFormState();
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

    function setChoiceValue(fieldSelector, inputSelector, value) {
        const field = $(fieldSelector);
        const input = $(inputSelector);
        if (input) input.value = value || '';
        if (field) {
            field.classList.remove('is-error');
            field.querySelectorAll('.order-choice-btn').forEach((btn) => {
                const selected = btn.dataset.value === value;
                btn.classList.toggle('is-on', selected);
                btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
            });
        }
    }

    function getChoiceValue(inputSelector) {
        const input = $(inputSelector);
        return input ? input.value.trim() : '';
    }

    function toggleDeliveryPanel() {
        const deliveryType = getChoiceValue('#orderDelivery');
        const panel = $('#orderDeliveryPanel');
        if (!panel) return;
        panel.hidden = deliveryType !== 'delivery';
        updatePriceSummary();
    }

    function updatePriceSummary() {
        const productPrice = getProductPrice();
        const deliveryType = getChoiceValue('#orderDelivery');
        const kmInput = $('#orderDelKm');
        const km = kmInput ? kmInput.value.trim() : '';
        const deliveryCost = deliveryType === 'delivery' ? calcDeliveryCost(km) : 0;
        const total = productPrice + (deliveryCost || 0);

        const productEl = $('#orderProductPrice');
        const deliveryLine = $('#orderDeliveryLine');
        const deliveryPriceEl = $('#orderDeliveryPrice');
        const totalEl = $('#orderTotalPrice');

        if (productEl) productEl.textContent = formatMoney(productPrice);
        if (deliveryLine) deliveryLine.hidden = deliveryType !== 'delivery';
        if (deliveryPriceEl) {
            deliveryPriceEl.textContent = deliveryCost != null ? formatMoney(deliveryCost) : '—';
        }
        if (totalEl) totalEl.textContent = formatMoney(total);
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

    function bindChoiceGroup(fieldSelector, inputSelector, onChange) {
        const field = $(fieldSelector);
        if (!field) return;
        field.addEventListener('click', (e) => {
            const btn = e.target.closest('.order-choice-btn');
            if (!btn || !field.contains(btn)) return;
            setChoiceValue(fieldSelector, inputSelector, btn.dataset.value || '');
            setStatus('');
            if (onChange) onChange();
        });
    }

    function bindDeliveryInputs() {
        const panel = $('#orderDeliveryPanel');
        if (!panel) return;
        panel.addEventListener('input', updatePriceSummary);
    }

    function collectFormData() {
        const deliveryType = getChoiceValue('#orderDelivery');
        const km = ($('#orderDelKm') && $('#orderDelKm').value.trim()) || '';
        const productPrice = getProductPrice();
        const deliveryCost = deliveryType === 'delivery' ? (calcDeliveryCost(km) || 0) : 0;
        const city = deliveryType === 'delivery' ? (($('#orderDelCity') && $('#orderDelCity').value.trim()) || '') : '';
        const street = deliveryType === 'delivery' ? (($('#orderDelStreet') && $('#orderDelStreet').value.trim()) || '') : '';
        const houseNumber = deliveryType === 'delivery' ? (($('#orderDelHouse') && $('#orderDelHouse').value.trim()) || '') : '';
        const apartment = deliveryType === 'delivery' ? (($('#orderDelApt') && $('#orderDelApt').value.trim()) || '') : '';
        const zip = deliveryType === 'delivery' ? String(($('#orderDelZip') && $('#orderDelZip').value) || '').replace(/\D/g, '') : '';

        let addressFull = '';
        if (deliveryType === 'delivery') {
            addressFull = [street, houseNumber, apartment, city, zip].filter(Boolean).join(', ');
        }

        return {
            name: ($('#orderName') && $('#orderName').value.trim()) || '',
            phone: ($('#orderPhone') && $('#orderPhone').value.trim()) || '',
            color: getSelectedColor(),
            payment: getChoiceValue('#orderPayment'),
            deliveryType,
            city,
            street,
            houseNumber,
            apartment,
            zip,
            distanceKm: km,
            deliveryCost,
            productPrice,
            totalPrice: productPrice + deliveryCost,
            addressFull,
            note: ($('#orderNote') && $('#orderNote').value.trim()) || ''
        };
    }

    function validateFormData(data) {
        if (data.name.length < 2) {
            setStatus('נא להזין שם מלא', 'error');
            return false;
        }
        if (!validatePhone(data.phone)) {
            setStatus('נא להזין מספר נייד ישראלי תקין (05X)', 'error');
            return false;
        }
        if (!data.color) {
            setStatus('נא לבחור צבע כורסה', 'error');
            const colorField = $('#orderColorField');
            if (colorField) {
                colorField.classList.add('is-error');
                const firstSwatch = colorField.querySelector('.order-color-swatch');
                if (firstSwatch) firstSwatch.focus();
            }
            return false;
        }
        if (!data.payment) {
            setStatus('נא לבחור אופן תשלום', 'error');
            const field = $('#orderPaymentField');
            if (field) field.classList.add('is-error');
            return false;
        }
        if (!data.deliveryType) {
            setStatus('נא לבחור איסוף עצמי או משלוח', 'error');
            const field = $('#orderDeliveryField');
            if (field) field.classList.add('is-error');
            return false;
        }
        if (data.deliveryType === 'delivery') {
            if (!data.city || data.city.length < 2) {
                setStatus('נא להזין עיר למשלוח', 'error');
                $('#orderDelCity') && $('#orderDelCity').focus();
                return false;
            }
            if (!data.street || data.street.length < 2) {
                setStatus('נא להזין רחוב', 'error');
                $('#orderDelStreet') && $('#orderDelStreet').focus();
                return false;
            }
            if (!data.houseNumber) {
                setStatus('נא להזין מספר בית', 'error');
                $('#orderDelHouse') && $('#orderDelHouse').focus();
                return false;
            }
            if (!validateZip(data.zip)) {
                setStatus('נא להזין מיקוד תקין (5–7 ספרות)', 'error');
                $('#orderDelZip') && $('#orderDelZip').focus();
                return false;
            }
            if (!data.distanceKm || calcDeliveryCost(data.distanceKm) == null) {
                setStatus('נא להזין מרחק משוער בק"מ (מספר חיובי)', 'error');
                $('#orderDelKm') && $('#orderDelKm').focus();
                return false;
            }
        }
        return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (isSubmitting || isSoldOut()) {
            return;
        }

        const data = collectFormData();
        if (!validateFormData(data)) {
            return;
        }

        isSubmitting = true;
        const btn = $('#orderSubmitBtn');
        if (btn) {
            btn.disabled = true;
            const textEl = btn.querySelector('.order-btn-text');
            if (textEl) textEl.textContent = 'שולח…';
        }

        const orderData = {
            name: data.name,
            phone: data.phone,
            city: data.city,
            color: data.color,
            note: buildOrderNote(data),
            payment: data.payment,
            deliveryType: data.deliveryType,
            deliveryCost: data.deliveryCost,
            totalPrice: data.totalPrice,
            address: data.addressFull,
            distanceKm: data.distanceKm
        };

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

            const waUrl = getSellerWhatsAppUrl(buildOrderMessage(data, orderResult));
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
    <div class="order-form-card">
      <p class="order-lead">מלא/י פרטים — נפתח וואטסאפ עם ההזמנה שלך</p>
      <p class="order-api-note" id="orderApiNote"></p>
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
        <label id="orderPaymentLabel">אופן תשלום *</label>
        <div class="order-choice-field" id="orderPaymentField">
          <input type="hidden" id="orderPayment" value="">
          <div class="order-choice-grid" role="radiogroup" aria-labelledby="orderPaymentLabel">
            ${PAYMENT_OPTIONS.map((p) => `
            <button type="button" class="order-choice-btn" data-value="${p.value}" aria-pressed="false">${p.label}</button>`).join('')}
          </div>
        </div>
        <label id="orderDeliveryLabel">קבלת ההזמנה *</label>
        <div class="order-choice-field" id="orderDeliveryField">
          <input type="hidden" id="orderDelivery" value="">
          <div class="order-choice-row" role="radiogroup" aria-labelledby="orderDeliveryLabel">
            <button type="button" class="order-choice-btn order-choice-btn-wide" data-value="pickup" aria-pressed="false">
              <span class="order-choice-title">איסוף עצמי</span>
              <span class="order-choice-sub">ללא עלות</span>
            </button>
            <button type="button" class="order-choice-btn order-choice-btn-wide" data-value="delivery" aria-pressed="false">
              <span class="order-choice-title">משלוח עד הבית</span>
              <span class="order-choice-sub">מ-${formatMoney(DELIVERY_BASE)}</span>
            </button>
          </div>
        </div>
        <div class="order-delivery-panel" id="orderDeliveryPanel" hidden>
          <p class="order-panel-hint">משלוח כורסה: ${formatMoney(DELIVERY_BASE)} עד ${DELIVERY_INCLUDED_KM} ק"מ · מעל כך ${formatMoney(DELIVERY_EXTRA_PER_10KM)} לכל 10 ק"מ</p>
          <label for="orderDelCity">עיר *</label>
          <input type="text" id="orderDelCity" class="order-input" autocomplete="address-level2" placeholder="תל אביב">
          <div class="order-field-row">
            <div class="order-field-col">
              <label for="orderDelStreet">רחוב *</label>
              <input type="text" id="orderDelStreet" class="order-input" autocomplete="street-address" placeholder="הרצל">
            </div>
            <div class="order-field-col order-field-col-narrow">
              <label for="orderDelHouse">מס' *</label>
              <input type="text" id="orderDelHouse" class="order-input" inputmode="numeric" placeholder="12">
            </div>
          </div>
          <div class="order-field-row">
            <div class="order-field-col">
              <label for="orderDelApt">דירה / קומה</label>
              <input type="text" id="orderDelApt" class="order-input" placeholder="דירה 3">
            </div>
            <div class="order-field-col">
              <label for="orderDelZip">מיקוד *</label>
              <input type="text" id="orderDelZip" class="order-input" inputmode="numeric" autocomplete="postal-code" placeholder="1234567" maxlength="7">
            </div>
          </div>
          <label for="orderDelKm">מרחק משוער מהמרכז (ק"מ) *</label>
          <input type="number" id="orderDelKm" class="order-input" min="1" step="1" inputmode="numeric" placeholder="35">
        </div>
        <label for="orderNote">הערות</label>
        <textarea id="orderNote" class="order-input order-textarea" rows="2" placeholder="שאלה, זמן מועדף…"></textarea>
        <div class="order-price-row" aria-label="סיכום מחיר">
          <span class="order-price-label">סיכום הזמנה</span>
          <div class="order-price-breakdown">
            <div class="order-price-line">
              <span>כורסה (מחיר מכולה)</span>
              <span id="orderProductPrice" class="order-product-price">₪2,900</span>
            </div>
            <div class="order-price-line" id="orderDeliveryLine" hidden>
              <span>משלוח</span>
              <span id="orderDeliveryPrice">—</span>
            </div>
            <div class="order-price-line order-price-line-total">
              <span>סה״כ לתשלום</span>
              <span id="orderTotalPrice" class="order-price-now">₪2,900</span>
            </div>
          </div>
          <span class="order-price-was original-price">מחיר שוק: ₪12,000</span>
        </div>
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
        bindChoiceGroup('#orderPaymentField', '#orderPayment');
        bindChoiceGroup('#orderDeliveryField', '#orderDelivery', toggleDeliveryPanel);
        bindDeliveryInputs();
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
        updatePriceSummary();
    }

    document.addEventListener('vipo:config-loaded', (e) => {
        init(e.detail || {});
    });

    document.addEventListener('vipo:stock-updated', () => {
        updateSoldOutUI();
    });
})();
