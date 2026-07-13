# Backend Google Apps Script

Este backend agrega insumos nuevos al Google Sheet usado por la web.

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

## Columnas esperadas

La hoja debe usar estas columnas:

```csv
insumo,precio,cantidad,unidad
```

El backend crea esos encabezados si la hoja esta vacia o si no los encuentra en la primera fila.

## Nota

Google Apps Script solo actualizara el Sheet cuando `appsScriptUrl` este configurado. Mientras no lo este, la web guarda los insumos localmente en el navegador.
