/**
 * VIPO — מלאי + הזמנות + רוכשים + ביקורות (קישור אישי + אישור)
 * Deploy → Web app → Anyone
 *
 * ReviewsPending: סטטוס "מאושר" = מופיע באתר | "נדחה" / "ממתין" = לא
 * ReviewTokens: טוקן לקישור אישי אחרי רכישה
 */
const SHEET_ID = 'PUT_YOUR_SHEET_ID_HERE';
const DEFAULT_TOTAL = 54;
const DEFAULT_SOLD = 25;
const REVIEW_SITE_URL = 'https://vipogroup.github.io/3Massage-for-sale-VC/review.html';
const REVIEW_TOKEN_DAYS = 90;

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function abbrevName_(full) {
  full = String(full || '').trim();
  if (!full) return 'רוכש';
  var parts = full.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0) + '.';
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.';
}

function formatDateIso_(value) {
  if (!value) return '';
  var d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function isTruthy_(value) {
  var v = String(value || '').trim().toLowerCase();
  return v === 'כן' || v === 'yes' || v === 'true' || v === '1';
}

function isShowPublic_(value) {
  return isTruthy_(value);
}

function isReviewApproved_(value) {
  var v = String(value || '').trim().toLowerCase();
  return v === 'מאושר' || v === 'approved' || v === 'כן';
}

function ensurePublicBuyers_() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName('PublicBuyers');
  if (!sh) {
    sh = ss.insertSheet('PublicBuyers');
    sh.getRange(1, 1, 1, 5).setValues([['מספר', 'שם_מוצג', 'צבע', 'תאריך', 'הצג_באתר']]);
  }
  return sh;
}

function ensureReviewTokens_() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName('ReviewTokens');
  if (!sh) {
    sh = ss.insertSheet('ReviewTokens');
    sh.getRange(1, 1, 1, 8).setValues([[
      'token', 'purchaseNumber', 'displayName', 'color', 'phone', 'created', 'expires', 'used'
    ]]);
  }
  return sh;
}

function ensureReviewsPending_() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName('ReviewsPending');
  if (!sh) {
    sh = ss.insertSheet('ReviewsPending');
    sh.getRange(1, 1, 1, 8).setValues([[
      'submitted', 'token', 'purchaseNumber', 'displayName', 'stars', 'text', 'status', 'moderatedAt'
    ]]);
  }
  return sh;
}

function ensureSetup_() {
  var ss = getSpreadsheet_();
  var stock = ss.getSheetByName('Stock');
  if (!stock) {
    stock = ss.insertSheet('Stock');
    stock.getRange(1, 1, 2, 2).setValues([
      ['totalUnits', DEFAULT_TOTAL],
      ['soldUnits', DEFAULT_SOLD]
    ]);
  }
  var orders = ss.getSheetByName('Orders');
  if (!orders) {
    orders = ss.insertSheet('Orders');
    orders.getRange(1, 1, 1, 9).setValues([[
      'תאריך', 'שם', 'טלפון', 'עיר', 'צבע', 'הערות', 'מוצר', 'reviewToken', 'purchaseNumber'
    ]]);
  }
  ensurePublicBuyers_();
  ensureReviewTokens_();
  ensureReviewsPending_();
  return { setup: true };
}

function generateReviewToken_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function buildReviewUrl_(token) {
  return REVIEW_SITE_URL + '?token=' + encodeURIComponent(token);
}

function findTokenRow_(token) {
  var sh = ensureReviewTokens_();
  var data = sh.getDataRange().getValues();
  var needle = String(token || '').trim().toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === needle) {
      return { row: i + 1, data: data[i], sheet: sh };
    }
  }
  return null;
}

