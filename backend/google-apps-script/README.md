# Backend Google Apps Script

Este backend lee, agrega, edita y elimina insumos del Google Sheet usado por la web.

## Preparacion

1. Abre tu Google Sheet de insumos.
2. Ve a `Extensiones > Apps Script`.
3. Borra el codigo inicial y pega el contenido de `Code.gs`.
4. Guarda el proyecto.
5. Clic en `Implementar > Nueva implementacion`.
6. Tipo: `Aplicacion web`.
7. Ejecutar como: `Yo`.
8. Quien tiene acceso: `Cualquier persona`.
9. Implementa y copia la URL que termina en `/exec`.
10. Pega esa URL en `config.js`, en `appsScriptUrl`.

Cuando actualices el codigo, vuelve a `Implementar > Administrar implementaciones`, edita la implementacion web y selecciona una version nueva. Si no haces eso, la URL puede seguir usando el codigo anterior.

## Columnas esperadas

La hoja debe usar estas columnas:

```csv
insumo,precio,cantidad,unidad
```

El backend crea esos encabezados si la hoja esta vacia o si no los encuentra en la primera fila.

## Lectura desde la web

Si `sheetCsvUrl` esta vacio y `appsScriptUrl` esta configurado, la web leera la lista de insumos desde la pestaña `Insumos` usando este backend. Esto permite actualizar el Google Sheet manualmente sin depender del CSV publicado.

## Edicion de insumos

La web envia acciones internas al backend:

- `create`: crea un insumo nuevo y rechaza duplicados.
- `update`: actualiza un insumo existente.
- `delete`: elimina un insumo existente.

Despues de cambiar este archivo, debes crear una nueva version de la implementacion en Apps Script para que la URL `/exec` use el codigo actualizado.

## Nota

Google Apps Script solo leera y actualizara el Sheet cuando `appsScriptUrl` este configurado. Mientras no lo este, la web usa el archivo de ejemplo y guarda los insumos localmente en el navegador.
