const assert = require("node:assert/strict");
const fs = require("node:fs");

const elementsBySelector = new Map();

function getElement(selector) {
  if (!elementsBySelector.has(selector)) {
    elementsBySelector.set(selector, {
      value: "",
      textContent: "",
      innerHTML: "",
      style: {},
      classList: {
        add() {},
        remove() {},
        toggle() {},
      },
      setAttribute() {},
      addEventListener() {},
      querySelector() {
        return { textContent: "" };
      },
      reset() {},
      focus() {},
    });
  }

  return elementsBySelector.get(selector);
}

global.window = { RECIPE_COSTING_CONFIG: {}, setTimeout, clearTimeout };
global.document = {
  querySelector: getElement,
  addEventListener() {},
  head: { appendChild() {} },
  createElement() {
    return {
      remove() {},
      set src(value) {},
    };
  },
};
global.localStorage = {
  getItem() {
    return "[]";
  },
  setItem() {},
};
global.navigator = { clipboard: { writeText() {} } };

const appCode = fs.readFileSync("app.js", "utf8");

eval(`${appCode}
state.sourceCosts = parseCsv(defaultCostsCsv)
  .slice(1)
  .map((row) => parseCostRow(row, { name: 0, price: 1, quantity: 2, unit: 3 }))
  .filter(Boolean);
state.customCosts = [];
mergeCostLists();

function testCostLine(line) {
  return costRecipeItem(parseRecipeLine(line));
}

global.__costingTestApi = {
  elements,
  state,
  sampleRecipe,
  testCostLine,
  calculate,
};
`);

const api = global.__costingTestApi;

assert.equal(api.testCostLine("500 g harina").status, "OK");
assert.equal(api.testCostLine("250 g azucar blanca").costItem.name, "Azucar blanca");
assert.equal(api.testCostLine("250 g azucar").status, "Insumo ambiguo");
assert.equal(api.testCostLine("120 ml leche").status, "Insumo ambiguo");
assert.equal(api.testCostLine("200 g chocolate blanco").status, "Insumo no encontrado");
assert.equal(api.testCostLine("1 taza harina").status, "Calculado con equivalencia");

api.elements.servingsInput.value = "12";
api.elements.marginInput.value = "45";
api.elements.wasteInput.value = "5";
api.elements.laborInput.value = "12";
api.elements.overheadInput.value = "8";
api.elements.roundingInput.value = "0.5";

api.elements.recipeText.value = api.sampleRecipe;
api.calculate();
assert.ok(api.state.lastResult, "valid sample recipe should calculate a result");
assert.ok(api.state.lastResult.saleTotal > 0, "valid sample recipe should have a sale total");

api.elements.marginInput.value = "100";
api.calculate();
assert.ok(api.state.lastResult, "100 percent profit on cost should calculate a result");
assert.ok(
  api.state.lastResult.saleTotal >= api.state.lastResult.costBeforeMargin * 2,
  "100 percent profit on cost should at least double the total cost after rounding",
);

api.elements.recipeText.value = "500 g harina\\n250 g azucar\\n200 g chocolate blanco";
api.calculate();
assert.equal(api.state.lastResult, null, "invalid recipe must not produce a price");
assert.match(api.elements.unitPrice.textContent, /0\.00$/);

console.log("costing regression tests passed");
