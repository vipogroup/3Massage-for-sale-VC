/**
 * VIPO — מלאי + הזמנות (מתקין את עצמו אוטומטית)
 * 1. צור גיליון ריק ב-Google Sheets
 * 2. הדבק SHEET_ID למטה
 * 3. Deploy → Web app → Anyone
 * 4. בקריאה ראשונה נוצרים Stock + Orders לבד
 */

const SHEET_ID = 'PUT_YOUR_SHEET_ID_HERE';
const DEFAULT_TOTAL = 54;
const DEFAULT_SOLD = 25;

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function ensureSetup_() {
  const ss = getSpreadsheet_();
  let stock = ss.getSheetByName('Stock');
  if (!stock) {
    stock = ss.insertSheet('Stock');
    stock.getRange(1, 1, 2, 2).setValues([
      ['totalUnits', DEFAULT_TOTAL],
      ['soldUnits', DEFAULT_SOLD]
    ]);
  }
  let orders = ss.getSheetByName('Orders');
  if (!orders) {
    orders = ss.insertSheet('Orders');
    orders.getRange(1, 1, 1, 6).setValues([['תאריך', 'שם', 'טלפון', 'עיר', 'הערות', 'מוצר']]);
  }
  return { setup: true };
}

function getStock_() {
  ensureSetup_();
  const sh = getSpreadsheet_().getSheetByName('Stock');
  const totalUnits = Number(sh.getRange(1, 2).getValue()) || 0;
  const soldUnits = Number(sh.getRange(2, 2).getValue()) || 0;
  const remaining = Math.max(0, totalUnits - soldUnits);
  return { totalUnits: totalUnits, soldUnits: soldUnits, remaining: remaining };
}

function placeOrder_(data) {
  const stock = getStock_();
  if (stock.remaining <= 0) {
    return { ok: false, error: 'sold_out', totalUnits: stock.totalUnits, soldUnits: stock.soldUnits, remaining: 0 };
  }

  const orders = getSpreadsheet_().getSheetByName('Orders');
  if (orders) {
    orders.appendRow([
      new Date(),
      data.name || '',
      data.phone || '',
      data.city || '',
      data.note || '',
      data.product || ''
    ]);
  }

  const stockSh = getSpreadsheet_().getSheetByName('Stock');
  const newSold = stock.soldUnits + 1;
  stockSh.getRange(2, 2).setValue(newSold);

  return {
    ok: true,
    totalUnits: stock.totalUnits,
    soldUnits: newSold,
    remaining: Math.max(0, stock.totalUnits - newSold)
  };
}

function handle_(payload) {
  const action = (payload && payload.action) || 'stock';
  if (action === 'setup') {
    ensureSetup_();
    const s = getStock_();
    return { ok: true, message: 'ready', totalUnits: s.totalUnits, soldUnits: s.soldUnits, remaining: s.remaining };
  }
  if (action === 'stock') {
    const s = getStock_();
    return { ok: true, totalUnits: s.totalUnits, soldUnits: s.soldUnits, remaining: s.remaining };
  }
  if (action === 'order') {
    return placeOrder_(payload);
  }
  return { ok: false, error: 'unknown_action' };
}

function doGet(e) {
  const payload = { action: (e.parameter && e.parameter.action) || 'stock' };
  return jsonOutput_(handle_(payload));
}

function doPost(e) {
  let payload = {};
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
