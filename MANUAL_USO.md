# Manual de uso — CAPITAL | Generador Informes para bancos

## 1. ¿Qué hace esta aplicación?

Permite generar, sin escribir una sola consulta SQL, el informe de ventas
que cada entidad bancaria solicita (BBVA, Banco de Bogotá, Bancolombia,
Banco de Occidente, Caja Social y Colpatria), listo para descargar en Excel.

## 2. Cómo iniciar la aplicación

1. Ir a la carpeta del proyecto (`HMTL`).
2. Hacer doble clic en **`INICIAR_WINDOWS.bat`**.
3. La primera vez, o si la sesión anterior de conexión expiró, la ventana
   negra (consola) pedirá:
   - **Usuario SQL Server** (presionar Enter para usar el sugerido).
   - **Contraseña SQL Server** (la escritura no se muestra en pantalla, es
     normal).
4. Si la conexión es correcta, la credencial se guarda cifrada en el equipo
   y **no se volverá a pedir** en próximos inicios desde esa misma cuenta de
   Windows.
5. Se abre automáticamente el navegador en `http://127.0.0.1:3000/` con la
   aplicación lista para usar.

> Si aparece el mensaje "La aplicación ya está ejecutándose en el puerto
> 3000", significa que ya había una ventana abierta; simplemente se abrirá
> el navegador sobre esa misma sesión.

### Para cerrar la aplicación

Cerrar la ventana negra de PowerShell (o presionar `Ctrl+C` dentro de ella).
Cerrar solo la pestaña del navegador no apaga el servidor.

## 3. Generar un informe — paso a paso

### Paso 1. Seleccionar el Macroproyecto

En el primer menú desplegable, elegir el macroproyecto correspondiente.

### Paso 2. Seleccionar la Torre / Proyecto

El segundo menú se habilita y se llena automáticamente con las torres que
pertenecen al macroproyecto elegido en el paso 1.

### Paso 3. Seleccionar el Banco

Elegir una de las seis entidades: **BBVA, Banco de Bogotá, Bancolombia,
Banco de Occidente, Caja Social o Colpatria**.

### Paso 4. Consultar

Hacer clic en el botón **Consultar**. El recuadro "Resumen de consulta"
muestra el macroproyecto, la torre, el banco elegidos y la cantidad de
registros encontrados una vez termina la búsqueda.

Si cambias el macroproyecto, la torre o el banco antes de que termine una
consulta anterior, esa consulta anterior se descarta automáticamente y no
aparecerá en pantalla.

## 4. Revisar y organizar el resultado

Una vez hecha la consulta, la tabla de **Vista previa de resultados** se
llena con los datos encontrados, en páginas de **25 registros**. Usa los
botones `‹` `›` y los números de página en la parte inferior para recorrer
todos los resultados.

### Configurar columnas

Haz clic en **"⚙ Configurar columnas"** para abrir el panel lateral, donde
puedes:

- **Buscar una columna** por nombre, con el campo de búsqueda.
- **Marcar / desmarcar** la casilla junto a cada columna para incluirla o
  excluirla del Excel que se va a descargar (no se elimina de la base de
  datos, solo de este informe).
- **Arrastrar** cada fila de la lista (o el encabezado de la tabla) para
  cambiar el orden en que aparecerá esa columna, tanto en la vista previa
  como en el Excel final.
- **"Seleccionar todas"** / **"Quitar selección"**: marca o desmarca todas
  las columnas de una sola vez.
- **"↺ Restablecer orden"**: regresa las columnas al orden original en que
  las entregó la consulta.

> Tus preferencias de orden y de columnas excluidas se guardan
> automáticamente en el navegador, **por banco**. La próxima vez que
> consultes ese mismo banco (incluso en otra torre), se recordará tu
> configuración.

## 5. Descargar el informe en Excel

Haz clic en **"▧ Descargar Excel"**. Se descargará un archivo `.xlsx` con:

- Únicamente las columnas que dejaste marcadas.
- En el orden exacto que configuraste.
- **Todos** los registros de la consulta (no solo los 25 de la página
  visible en pantalla).

El archivo se nombra automáticamente como
`CAPITAL_<BANCO>_<fecha>_<hora>.xlsx` (por ejemplo,
`CAPITAL_BBVA_20261117_0930.xlsx`).

