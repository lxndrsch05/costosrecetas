const SHEET_NAME = 'Insumos';
const HEADERS = ['insumo', 'precio', 'cantidad', 'unidad'];
const BACKEND_VERSION = '2026-07-15-crud-v2';

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    return json_(handleAction_(payload));
  } catch (error) {
    return json_({
      ok: false,
      message: error.message,
    });
  }
}

function doGet(e) {
  try {
    const payload = e && e.parameter ? e.parameter : {};
    if (payload.action) {
      return output_(e, handleAction_(payload));
    }

    const sheet = getSheet_();
    ensureHeaders_(sheet);

    return output_(e, {
      ok: true,
      message: 'Backend de costos activo',
      version: BACKEND_VERSION,
      ingredients: listIngredients_(sheet),
    });
  } catch (error) {
    return output_(e, {
      ok: false,
      message: error.message,
      version: BACKEND_VERSION,
      ingredients: [],
    });
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('No se recibieron datos');
  }

  return JSON.parse(e.postData.contents);
}

function handleAction_(payload) {
  const sheet = getSheet_();
  const action = String(payload.action || 'create').toLowerCase();

  ensureHeaders_(sheet);

  if (action === 'create') {
    const row = normalizeRow_(payload);
    createIngredient_(sheet, row);

    return {
      ok: true,
      message: 'Insumo guardado',
      version: BACKEND_VERSION,
      row,
    };
  }

  if (action === 'update') {
    const row = normalizeRow_(payload);
    updateIngredient_(sheet, payload.originalInsumo || payload.insumo, row);

    return {
      ok: true,
      message: 'Insumo actualizado',
      version: BACKEND_VERSION,
      row,
    };
  }

  if (action === 'delete') {
    const deleted = deleteIngredient_(sheet, payload.originalInsumo || payload.insumo);

    return {
      ok: true,
      message: 'Insumo eliminado',
      version: BACKEND_VERSION,
      deleted,
    };
  }

  throw new Error('Accion no valida');
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

function createIngredient_(sheet, row) {
  if (findIngredientRows_(sheet, row.insumo).length) {
    throw new Error('El insumo ya existe');
  }

  sheet.appendRow([row.insumo, row.precio, row.cantidad, row.unidad]);
}

function updateIngredient_(sheet, originalInsumo, row) {
  const currentRows = findIngredientRows_(sheet, originalInsumo);
  if (!currentRows.length) {
    throw new Error('No se encontro el insumo original');
  }

  const targetRows = findIngredientRows_(sheet, row.insumo);
  const currentRow = currentRows[0];
  const hasExternalTarget = targetRows.some(function(rowNumber) {
    return currentRows.indexOf(rowNumber) === -1;
  });

  if (hasExternalTarget) {
    throw new Error('Ya existe otro insumo con ese nombre');
  }

  sheet.getRange(currentRow, 1, 1, HEADERS.length).setValues([[
    row.insumo,
    row.precio,
    row.cantidad,
    row.unidad,
  ]]);

  currentRows
    .slice(1)
    .sort(function(a, b) { return b - a; })
    .forEach(function(rowNumber) {
      sheet.deleteRow(rowNumber);
    });
}

function deleteIngredient_(sheet, insumo) {
  const rowNumbers = findIngredientRows_(sheet, insumo);
  if (!rowNumbers.length) {
    throw new Error('No se encontro el insumo');
  }

  rowNumbers
    .sort(function(a, b) { return b - a; })
    .forEach(function(rowNumber) {
      sheet.deleteRow(rowNumber);
    });

  return rowNumbers.length;
}

function findIngredientRows_(sheet, insumo) {
  const data = sheet.getDataRange().getValues();
  const normalizedName = normalize_(insumo);
  const rows = [];

  for (let index = 1; index < data.length; index += 1) {
    if (normalize_(data[index][0]) === normalizedName) {
      rows.push(index + 1);
    }
  }

  return rows;
}

function listIngredients_(sheet) {
  const data = sheet.getDataRange().getValues();

  return data
    .slice(1)
    .map(function(row) {
      if (!row[0] && !row[1] && !row[2] && !row[3]) {
        return null;
      }

      return normalizeRow_({
        insumo: row[0],
        precio: row[1],
        cantidad: row[2],
        unidad: row[3],
      });
    })
    .filter(function(row) {
      return row && row.insumo && row.precio && row.cantidad && row.unidad;
    });
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

function output_(e, payload) {
  const callback = e && e.parameter && e.parameter.callback;

  if (callback && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_(payload);
}
