const defaultCostsCsv = `insumo,precio,cantidad,unidad
Harina todo uso,4.50,1,kg
Azucar blanca,4.20,1,kg
Azucar impalpable,6.80,1,kg
Mantequilla,10.50,200,g
Huevos,9.00,15,unidad
Leche evaporada,4.20,400,ml
Leche fresca,5.20,1,l
Cacao en polvo,18.00,500,g
Chocolate bitter,16.00,500,g
Esencia de vainilla,5.50,90,ml
Polvo de hornear,3.00,100,g
Sal,2.00,1,kg
Aceite vegetal,8.50,1,l`;

const sampleRecipe = `500 g harina
250 g azucar
4 huevos
200 g mantequilla
120 ml leche
1 cdta vainilla
10 g polvo de hornear`;

const appConfig = window.RECIPE_COSTING_CONFIG || {};
const fallbackCostsUrl = "costos-ejemplo.csv";
const customCostsStorageKey = "recipeCosting.customIngredients";

const state = {
  costs: [],
  sourceCosts: [],
  customCosts: [],
  lastResult: null,
  costsVisible: false,
};

const elements = {
  dataStatus: document.querySelector("#dataStatus"),
  recipeText: document.querySelector("#recipeText"),
  servingsInput: document.querySelector("#servingsInput"),
  marginInput: document.querySelector("#marginInput"),
  wasteInput: document.querySelector("#wasteInput"),
  laborInput: document.querySelector("#laborInput"),
  overheadInput: document.querySelector("#overheadInput"),
  roundingInput: document.querySelector("#roundingInput"),
  calculateButton: document.querySelector("#calculateButton"),
  copyButton: document.querySelector("#copyButton"),
  sampleRecipeButton: document.querySelector("#sampleRecipeButton"),
  addIngredientButton: document.querySelector("#addIngredientButton"),
  viewCostsButton: document.querySelector("#viewCostsButton"),
  refreshCostsButton: document.querySelector("#refreshCostsButton"),
  costListPanel: document.querySelector("#costListPanel"),
  costSource: document.querySelector("#costSource"),
  ingredientAlert: document.querySelector("#ingredientAlert"),
  ingredientAlertText: document.querySelector("#ingredientAlertText"),
  costTableBody: document.querySelector("#costTableBody"),
  breakdownBody: document.querySelector("#breakdownBody"),
  unitPrice: document.querySelector("#unitPrice"),
  priceNote: document.querySelector("#priceNote"),
  ingredientCost: document.querySelector("#ingredientCost"),
  totalCost: document.querySelector("#totalCost"),
  saleTotal: document.querySelector("#saleTotal"),
  profitTotal: document.querySelector("#profitTotal"),
  ingredientDrawer: document.querySelector("#ingredientDrawer"),
  closeIngredientDrawerButton: document.querySelector("#closeIngredientDrawerButton"),
  cancelIngredientButton: document.querySelector("#cancelIngredientButton"),
  ingredientForm: document.querySelector("#ingredientForm"),
  newIngredientName: document.querySelector("#newIngredientName"),
  newIngredientPrice: document.querySelector("#newIngredientPrice"),
  newIngredientQuantity: document.querySelector("#newIngredientQuantity"),
  newIngredientUnit: document.querySelector("#newIngredientUnit"),
};