## 6. Otros botones

| Botón | Qué hace |
|---|---|
| **⟳ Nueva consulta** | Limpia por completo la selección (macroproyecto, torre, banco) y los resultados, para empezar de cero. |
| **♧ Limpiar** | Limpia solo los resultados de la consulta actual, conservando el macroproyecto/torre/banco elegidos. |

## 7. Archivos base (Excel de equivalencias)

En el panel **"Archivos base (Excel)"**, en la parte superior, se muestran
dos archivos que afectan el cálculo de los informes:

- **`TIPO_UNIDAD.xlsx`**: clasifica cada tipo de inventario (apartamento,
  parqueadero, útil, local, etc.).
- **`INCLUYE_CONCEPTO.xlsx`**: define qué conceptos de pago (cuotas,
  créditos, subsidios, etc.) se suman en los totales de cada informe.

Para cada archivo se indica si está usando la versión **"Base inicial"** (la
que trae la aplicación) o una versión **"Personalizado"** (una que tú
cargaste), junto con la cantidad de filas de equivalencias que contiene.

### Cargar un archivo nuevo

1. Clic en **"↑ Cargar archivos Excel"**.
2. Elegir cuál de los dos archivos vas a reemplazar.
3. Seleccionar el archivo `.xlsx` desde tu equipo (debe pesar menos de 5 MB
   y tener las columnas `CONCEPTO` y `TIPO_UNIDAD` o `CONCEPTO` e `INCLUIR`,
   según corresponda, en la primera fila).
4. Si el archivo es válido, se guarda de inmediato y se usará en la próxima
   consulta que hagas (no hace falta reiniciar la aplicación).

### Descargar el archivo vigente

Clic en el ícono **"↓"** junto al archivo que quieras revisar o editar.

### Restaurar el archivo original

Clic en el ícono **"↺"** (solo visible si hay un archivo personalizado
cargado). Pedirá confirmación y, al aceptar, se volverá a usar el archivo
base que trae la aplicación.

## 8. Mensajes y solución de problemas frecuentes

| Mensaje / situación | Qué significa | Qué hacer |
|---|---|---|
| "No fue posible consultar macroproyectos" | No hay conexión válida a SQL Server | Cerrar la aplicación, volver a abrir `INICIAR_WINDOWS.bat` e ingresar la cuenta SQL cuando se solicite. |
| "El macroproyecto seleccionado no tiene torres asociadas" | No hay ventas registradas para ese macroproyecto | Verificar en SQL Server o elegir otro macroproyecto. |
| "No se encontraron registros para la selección" | La consulta corrió bien, pero no hay ventas en esa torre para ese banco | Revisar que la torre y el banco sean los correctos. |
| "La consulta expiró o no existe. Ejecute Consultar nuevamente" | Pasaron más de 30 minutos desde la última consulta | Volver a hacer clic en Consultar. |
| El botón "Descargar Excel" está desactivado | No hay consulta vigente o no hay ninguna columna marcada | Ejecutar una consulta y marcar al menos una columna en "Configurar columnas". |
| "El servidor no respondió" al iniciar | El servidor tardó en arrancar o hubo un error de conexión | Revisar la ventana de PowerShell que se abrió detrás; ahí aparece el detalle del error. |

## 9. Preguntas frecuentes

**¿Puedo tener la aplicación abierta en varias pestañas del navegador?**
Sí, todas comparten el mismo servidor local; pero las consultas y la
selección de columnas no se sincronizan entre pestañas.

**¿Si cierro el navegador se pierde el informe?**
Si ya descargaste el Excel, no — el archivo queda guardado en tu carpeta de
descargas. Si no lo habías descargado, deberás volver a consultar.

**¿Puedo modificar qué columnas trae cada banco?**
Eso requiere un ajuste técnico en el archivo de consulta de ese banco
(carpeta `consultas/`), no se configura desde la pantalla. Contacta a quien
mantiene el proyecto para ese tipo de cambios.

**¿Esta aplicación envía información a internet?**
No. Todo el procesamiento ocurre en tu propio equipo, entre el navegador y
el servidor local (`127.0.0.1`); solo se conecta a la base de datos SQL
Server interna de la empresa.
