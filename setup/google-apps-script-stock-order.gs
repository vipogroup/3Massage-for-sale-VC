/**
 * VIPO — מלאי + הזמנות + רשימת רוכשים ציבורית
 * 1. צור גיליון ריק ב-Google Sheets
 * 2. הדבק SHEET_ID למטה
 * 3. Deploy → Web app → Anyone
 * 4. בקריאה ראשונה נוצרים Stock + Orders + PublicBuyers
 *
 * PublicBuyers: עמודה "הצג_באתר" = כן → מופיע באתר (שם מקוצר בלבד)
 */

const SHEET_ID = 'PUT_YOUR_SHEET_ID_HERE';
const DEFAULT_TOTAL = 54;
const DEFAULT_SOLD = 25;

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function abbrevName_(full) {
  full = String(full || '').trim();
  if (!full) return 'רוכש';
  var parts = full.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0) + '.';
  }
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.';
}

function formatDateIso_(value) {
  if (!value) return '';
  var d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function isShowPublic_(value) {
  var v = String(value || '').trim().toLowerCase();
  return v === 'כן' || v === 'yes' || v === 'true' || v === '1';
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
    orders.getRange(1, 1, 1, 7).setValues([['תאריך', 'שם', 'טלפון', 'עיר', 'צבע', 'הערות', 'מוצר']]);
  }
  ensurePublicBuyers_();
  return { setup: true };
}

function getStock_() {
  ensureSetup_();
  var sh = getSpreadsheet_().getSheetByName('Stock');
  var totalUnits = Number(sh.getRange(1, 2).getValue()) || 0;
  var soldUnits = Number(sh.getRange(2, 2).getValue()) || 0;
  var remaining = Math.max(0, totalUnits - soldUnits);
  return { totalUnits: totalUnits, soldUnits: soldUnits, remaining: remaining };
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

function placeOrder_(data) {
  var stock = getStock_();
  if (stock.remaining <= 0) {
    return { ok: false, error: 'sold_out', totalUnits: stock.totalUnits, soldUnits: stock.soldUnits, remaining: 0 };
  }

  var orders = getSpreadsheet_().getSheetByName('Orders');
  if (orders) {
    orders.appendRow([
      new Date(),
      data.name || '',
      data.phone || '',
      data.city || '',
      data.color || '',
      data.note || '',
      data.product || ''
    ]);
  }

  var stockSh = getSpreadsheet_().getSheetByName('Stock');
  var newSold = stock.soldUnits + 1;
  stockSh.getRange(2, 2).setValue(newSold);

  var pub = ensurePublicBuyers_();
  pub.appendRow([
    newSold,
    abbrevName_(data.name),
    data.color || '',
    new Date(),
    'לא'
  ]);

  return {
    ok: true,
    purchaseNumber: newSold,
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
  if (action === 'buyers') {
    return getBuyers_();
  }
  if (action === 'order') {
    return placeOrder_(payload);
  }
  return { ok: false, error: 'unknown_action' };
}

function doGet(e) {
  var payload = { action: (e.parameter && e.parameter.action) || 'stock' };
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
