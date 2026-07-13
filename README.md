# Calculadora de precios para recetas

Web local para pegar una receta, cargar internamente costos de insumos desde Google Sheets publicado como CSV y sugerir el precio por porcion o unidad.

## Como usarla

1. Abre la app con un servidor local:

   ```bash
   python3 -m http.server 8000
   ```

2. Entra a `http://localhost:8000`.
3. Pega la receta con una linea por ingrediente.
4. Ajusta porciones, margen, merma, mano de obra y gastos indirectos.
5. Los costos se cargan automaticamente desde la fuente interna configurada.
6. Usa el boton `Ver lista` para revisar los insumos cargados.

## Formato recomendado para Google Sheets

La primera fila debe tener estos encabezados:

```csv
insumo,precio,cantidad,unidad
Harina todo uso,4.50,1,kg
Mantequilla,10.50,200,g
Huevos,9.00,15,unidad
```

La columna `precio` es el precio total de compra. La columna `cantidad` y `unidad` describen el contenido comprado. Por ejemplo: si compras 1 kg de harina a S/ 4.50, escribe `4.50`, `1`, `kg`.

## Configurar Google Sheets interno

La persona que use la web no debe subir ni pegar la hoja. La URL va dentro del proyecto, en `config.js`.

1. En Google Sheets, abre `Archivo > Compartir > Publicar en la web`.
2. Elige la hoja de costos.
3. Selecciona formato CSV.
4. Copia la URL.
5. Abre `config.js` y pegala en `sheetCsvUrl`.

Ejemplo:

```js
window.RECIPE_COSTING_CONFIG = {
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/ID/export?format=csv&gid=0",
};
```

Tambien puedes pegar una URL publica normal de Google Sheets; la app intentara convertirla a CSV automaticamente.

## Backend para agregar insumos

Para que el boton `Agregar insumo` escriba en Google Sheets, usa el backend de Apps Script incluido en:

```text
backend/google-apps-script/Code.gs
```

Luego pega la URL del Web App en `config.js`:

```js
window.RECIPE_COSTING_CONFIG = {
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/ID/export?format=csv&gid=0",
  appsScriptUrl: "https://script.google.com/macros/s/ID_DEL_DEPLOYMENT/exec",
};
```

Si `appsScriptUrl` esta vacio, los insumos agregados se guardan solo en el navegador.

## Notas importantes

- Si tu hoja es privada, se necesita una segunda etapa con backend, OAuth de Google o Apps Script.
- Las unidades compatibles incluyen `g`, `kg`, `ml`, `l`, `taza`, `cda`, `cdta` y `unidad`.
- Algunas equivalencias de tazas o cucharadas a gramos son estimadas y se marcan en el detalle.