const unitAliases = new Map([
  ["g", { unit: "g", group: "mass", factor: 1 }],
  ["gr", { unit: "g", group: "mass", factor: 1 }],
  ["gramo", { unit: "g", group: "mass", factor: 1 }],
  ["gramos", { unit: "g", group: "mass", factor: 1 }],
  ["kg", { unit: "g", group: "mass", factor: 1000 }],
  ["kilo", { unit: "g", group: "mass", factor: 1000 }],
  ["kilos", { unit: "g", group: "mass", factor: 1000 }],
  ["mg", { unit: "g", group: "mass", factor: 0.001 }],
  ["lb", { unit: "g", group: "mass", factor: 453.592 }],
  ["oz", { unit: "g", group: "mass", factor: 28.3495 }],
  ["ml", { unit: "ml", group: "volume", factor: 1 }],
  ["mililitro", { unit: "ml", group: "volume", factor: 1 }],
  ["mililitros", { unit: "ml", group: "volume", factor: 1 }],
  ["l", { unit: "ml", group: "volume", factor: 1000 }],
  ["lt", { unit: "ml", group: "volume", factor: 1000 }],
  ["litro", { unit: "ml", group: "volume", factor: 1000 }],
  ["litros", { unit: "ml", group: "volume", factor: 1000 }],
  ["taza", { unit: "ml", group: "volume", factor: 240 }],
  ["tazas", { unit: "ml", group: "volume", factor: 240 }],
  ["cda", { unit: "ml", group: "volume", factor: 15 }],
  ["cucharada", { unit: "ml", group: "volume", factor: 15 }],
  ["cucharadas", { unit: "ml", group: "volume", factor: 15 }],
  ["cdta", { unit: "ml", group: "volume", factor: 5 }],
  ["cucharadita", { unit: "ml", group: "volume", factor: 5 }],
  ["cucharaditas", { unit: "ml", group: "volume", factor: 5 }],
  ["unidad", { unit: "unidad", group: "unit", factor: 1 }],
  ["unidades", { unit: "unidad", group: "unit", factor: 1 }],
  ["und", { unit: "unidad", group: "unit", factor: 1 }],
  ["unid", { unit: "unidad", group: "unit", factor: 1 }],
  ["u", { unit: "unidad", group: "unit", factor: 1 }],
  ["pieza", { unit: "unidad", group: "unit", factor: 1 }],
  ["piezas", { unit: "unidad", group: "unit", factor: 1 }],
]);

const densityByIngredient = [
  { key: "harina", gramsPerCup: 120 },
  { key: "azucar impalpable", gramsPerCup: 120 },
  { key: "azucar", gramsPerCup: 200 },
  { key: "mantequilla", gramsPerCup: 227 },
  { key: "cacao", gramsPerCup: 85 },
  { key: "chocolate", gramsPerCup: 170 },
  { key: "polvo de hornear", gramsPerCup: 192 },
  { key: "sal", gramsPerCup: 288 },
];

const stopWords = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "para",
  "picado",
  "picada",
  "derretida",
  "derretido",
  "cernida",
  "cernido",
  "molida",
  "molido",
  "fina",
  "fino",
  "grande",
  "mediano",
  "mediana",
]);

document.addEventListener("DOMContentLoaded", async () => {
  await loadInternalCosts();
  resetCalculation();
});

elements.calculateButton.addEventListener("click", calculate);
elements.sampleRecipeButton.addEventListener("click", () => {
  elements.recipeText.value = sampleRecipe;
  resetCalculation();
});
elements.refreshCostsButton.addEventListener("click", loadInternalCosts);
elements.viewCostsButton.addEventListener("click", toggleCostList);
elements.copyButton.addEventListener("click", copySummary);
elements.addIngredientButton.addEventListener("click", openIngredientDrawer);
elements.closeIngredientDrawerButton.addEventListener("click", closeIngredientDrawer);
elements.cancelIngredientButton.addEventListener("click", closeIngredientDrawer);
elements.ingredientForm.addEventListener("submit", addCustomIngredient);
elements.ingredientDrawer.addEventListener("click", (event) => {
  if (event.target === elements.ingredientDrawer) {
    closeIngredientDrawer();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.ingredientDrawer.classList.contains("hidden")) {
    closeIngredientDrawer();
  }
});

[
  elements.servingsInput,
  elements.marginInput,
  elements.wasteInput,
  elements.laborInput,
  elements.overheadInput,
  elements.roundingInput,
].forEach((input) => input.addEventListener("input", resetCalculation));