function createReviewTokenForOrder_(purchaseNumber, name, color, phone) {
  var sh = ensureReviewTokens_();
  var token = generateReviewToken_();
  var now = new Date();
  var expires = new Date(now.getTime() + REVIEW_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  sh.appendRow([
    token,
    purchaseNumber,
    abbrevName_(name),
    color || '',
    String(phone || ''),
    now,
    expires,
    'לא'
  ]);
  return token;
}

function getStock_() {
  ensureSetup_();
  var sh = getSpreadsheet_().getSheetByName('Stock');
  var totalUnits = Number(sh.getRange(1, 2).getValue()) || 0;
  var soldUnits = Number(sh.getRange(2, 2).getValue()) || 0;
  return {
    totalUnits: totalUnits,
    soldUnits: soldUnits,
    remaining: Math.max(0, totalUnits - soldUnits)
  };
}

function getBuyers_() {
  ensureSetup_();
  var sh = getSpreadsheet_().getSheetByName('PublicBuyers');
  var data = sh.getDataRange().getValues();
  var buyers = [];
  for (var i = 1; i < data.length; i++) {
    if (!isShowPublic_(data[i][4])) continue;
    buyers.push({
      number: Number(data[i][0]),
      name: String(data[i][1] || ''),
      color: String(data[i][2] || ''),
      date: formatDateIso_(data[i][3])
    });
  }
  buyers.sort(function (a, b) { return b.number - a.number; });
  return { ok: true, buyers: buyers };
}

function getReviews_() {
  ensureSetup_();
  var sh = getSpreadsheet_().getSheetByName('ReviewsPending');
  if (!sh) return { ok: true, reviews: [] };
  var data = sh.getDataRange().getValues();
  var reviews = [];
  for (var i = 1; i < data.length; i++) {
    if (!isReviewApproved_(data[i][6])) continue;
    reviews.push({
      name: String(data[i][3] || ''),
      text: String(data[i][5] || ''),
      stars: Number(data[i][4]) || 5
    });
  }
  reviews.reverse();
  return { ok: true, reviews: reviews };
}

function validateReviewToken_(token) {
  ensureSetup_();
  var found = findTokenRow_(token);
  if (!found) return { ok: false, error: 'invalid_token' };
  var d = found.data;
  if (isTruthy_(d[7])) return { ok: false, error: 'already_used' };
  var exp = d[6] instanceof Date ? d[6] : new Date(d[6]);
  if (isNaN(exp.getTime()) || exp < new Date()) return { ok: false, error: 'expired' };
  return {
    ok: true,
    purchaseNumber: Number(d[1]),
    displayName: String(d[2] || ''),
    color: String(d[3] || '')
  };
}

function normalizePhone_(raw) {
  var d = String(raw || '').replace(/\D/g, '');
  if (d.indexOf('972') === 0) d = d.slice(3);
  if (d.indexOf('0') === 0) d = d.slice(1);
  return d;
}

function findOrderByPhone_(phone) {
  ensureSetup_();
  var needle = normalizePhone_(phone);
  if (!needle) return null;
  var orders = getSpreadsheet_().getSheetByName('Orders');
  if (!orders) return null;
  var data = orders.getDataRange().getValues();
  var match = null;
  for (var i = 1; i < data.length; i++) {
    if (normalizePhone_(data[i][2]) === needle) {
      match = {
        name: data[i][1],
        color: data[i][4],
        purchaseNumber: data[i][8] ? Number(data[i][8]) : i
      };
    }
  }
  return match;
}

function submitReviewRequest_(data) {
  ensureSetup_();

  var name = String(data.name || '').trim();
  var phone = String(data.phone || '').trim();
  var text = String(data.text || '').trim();
  if (name.length < 2) return { ok: false, error: 'invalid_name' };
  if (normalizePhone_(phone).length < 9) return { ok: false, error: 'invalid_phone' };
  if (text.length < 10) return { ok: false, error: 'text_too_short' };
  if (text.length > 500) return { ok: false, error: 'text_too_long' };

  var stars = Number(data.stars);
  if (isNaN(stars) || stars < 1) stars = 5;
  if (stars > 5) stars = 5;

  var order = findOrderByPhone_(phone);
  var display = abbrevName_(name);
  var color = String(data.color || '').trim();
  if (!color && order && order.color) color = String(order.color);
  if (color) display += ' · ' + color;

  var purchaseLabel = order ? String(order.purchaseNumber) : 'לא_זוהה';
  var adminNote = order ? 'phone_verified' : 'phone_unverified';

  var sh = ensureReviewsPending_();
  sh.appendRow([
    new Date(),
    'form',
    purchaseLabel,
    display,
    stars,
    text,
    'ממתין',
    adminNote
  ]);

  return { ok: true, message: 'submitted_pending_approval', verified: !!order };
}

function submitReview_(data) {
  var token = data && data.token;
  var validation = validateReviewToken_(token);
  if (!validation.ok) return validation;

  var text = String(data.text || '').trim();
  if (text.length < 10) return { ok: false, error: 'text_too_short' };
  if (text.length > 500) return { ok: false, error: 'text_too_long' };

  var stars = Number(data.stars);
  if (isNaN(stars) || stars < 1) stars = 5;
  if (stars > 5) stars = 5;

  var display = validation.displayName;
  if (validation.color) display += ' · ' + validation.color;

  var sh = ensureReviewsPending_();
  sh.appendRow([
    new Date(),
    token,
    validation.purchaseNumber,
    display,
    stars,
    text,
    'ממתין',
    ''
  ]);

  var found = findTokenRow_(token);
  found.sheet.getRange(found.row, 8).setValue('כן');

  return { ok: true, message: 'submitted_pending_approval' };
}

function placeOrder_(data) {
  var stock = getStock_();
  if (stock.remaining <= 0) {
    return {
      ok: false,
      error: 'sold_out',
      totalUnits: stock.totalUnits,
      soldUnits: stock.soldUnits,
      remaining: 0
    };
  }

  var stockSh = getSpreadsheet_().getSheetByName('Stock');
  var newSold = stock.soldUnits + 1;
  var reviewToken = createReviewTokenForOrder_(newSold, data.name, data.color, data.phone);

  var orders = getSpreadsheet_().getSheetByName('Orders');
  if (orders) {
    orders.appendRow([
      new Date(),
      data.name || '',
      data.phone || '',
      data.city || '',
      data.color || '',
      data.note || '',
      data.product || '',
      reviewToken,
      newSold
    ]);
  }

  stockSh.getRange(2, 2).setValue(newSold);

  var pub = ensurePublicBuyers_();
  pub.appendRow([newSold, abbrevName_(data.name), data.color || '', new Date(), 'לא']);

  return {
    ok: true,
    purchaseNumber: newSold,
    reviewToken: reviewToken,
    reviewUrl: buildReviewUrl_(reviewToken),
    totalUnits: stock.totalUnits,
    soldUnits: newSold,
    remaining: Math.max(0, stock.totalUnits - newSold)
  };
}

function handle_(payload) {
  var action = (payload && payload.action) || 'stock';
  if (action === 'setup') {
    ensureSetup_();
    var s = getStock_();
    return { ok: true, message: 'ready', totalUnits: s.totalUnits, soldUnits: s.soldUnits, remaining: s.remaining };
  }
  if (action === 'stock') {
    var st = getStock_();
    return { ok: true, totalUnits: st.totalUnits, soldUnits: st.soldUnits, remaining: st.remaining };
  }
  if (action === 'buyers') return getBuyers_();
  if (action === 'reviews') return getReviews_();
  if (action === 'reviewValidate') return validateReviewToken_(payload.token);
  if (action === 'reviewSubmit') return submitReview_(payload);
  if (action === 'reviewRequest') return submitReviewRequest_(payload);
  if (action === 'order') return placeOrder_(payload);
  return { ok: false, error: 'unknown_action' };
}

function doGet(e) {
  var p = e.parameter || {};
  var payload = { action: p.action || 'stock' };
  if (p.token) payload.token = p.token;
  return jsonOutput_(handle_(payload));
}

function doPost(e) {
  var payload = {};
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput_({ ok: false, error: 'invalid_json' });
  }
  return jsonOutput_(handle_(payload));
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
