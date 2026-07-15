const SHEET_NAME = 'Insumos';
const HEADERS = ['insumo', 'precio', 'cantidad', 'unidad'];

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const sheet = getSheet_();
    const action = String(payload.action || 'create').toLowerCase();

    ensureHeaders_(sheet);

    if (action === 'create') {
      const row = normalizeRow_(payload);
      createIngredient_(sheet, row);

      return json_({
        ok: true,
        message: 'Insumo guardado',
        row,
      });
    }

    if (action === 'update') {
      const row = normalizeRow_(payload);
      updateIngredient_(sheet, payload.originalInsumo || payload.insumo, row);

      return json_({
        ok: true,
        message: 'Insumo actualizado',
        row,
      });
    }

    if (action === 'delete') {
      deleteIngredient_(sheet, payload.originalInsumo || payload.insumo);

      return json_({
        ok: true,
        message: 'Insumo eliminado',
      });
    }

    return json_({
      ok: false,
      message: 'Accion no valida',
    });
  } catch (error) {
    return json_({
      ok: false,
      message: error.message,
    });
  }
}

function doGet(e) {
  try {
    const sheet = getSheet_();
    ensureHeaders_(sheet);

    return output_(e, {
      ok: true,
      message: 'Backend de costos activo',
      ingredients: listIngredients_(sheet),
    });
  } catch (error) {
    return output_(e, {
      ok: false,
      message: error.message,
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
  if (findIngredientRow_(sheet, row.insumo) !== -1) {
    throw new Error('El insumo ya existe');
  }

  sheet.appendRow([row.insumo, row.precio, row.cantidad, row.unidad]);
}

function updateIngredient_(sheet, originalInsumo, row) {
  const currentRow = findIngredientRow_(sheet, originalInsumo);
  if (currentRow === -1) {
    throw new Error('No se encontro el insumo original');
  }

  const targetRow = findIngredientRow_(sheet, row.insumo);
  if (targetRow !== -1 && targetRow !== currentRow) {
    throw new Error('Ya existe otro insumo con ese nombre');
  }

  sheet.getRange(currentRow, 1, 1, HEADERS.length).setValues([[
    row.insumo,
    row.precio,
    row.cantidad,
    row.unidad,
  ]]);
}

function deleteIngredient_(sheet, insumo) {
  const rowNumber = findIngredientRow_(sheet, insumo);
  if (rowNumber === -1) {
    throw new Error('No se encontro el insumo');
  }

  sheet.deleteRow(rowNumber);
}

function findIngredientRow_(sheet, insumo) {
  const data = sheet.getDataRange().getValues();
  const normalizedName = normalize_(insumo);

  for (let index = 1; index < data.length; index += 1) {
    if (normalize_(data[index][0]) === normalizedName) {
      return index + 1;
    }
  }

  return -1;
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