elements.recipeText.addEventListener("input", resetCalculation);

async function loadInternalCosts() {
  const configuredUrl = String(appConfig.sheetCsvUrl || "").trim();
  const sourceUrl = configuredUrl || fallbackCostsUrl;

  try {
    setStatus("Cargando costos internos...", "warn");
    const csv = await fetchCostsCsv(sourceUrl);
    const label = configuredUrl ? "Costos cargados desde Google Sheets" : "Costos cargados desde archivo interno";
    loadCostsFromCsv(csv, label);
    elements.costSource.textContent = configuredUrl
      ? "Los costos se actualizan desde el Google Sheet interno configurado."
      : "Los costos se cargan desde el archivo interno de ejemplo.";
  } catch (error) {
    loadCostsFromCsv(defaultCostsCsv, "Usando costos de respaldo");
    elements.costSource.textContent = "No se pudo leer la fuente interna; se estan usando costos de respaldo.";
  }

  resetCalculation();
}

async function fetchCostsCsv(sourceUrl) {
  const response = await fetch(buildCsvUrl(sourceUrl), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo leer la fuente de costos (${response.status})`);
  }
  return response.text();
}

function toggleCostList() {
  state.costsVisible = !state.costsVisible;
  elements.costListPanel.classList.toggle("hidden", !state.costsVisible);
  elements.viewCostsButton.textContent = state.costsVisible ? "Ocultar lista" : "Ver lista";
  elements.viewCostsButton.setAttribute("aria-expanded", String(state.costsVisible));
}

function buildCsvUrl(rawUrl) {
  if (rawUrl.includes("output=csv") || rawUrl.includes("tqx=out:csv")) {
    return rawUrl;
  }

  const idMatch = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    return rawUrl;
  }

  const gidMatch = rawUrl.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
}

function loadCostsFromCsv(csv, statusText) {
  const rows = parseCsv(csv);
  if (rows.length < 2) {
    throw new Error("La hoja no tiene filas suficientes");
  }

  const headers = rows[0].map(normalizeKey);
  const column = {
    name: findColumn(headers, ["insumo", "ingrediente", "nombre", "producto", "item"]),
    price: findColumn(headers, ["precio", "costo", "valor", "preciocompra", "costocompra"]),
    quantity: findColumn(headers, ["cantidad", "contenido", "presentacion", "peso", "volumen", "tamano"]),
    unit: findColumn(headers, ["unidad", "medida", "unid"]),
  };

  if (Object.values(column).some((index) => index === -1)) {
    throw new Error("Faltan columnas: insumo, precio, cantidad y unidad");
  }

  state.sourceCosts = rows
    .slice(1)
    .map((row) => parseCostRow(row, column))
    .filter(Boolean)
    .sort((a, b) => b.tokens.length - a.tokens.length);

  if (!state.sourceCosts.length) {
    throw new Error("No se encontraron insumos validos");
  }

  state.customCosts = loadCustomCosts();
  mergeCostLists();
  setStatus(statusText, "ok");
  renderCostTable();
}

function parseCostRow(row, column) {
  const name = String(row[column.name] || "").trim();
  const price = parseNumber(row[column.price]);
  const quantity = parseNumber(row[column.quantity]);
  const unitText = String(row[column.unit] || "").trim();
  const unit = normalizeUnit(unitText);

  if (!name || !price || !quantity || !unit) {
    return null;
  }

  const normalizedQuantity = quantity * unit.factor;
  return {
    name,
    normalizedName: normalizeText(name),
    tokens: tokenize(name),
    price,
    packageQuantity: quantity,
    packageUnit: unitText,
    baseQuantity: normalizedQuantity,
    baseUnit: unit.unit,
    group: unit.group,
    unitCost: price / normalizedQuantity,
  };
}

function mergeCostLists() {
  const byName = new Map();

  [...state.sourceCosts, ...state.customCosts].forEach((item) => {
    byName.set(item.normalizedName, item);
  });

  state.costs = [...byName.values()].sort((a, b) => b.tokens.length - a.tokens.length);
}

function loadCustomCosts() {
  try {
    const saved = JSON.parse(localStorage.getItem(customCostsStorageKey) || "[]");
    if (!Array.isArray(saved)) return [];

    return saved
      .map((item) =>
        createCostItem({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          unitText: item.unit,
          isCustom: true,
        }),
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

function saveCustomCosts() {
  const payload = state.customCosts.map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.packageQuantity,
    unit: item.packageUnit,
  }));
  localStorage.setItem(customCostsStorageKey, JSON.stringify(payload));
}

function createCostItem({ name, price, quantity, unitText, isCustom = false }) {
  const cleanName = String(name || "").trim();
  const cleanUnit = String(unitText || "").trim();
  const parsedPrice = parseNumber(price);
  const parsedQuantity = parseNumber(quantity);
  const unit = normalizeUnit(cleanUnit);

  if (!cleanName || !parsedPrice || !parsedQuantity || !unit) {
    return null;
  }

  const normalizedQuantity = parsedQuantity * unit.factor;
  return {
    name: cleanName,
    normalizedName: normalizeText(cleanName),
    tokens: tokenize(cleanName),
    price: parsedPrice,
    packageQuantity: parsedQuantity,
    packageUnit: cleanUnit,
    baseQuantity: normalizedQuantity,
    baseUnit: unit.unit,
    group: unit.group,
    unitCost: parsedPrice / normalizedQuantity,
    isCustom,
  };
}

function openIngredientDrawer() {
  elements.ingredientForm.reset();
  elements.newIngredientUnit.value = "g";
  elements.ingredientDrawer.classList.remove("hidden");
  elements.ingredientDrawer.setAttribute("aria-hidden", "false");
  elements.newIngredientName.focus();
}

function closeIngredientDrawer() {
  elements.ingredientDrawer.classList.add("hidden");
  elements.ingredientDrawer.setAttribute("aria-hidden", "true");
}

function addCustomIngredient(event) {
  event.preventDefault();

  const item = createCostItem({
    name: elements.newIngredientName.value,
    price: elements.newIngredientPrice.value,
    quantity: elements.newIngredientQuantity.value,
    unitText: elements.newIngredientUnit.value,
    isCustom: true,
  });

  if (!item) {
    setStatus("Completa los datos del insumo", "danger");
    return;
  }

  state.customCosts = state.customCosts.filter((cost) => cost.normalizedName !== item.normalizedName);
  state.customCosts.push(item);
  saveCustomCosts();
  mergeCostLists();
  renderCostTable();

  if (!state.costsVisible) {
    toggleCostList();
  }

  closeIngredientDrawer();
  resetCalculation();
  setStatus(`Insumo agregado: ${item.name}`, "ok");
}

function calculate() {
  const recipeLines = elements.recipeText.value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!recipeLines.length) {
    resetCalculation();
    showIngredientAlert(
      "Falta ingresar la receta.",
      "Copia o pega los ingredientes en el campo de receta y luego vuelve a hacer clic en calcular.",
    );
    return;
  }

  const rows = recipeLines.map(parseRecipeLine).map(costRecipeItem);
  const ingredientCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const servings = clamp(parseNumber(elements.servingsInput.value) || 1, 1, 100000);
  const margin = clamp(parseNumber(elements.marginInput.value) || 0, 0, 95) / 100;
  const waste = Math.max(0, parseNumber(elements.wasteInput.value) || 0) / 100;
  const labor = Math.max(0, parseNumber(elements.laborInput.value) || 0);
  const overhead = Math.max(0, parseNumber(elements.overheadInput.value) || 0);
  const rounding = parseNumber(elements.roundingInput.value) || 0.5;

  const costBeforeMargin = ingredientCost * (1 + waste) + labor + overhead;
  const rawSaleTotal = margin >= 0.95 ? costBeforeMargin : costBeforeMargin / (1 - margin);
  const rawUnitPrice = rawSaleTotal / servings;
  const roundedUnitPrice = roundUp(rawUnitPrice, rounding);
  const saleTotal = roundedUnitPrice * servings;
  const profit = saleTotal - costBeforeMargin;

  state.lastResult = {
    rows,
    ingredientCost,
    costBeforeMargin,
    saleTotal,
    profit,
    servings,
    roundedUnitPrice,
  };

  renderBreakdown(rows);
  renderSummary(state.lastResult);
  renderIngredientAlert(rows);
}

function resetCalculation() {
  state.lastResult = null;
  renderBreakdown([]);
  renderSummary({
    rows: [],
    ingredientCost: 0,
    costBeforeMargin: 0,
    saleTotal: 0,
    profit: 0,
    servings: clamp(parseNumber(elements.servingsInput.value) || 1, 1, 100000),
    roundedUnitPrice: 0,
  });
  hideIngredientAlert();
}

function parseRecipeLine(line) {
  const cleanLine = line
    .replace(/^[\s\-*•]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  const quantityPattern = "([0-9]+\\s+[0-9]+\\/[0-9]+|[0-9]+\\/[0-9]+|[0-9]+(?:[\\.,][0-9]+)?|[¼½¾⅓⅔⅛⅜⅝⅞])";
  const leadingMatch = cleanLine.match(new RegExp(`^${quantityPattern}\\s*(.*)$`, "i"));

  if (!leadingMatch) {
    const trailingMatch = cleanLine.match(new RegExp(`^(.+?)\\s+${quantityPattern}\\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ\\.]*)$`, "i"));
    if (trailingMatch) {
      return {
        original: line,
        quantity: parseQuantity(trailingMatch[2]),
        unitText: trailingMatch[3] || "unidad",
        ingredientName: removeTrailingNotes(trailingMatch[1]),
      };
    }

    return {
      original: line,
      quantity: 0,
      unitText: "",
      ingredientName: cleanLine,
      parseError: "No se detecto cantidad",
    };
  }

  const rest = leadingMatch[2].replace(/^de\s+/i, "").trim();
  const restMatch = rest.match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ\.]+)\s*(.*)$/i);
  const possibleUnit = restMatch ? restMatch[1] : "";
  const hasKnownUnit = Boolean(normalizeUnit(possibleUnit));
  const unitText = hasKnownUnit ? possibleUnit : inferUnitFromIngredient(rest);
  const ingredientName = removeTrailingNotes(hasKnownUnit ? restMatch[2] : rest);

  return {
    original: line,
    quantity: parseQuantity(leadingMatch[1]),
    unitText,
    ingredientName,
  };
}

function costRecipeItem(item) {
  if (item.parseError || !item.quantity) {
    return { ...item, cost: 0, status: item.parseError || "Cantidad invalida" };
  }

  const costItem = findBestCostItem(item.ingredientName);
  if (!costItem) {
    return { ...item, cost: 0, status: "Insumo no encontrado" };
  }

  const converted = convertAmount(item.quantity, item.unitText, item.ingredientName, costItem);
  if (!converted) {
    return {
      ...item,
      costItem,
      cost: 0,
      status: `Unidad no compatible con ${costItem.packageUnit}`,
    };
  }

  return {
    ...item,
    costItem,
    convertedQuantity: converted.quantity,
    convertedUnit: converted.unit,
    cost: converted.quantity * costItem.unitCost,
    status: converted.estimated ? "Calculado con equivalencia" : "OK",
  };
}

function convertAmount(quantity, unitText, ingredientName, costItem) {
  const unit = normalizeUnit(unitText);
  if (!unit) return null;

  const baseQuantity = quantity * unit.factor;
  if (unit.group === costItem.group && unit.unit === costItem.baseUnit) {
    return { quantity: baseQuantity, unit: costItem.baseUnit, estimated: false };
  }

  const density = getDensity(ingredientName || costItem.name);
  if (unit.group === "volume" && costItem.group === "mass" && density) {
    return {
      quantity: baseQuantity * density.gramsPerMl,
      unit: "g",
      estimated: true,
    };
  }

  if (unit.group === "mass" && costItem.group === "volume" && density) {
    return {
      quantity: baseQuantity / density.gramsPerMl,
      unit: "ml",
      estimated: true,
    };
  }

  return null;
}

function findBestCostItem(name) {
  const normalized = normalizeText(name);
  const tokens = tokenize(name);
  let best = null;
  let bestScore = 0;

  for (const item of state.costs) {
    if (normalized.includes(item.normalizedName) || item.normalizedName.includes(normalized)) {
      return item;
    }

    const overlap = item.tokens.filter((token) => tokens.includes(token)).length;
    const score = overlap / Math.max(item.tokens.length, tokens.length, 1);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  return bestScore >= 0.34 ? best : null;
}

function getDensity(name) {
  const normalized = normalizeText(name);
  const density = densityByIngredient.find((entry) => normalized.includes(entry.key));
  if (!density) return null;
  return {
    gramsPerMl: density.gramsPerCup / 240,
  };
}

function renderSummary(result) {
  elements.unitPrice.textContent = formatMoney(result.roundedUnitPrice);
  elements.ingredientCost.textContent = formatMoney(result.ingredientCost);
  elements.totalCost.textContent = formatMoney(result.costBeforeMargin);
  elements.saleTotal.textContent = formatMoney(result.saleTotal);
  elements.profitTotal.textContent = formatMoney(result.profit);

  if (!result.rows.length) {
    elements.priceNote.textContent = "Copia o pega una receta y haz clic en calcular para ver el precio recomendado.";
    return;
  }

  const missing = result.rows.filter((row) => row.status !== "OK" && row.status !== "Calculado con equivalencia").length;
  elements.priceNote.textContent = missing
    ? `${missing} linea(s) necesitan revision. El precio se calculo con los ingredientes encontrados.`
    : `Para ${result.servings} porcion(es), con margen y gastos incluidos.`;
}

function renderIngredientAlert(rows) {
  const missingRows = rows.filter((row) => row.status === "Insumo no encontrado");
  const hasMissingRows = missingRows.length > 0;

  if (!hasMissingRows) {
    hideIngredientAlert();
    return;
  }

  const missingNames = missingRows
    .map((row) => row.ingredientName || row.original)
    .filter(Boolean)
    .slice(0, 4);
  const extraCount = Math.max(0, missingRows.length - missingNames.length);
  const extraText = extraCount ? ` y ${extraCount} mas` : "";

  showIngredientAlert(
    "Hay insumos que no estan en la lista.",
    `No encontre en la lista: ${missingNames.join(", ")}${extraText}. Agrega el insumo o ajusta el nombre en la receta.`,
  );
}

function showIngredientAlert(title, message) {
  elements.ingredientAlert.classList.remove("hidden");
  elements.ingredientAlert.querySelector("strong").textContent = title;
  elements.ingredientAlertText.textContent = message;
}

function hideIngredientAlert() {
  elements.ingredientAlert.classList.add("hidden");
  elements.ingredientAlert.querySelector("strong").textContent = "Hay insumos que no estan en la lista.";
  elements.ingredientAlertText.textContent = "Revisa la receta o agrega esos insumos a la lista interna.";
}

function renderCostTable() {
  elements.costTableBody.innerHTML = state.costs
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${formatMoney(item.price)}</td>
        <td>${formatNumber(item.packageQuantity)} ${escapeHtml(item.packageUnit)}</td>
        <td>${formatMoney(item.unitCost)} / ${item.baseUnit}</td>
      </tr>`,
    )
    .join("");
}

