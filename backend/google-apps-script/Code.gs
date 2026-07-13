const SHEET_NAME = 'Insumos';
const HEADERS = ['insumo', 'precio', 'cantidad', 'unidad'];

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const row = normalizeRow_(payload);
    const sheet = getSheet_();

    ensureHeaders_(sheet);
    upsertIngredient_(sheet, row);

    return json_({
      ok: true,
      message: 'Insumo guardado',
      row,
    });
  } catch (error) {
    return json_({
      ok: false,
      message: error.message,
    });
  }
}

function doGet() {
  return json_({
    ok: true,
    message: 'Backend de costos activo',
  });
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('No se recibieron datos');
  }

  return JSON.parse(e.postData.contents);
}

function normalizeRow_(payload) {
  const insumo = String(payload.insumo || '').trim();
  const precio = Number(payload.precio);
  const cantidad = Number(payload.cantidad);
  const unidad = String(payload.unidad || '').trim();

  if (!insumo) throw new Error('Falta nombre del insumo');
  if (!precio || precio <= 0) throw new Error('Precio invalido');
  if (!cantidad || cantidad <= 0) throw new Error('Cantidad invalida');
  if (!unidad) throw new Error('Falta unidad');

  return { insumo, precio, cantidad, unidad };
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  const values = range.getValues()[0];
  const hasHeaders = HEADERS.every((header, index) => String(values[index] || '').toLowerCase() === header);

  if (!hasHeaders) {
    range.setValues([HEADERS]);
    range.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function upsertIngredient_(sheet, row) {
  const data = sheet.getDataRange().getValues();
  const normalizedName = normalize_(row.insumo);

  for (let index = 1; index < data.length; index += 1) {
    if (normalize_(data[index][0]) === normalizedName) {
      sheet.getRange(index + 1, 1, 1, HEADERS.length).setValues([[
        row.insumo,
        row.precio,
        row.cantidad,
        row.unidad,
      ]]);
      return;
    }
  }

  sheet.appendRow([row.insumo, row.precio, row.cantidad, row.unidad]);
}

function normalize_(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