function renderBreakdown(rows) {
  elements.breakdownBody.innerHTML = rows
    .map((row) => {
      const statusClass =
        row.status === "OK" ? "ok" : row.status === "Calculado con equivalencia" ? "warn" : "danger";
      const matched = row.costItem ? row.costItem.name : "-";
      const quantity = row.convertedQuantity
        ? `${formatNumber(row.convertedQuantity)} ${row.convertedUnit}`
        : "-";
      return `<tr>
        <td>${escapeHtml(row.original)}</td>
        <td>${escapeHtml(matched)}</td>
        <td>${escapeHtml(quantity)}</td>
        <td>${formatMoney(row.cost)}</td>
        <td><span class="${statusClass}">${escapeHtml(row.status)}</span></td>
      </tr>`;
    })
    .join("");
}

async function copySummary() {
  if (!state.lastResult) return;
  const result = state.lastResult;
  const text = [
    "Resumen de precio",
    `Precio sugerido por porcion: ${formatMoney(result.roundedUnitPrice)}`,
    `Porciones: ${result.servings}`,
    `Costo de insumos: ${formatMoney(result.ingredientCost)}`,
    `Costo total: ${formatMoney(result.costBeforeMargin)}`,
    `Venta total sugerida: ${formatMoney(result.saleTotal)}`,
    `Ganancia estimada: ${formatMoney(result.profit)}`,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Resumen copiado", "ok");
  } catch {
    setStatus("No se pudo copiar automaticamente", "warn");
  }
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function findColumn(headers, names) {
  return headers.findIndex((header) => names.includes(header));
}

function normalizeUnit(unitText) {
  const key = normalizeText(unitText || "unidad").replace(/\./g, "");
  return unitAliases.get(key) || null;
}

function parseNumber(value) {
  const text = String(value ?? "")
    .replace(/S\/|\$|,/gi, (match) => (match === "," ? "," : ""))
    .replace(/\s/g, "")
    .trim();

  if (!text) return 0;
  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  let normalized = text;

  if (hasComma && hasDot) {
    normalized = text.lastIndexOf(",") > text.lastIndexOf(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  } else if (hasComma) {
    normalized = text.replace(",", ".");
  }

  const number = Number.parseFloat(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function parseQuantity(value) {
  const fractionMap = {
    "¼": 0.25,
    "½": 0.5,
    "¾": 0.75,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "⅛": 0.125,
    "⅜": 0.375,
    "⅝": 0.625,
    "⅞": 0.875,
  };

  const text = String(value).trim();
  if (fractionMap[text]) return fractionMap[text];
  if (text.includes(" ")) {
    return text.split(/\s+/).reduce((sum, part) => sum + parseQuantity(part), 0);
  }
  if (text.includes("/")) {
    const [top, bottom] = text.split("/").map(Number);
    return bottom ? top / bottom : 0;
  }
  return parseNumber(text);
}

function inferUnitFromIngredient(name) {
  const firstWord = normalizeText(name).split(" ")[0];
  return ["huevo", "huevos"].includes(firstWord) ? "unidad" : "unidad";
}

function removeTrailingNotes(name) {
  return String(name)
    .replace(/\([^)]*\)/g, "")
    .replace(/,\s*.+$/, "")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => token.replace(/(?:es|s)$/i, ""))
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function setStatus(text, type = "ok") {
  elements.dataStatus.textContent = text;
  elements.dataStatus.style.background = type === "danger" ? "#ffe2dc" : type === "warn" ? "#fff2c9" : "#dff1eb";
  elements.dataStatus.style.color = type === "danger" ? "#862b1c" : type === "warn" ? "#735116" : "#17463d";
}

function roundUp(value, step) {
  return Math.ceil(value / step) * step;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function debounce(callback, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
}
