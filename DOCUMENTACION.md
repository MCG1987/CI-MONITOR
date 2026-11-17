# CAPITAL | Generador Informes para bancos — Documentación técnica

## 1. Descripción general

Aplicación web **local** (no requiere internet ni servidor remoto) para consultar
información de ventas en SQL Server, generar informes específicos para seis
entidades bancarias y exportarlos a Excel. Elimina la necesidad de escribir
consultas SQL manuales o transformar datos en Power Query cada vez que se
solicita un informe bancario.

| Componente | Implementación |
|---|---|
| Sistema operativo | Windows 11 |
| Interfaz | HTML5 + CSS3 + JavaScript (sin frameworks) |
| Servidor | Windows PowerShell 5.1 (`System.Net.HttpListener`) |
| Base de datos | SQL Server (ADO.NET / `System.Data.SqlClient`) |
| Base de datos usada | `SincoCapital_NuevaDW` |
| Esquema principal | `ADI_DTM` |
| Dirección local | `http://127.0.0.1:3000/` |
| Exportación | Excel `.xlsx` (generado sin dependencias externas) |

El navegador **nunca** ve credenciales SQL ni sentencias SQL: todo el acceso a
datos ocurre en el proceso de PowerShell, que sirve una API JSON local.

## 2. Arquitectura

```
Navegador (HTML/JS)  ──HTTP local (127.0.0.1:3000)──>  SERVIDOR.ps1 (HttpListener)
                                                              │
                                                              ├─> consultas/*.txt (SQL por banco)
                                                              ├─> base/ + datos/ (equivalencias .xlsx)
                                                              ├─> modulos/EXCEL.ps1 (generación .xlsx)
                                                              └─> SQL Server (ADI_DTM, ADO.NET)
```

- El HTML (`app/index.html`, `app/app.js`, `app/styles.css`) solo habla con la
  API local vía `fetch`; no contiene SQL ni credenciales.
- `SERVIDOR.ps1` es el único proceso con acceso a SQL Server. Lee las consultas
  `.txt` desde disco en cada ejecución (no las cachea en memoria), por lo que
  los ajustes a los TXT se reflejan sin reiniciar el servidor.
- `modulos/EXCEL.ps1` construye el archivo `.xlsx` manualmente en formato
  OOXML (ZIP + XML), sin depender de Microsoft Excel ni de módulos de
  PowerShell externos (como `ImportExcel`).

## 3. Estructura de carpetas

```
HMTL/
├── INICIAR_WINDOWS.bat        Punto de entrada para el usuario final
├── ARRANCAR.ps1                Inicio guiado: valida conexión SQL y lanza SERVIDOR.ps1
├── SERVIDOR.ps1                 Servidor HTTP local + API + lógica SQL
│
├── app/
│   ├── index.html               Interfaz
│   ├── styles.css                Estilos
│   └── app.js                    Lógica de interfaz (sin SQL embebido)
│
├── config/
│   └── CONEXION.ps1              Parámetros de conexión SQL (sin contraseña)
│
├── consultas/
│   ├── _MACROPROYECTOS.txt       Lista de macroproyectos
│   ├── _TORRES.txt               Torres de un macroproyecto (parámetro @macro)
│   ├── actual_BBVA.txt
│   ├── actual_BANCO_BOGOTA.txt
│   ├── actual_BANCOLOMBIA.txt
│   ├── actual_BANCO_OCCIDENTE.txt
│   ├── actual_CAJA_SOCIAL.txt
│   └── actual_COLPATRIA.txt
│
├── modulos/
│   └── EXCEL.ps1                 Generación de archivos .xlsx (sin dependencias)
│
├── base/
│   ├── TIPO_UNIDAD.xlsx           Equivalencias originales (tipo de unidad)
│   └── INCLUYE_CONCEPTO.xlsx      Equivalencias originales (conceptos incluidos)
│
└── datos/                        Equivalencias personalizadas (se crea en el primer uso)
```

`datos/` y las credenciales cifradas se crean automáticamente la primera vez
que se ejecuta la aplicación; no vienen incluidas en el paquete entregado.

## 4. Conexión a SQL Server

Configurada en [`config/CONEXION.ps1`](config/CONEXION.ps1):

```powershell
Servidor = '10.10.20.125,3064'
BaseDatos = 'SincoCapital_NuevaDW'
Autenticacion = 'SQL'          # Windows | SQL
UsuarioSQL = 'SincoCapitalMedellinUsuarioDW'
VariablePassword = 'CAPITAL_SQL_PASSWORD'
TiempoConexionSegundos = 15
TiempoConsultaSegundos = 180
MaximoFilasConsulta = 200000
```

### Manejo de credenciales

- **Nunca** se almacenan contraseñas en texto plano en archivos del proyecto.
- Al ejecutar `INICIAR_WINDOWS.bat` → `ARRANCAR.ps1`, si no hay una conexión
  SQL vigente, la aplicación solicita usuario y contraseña por consola
  (entrada oculta) y guarda la credencial cifrada con **DPAPI** en
  `%LocalAppData%\CAPITAL\InformesBancos\credencial_sql.xml`, ligada al
  usuario y equipo de Windows (no es portable a otra máquina ni usuario).
- La contraseña se pasa al proceso del servidor únicamente mediante una
  variable de entorno de **proceso** (`CAPITAL_SQL_PASSWORD`), nunca se
  escribe en disco sin cifrar, y se limpia del proceso de `ARRANCAR.ps1` una
  vez lanzado el servidor.
- Se admite también autenticación integrada de Windows (`Autenticacion =
  'Windows'`).
- **Recomendación vigente**: usar una cuenta SQL con permisos exclusivos de
  `SELECT` sobre el esquema `ADI_DTM`.

### Protección contra escritura accidental

`SERVIDOR.ps1` valida cada consulta antes de ejecutarla
(`Assert-SqlSoloLectura`): rechaza cualquier texto SQL que contenga
`INSERT, UPDATE, DELETE, DROP, ALTER, MERGE, TRUNCATE, EXEC(UTE), CREATE,
GRANT, REVOKE, BACKUP, RESTORE, DBCC, OPENROWSET, OPENDATASOURCE, BULK, INTO`
fuera de comentarios o literales de texto. Esta es una capa preventiva
adicional; la protección real es que la cuenta SQL configurada **no tenga
permisos de escritura**.

### Tablas utilizadas

| Tabla | Uso |
|---|---|
| `ADI_DTM.Proyectos` | Lista de macroproyectos |
| `ADI_DTM.Venta` | Ventas, comprador, fechas, valores, torre (`VtaNombreProyecto`) |
| `ADI_DTM.Comprador` | Documento, celular, correo del comprador |
| `ADI_DTM.Acuerdos_Pago` | Pactado/Pagado por concepto (crédito, subsidios, recaudo) |
| `ADI_DTM.Inventarios` | Área, tipo de unidad, parqueaderos, útiles |
| `ADI_DTM.Tramites` | Fechas y estados de trámites bancarios (p. ej. `DCH`, `EDI`) |

El filtro obligatorio de cada consulta bancaria es la torre:
`V.[VtaNombreProyecto] = @torre` (parametrizado, nunca concatenado).

## 5. API HTTP local (`SERVIDOR.ps1`)

Todas las rutas responden JSON (o el archivo binario en descargas). El
servidor solo sirve `index.html`, `styles.css` y `app.js` desde `/app`; no
expone rutas de archivos arbitrarias.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Página principal |
| GET | `/api/health` | Estado del servidor (usado por `ARRANCAR.ps1`) |
| GET | `/api/bancos` | Lista fija de 6 bancos soportados |
| GET | `/api/macroproyectos` | Ejecuta `_MACROPROYECTOS.txt` |
| GET | `/api/torres?macro=...` | Ejecuta `_TORRES.txt` con `@macro` |
| GET | `/api/equivalencias` | Estado de los 2 archivos de equivalencias (base o personalizado) |
| GET | `/api/equivalencias/descargar?tipo=...` | Descarga el Excel de equivalencias vigente |
| POST | `/api/equivalencias/cargar` | Sube un Excel de equivalencias (base64), lo valida y lo guarda en `datos/` |
| POST | `/api/equivalencias/restaurar` | Elimina el Excel personalizado y vuelve al de `base/` |
| POST | `/api/consultar` | Ejecuta la consulta del banco elegido para `{macro, torre, banco}` |
| GET | `/api/pagina?token=...&pagina=N` | Devuelve una página (25 filas) de resultados ya cacheados |
| POST | `/api/exportar` | Genera y descarga el Excel con las columnas y el orden indicados |

### Flujo de `/api/consultar`

1. Valida que la torre pertenezca realmente al macroproyecto elegido
   (vuelve a ejecutar `_TORRES.txt` y compara).
2. Lee el TXT del banco (`Get-ConsultaPreparada`):
   - Sustituye `{{INCLUYE_CONCEPTO_VALUES}}` y `{{TIPO_UNIDAD_VALUES}}` con
     los valores vigentes de los Excel de equivalencias (leídos en cada
     consulta, no cacheados).
   - Verifica que no queden marcadores `{{...}}` sin resolver.
   - Reemplaza el `DECLARE @torre NVARCHAR(200) = '...'` fijo del archivo por
     un parámetro real (`@p_torre`), de modo que el valor de ejemplo que cada
     TXT trae nunca se ejecuta contra SQL Server.
3. Ejecuta la consulta parametrizada y valida que no exceda
   `MaximoFilasConsulta` (200 000 por defecto).
4. Guarda el resultado completo (`DataTable`) en una caché en memoria
   (`$script:Cache`), indexada por un token GUID, con expiración de 30
   minutos de inactividad (`Limpiar-Cache`).
5. Devuelve al navegador solo la primera página (25 filas) más el total de
   registros y los nombres de columna.

La vista previa pagina sobre esa caché (`/api/pagina`); el Excel exportado
(`/api/exportar`) usa siempre **todas** las filas de la caché, no solo la
página visible.

## 6. Consultas SQL por banco (`consultas/actual_*.txt`)

Cada banco tiene un archivo `.txt` independiente con SQL puro (más
comentarios `--`). El servidor los relee de disco en cada consulta: **se
pueden editar sin reiniciar la aplicación ni tocar el HTML o PowerShell**.

Estructura común:
- `DECLARE @torre NVARCHAR(200) = '...'` — valor de ejemplo, reemplazado en
  tiempo de ejecución por el parámetro real.
- Marcadores `{{INCLUYE_CONCEPTO_VALUES}}` / `{{TIPO_UNIDAD_VALUES}}` cuando
  la consulta necesita las equivalencias de Excel.
- CTEs (`WITH ...`) para calcular agregados por venta (recaudo, crédito,
  subsidios, área, parqueaderos, útiles, trámites).
- Un `SELECT` final con exactamente las columnas requeridas, en el orden
  solicitado por cada banco.

### 6.1. BBVA — `actual_BBVA.txt` (14 columnas)

`CodigoInterno, Area, ValorNeto, Entidad, NombreComprador, DocComprador,
CompradorCelular, CompradorCorreo, FechaVenta, VALOR CREDITO, Tipo, Suma de
CUOTA_INICIAL, Suma de TOTAL_RECAUDADO, Suma de TOTAL_OTROS_CONCEPTOS`

- `Tipo` = `V.[Tipo]` (columna directa de `ADI_DTM.Venta`).
- `VALOR CREDITO` = suma de `Pactado` en `Acuerdos_Pago` cuyo concepto
  contiene `Cred`.
- `CUOTA_INICIAL` = `ValorNeto − VALOR CREDITO`.
- `TOTAL_RECAUDADO` = suma de `Pagado` de los conceptos marcados `SI` en
  `INCLUYE_CONCEPTO.xlsx`.
- `TOTAL_OTROS_CONCEPTOS` = suma de `Pagado` de conceptos que contienen
  `Gastos Lega`, `Intere` o `Mayor V`.
- Join con comprador por `V.CompradorDocumento = C.DocComprador`.
- `SALDO_POR_ABONAR_CUOTA` fue **retirada** de esta consulta (ya no existe).

### 6.2. Banco de Bogotá — `actual_BANCO_BOGOTA.txt` (12 columnas)

`CodigoInterno, NombreComprador, DocComprador, CompradorCelular,
CompradorCorreo, ValorNeto, Entidad, CUOTA_INICIAL_PAGADA, RECURSOS_PROPIOS,
Suma de SUBSIDIO_CAJA, Suma de SUBSIDIO_MCY, Suma de VALOR CREDITO`

- `CUOTA_INICIAL_PAGADA` = `TOTAL_RECAUDADO` del CTE `aux_RECAUDO_INICIAL`
  (suma de `Pagado` de los conceptos marcados `SI` en
  `INCLUYE_CONCEPTO.xlsx`).
- `RECURSOS_PROPIOS` = `TOTAL_PACTADO` del CTE `aux_Pactada` (suma de
  `Pactado` de los conceptos marcados `SI` en `INCLUYE_CONCEPTO.xlsx`).
- `SUBSIDIO_CAJA` / `SUBSIDIO_MCY`: distinguen subsidio de Caja de
  Compensación vs. "Subsidio Mi Casa Ya" por el campo `Entidad`.
- Join con comprador por `V.CompradorDocumento = C.DocComprador`.

### 6.3. Bancolombia — `actual_BANCOLOMBIA.txt` (16 columnas)

`FechaVenta, TORRE, CodigoInterno, Area, NombreComprador, CompradorTipoDoc,
DocComprador, CompradorCelular, CompradorCorreo, ValorNeto,
TOTAL_RECAUDADO, Entidad, CREDITO_DESEMBOLSADO, %_RECIBIDO_TOTAL, Suma de
VALOR SUBSIDIO, Suma de VALOR CREDITO`

- `%_RECIBIDO_TOTAL = TOTAL_RECAUDADO / ValorNeto` (fracción decimal, p. ej.
  `0.25` = 25 %); `NULL` si `ValorNeto` es `0`, nulo o no numérico.
- `CREDITO_DESEMBOLSADO` = `'SI'`/`'NO'` según exista fecha de cumplimiento
  del trámite `DCH`.
- `TORRE` se deriva del último token de `VtaNombreProyecto`.
- Join con comprador por `V.IdComprador = C.IdComprador` (⚠️ distinto al
  usado en BBVA/Bogotá — ver sección 8).

### 6.4. Banco de Occidente — `actual_BANCO_OCCIDENTE.txt` (13 columnas)

`No_UNIDAD, NombreComprador, DocComprador, CompradorCelular, ValorNeto,
Area, FechaVenta, Suma de VALOR_M2, Suma de TOTAL_RECAUDADO, Suma de
TOTAL_PACTADO, Suma de VALOR CREDITO, Suma de TOTAL_PARQUEADEROS, Suma de
TOTAL_UTILES`

- `VALOR_M2 = ValorNeto (ADI_DTM.Venta) / Area` (`NULL` si el área es nula,
  cero o no numérica).
- Solo incluye ventas cuyo inventario clasificado (vía `TIPO_UNIDAD.xlsx`)
  sea `APTO` o `LOCAL` (`INNER JOIN InventariosClasificados`).
- `TOTAL_PARQUEADEROS` / `TOTAL_UTILES`: conteo de inventarios clasificados
  como `PARQ` / `UTIL`.

### 6.5. Caja Social — `actual_CAJA_SOCIAL.txt` (13 columnas)

`CodigoInterno, TOTAL_PARQUEADEROS, TOTAL_UTILES, NombreComprador,
DocComprador, ValorNeto, FechaVenta, TIPO_SUBSIDIO, Fecha Programada_DCH,
Entidad, Suma de TOTAL_PACTADO, Suma de TOTAL_RECAUDADO, Suma de VALOR
SUBSIDIO`

- `TIPO_SUBSIDIO` ∈ `{CAJA-MCY, CAJA, MCY, ''}` según tenga subsidio de caja,
  Mi Casa Ya, ambos o ninguno.
- `Fecha Programada_DCH`: fecha programada del trámite `DCH`.

### 6.6. Colpatria — `actual_COLPATRIA.txt` (12 columnas)

`No_UNIDAD, Area, TIPO_UNIDAD, ValorNeto, TOTAL_PACTADO, Tipo, FechaVenta,
Fecha Programada, NombreComprador, Entidad, Suma de TOTAL_RECAUDADO, Suma de
VALOR CREDITO`

- `Tipo` = `V.[Tipo]` (columna directa de `ADI_DTM.Venta`).
- `TIPO_UNIDAD`: clasificación del inventario según `TIPO_UNIDAD.xlsx`
  (distinta de `Tipo`).
- `Fecha Programada`: fecha programada del trámite `EDI`.

## 7. Equivalencias Excel (`TIPO_UNIDAD.xlsx` / `INCLUYE_CONCEPTO.xlsx`)

- **`TIPO_UNIDAD.xlsx`**: columnas `CONCEPTO` / `TIPO_UNIDAD`. Clasifica el
  tipo de inventario original (`InvTipoUnidad`) en categorías como `APTO`,
  `PARQ`, `UTIL`, `LOCAL`.
- **`INCLUYE_CONCEPTO.xlsx`**: columnas `CONCEPTO` / `INCLUIR` (`SI`/`NO`).
  Define qué conceptos de `Acuerdos_Pago` entran en los totales de recaudo
  pactado/pagado.
- Se leen directamente del XML interno del `.xlsx` (sin COM ni librerías
  externas) mediante `Read-ExcelEquivalencias` en `modulos/EXCEL.ps1`.
- Validaciones al cargar un archivo nuevo: extensión `.xlsx`, firma binaria
  ZIP (`PK`), tamaño ≤ 5 MB, encabezados correctos, sin conceptos duplicados,
  valores `SI`/`NO` válidos, máximo 5000 filas.
- Un archivo personalizado se guarda en `datos/<TIPO>.xlsx` y tiene prioridad
  sobre el de `base/`. "Restaurar" simplemente elimina el archivo
  personalizado.
- Cada consulta que use los marcadores `{{...}}` lee el Excel vigente **en
  el momento de ejecutarse**, por lo que no es necesario reiniciar nada tras
  cambiar una equivalencia.

## 8. Puntos de atención conocidos (no resueltos aún)

1. **Join de comprador inconsistente entre bancos**: BBVA y Banco de Bogotá
   unen por `V.CompradorDocumento = C.DocComprador`; Bancolombia, Banco de
   Occidente, Caja Social y Colpatria unen por `V.IdComprador =
   C.IdComprador`. Si ambos valores no son siempre consistentes en los
   datos de origen, el nombre/celular/correo del comprador podría diferir
   entre bancos para la misma venta.
2. **Banco de Occidente usa `INNER JOIN`** contra el inventario clasificado
   como `APTO`/`LOCAL`, a diferencia de los demás bancos (que usan `LEFT
   JOIN`). Esto descarta ventas sin esa clasificación de inventario.
3. El `DECLARE @torre` de cada TXT trae un valor de ejemplo "quemado"
   (p. ej. `'PUERTO CAPRI T1'`); es reemplazado por el servidor en tiempo de
   ejecución (sección 5), por lo que no afecta el funcionamiento, pero debe
   mantenerse presente exactamente una vez en cada archivo (el servidor
   lanza un error si no encuentra exactamente una coincidencia del patrón).

## 9. Generación del Excel (`modulos/EXCEL.ps1`)

- Construye el `.xlsx` manualmente como paquete OOXML (ZIP con partes XML:
  `workbook.xml`, `styles.xml`, `worksheets/sheet1.xml`, etc.), sin Excel
  instalado ni módulos de PowerShell de terceros.
- Soporta encabezados más allá de la columna `Z` (usa letras de columna
  `AA`, `AB`, … hasta `XFD`), con una conversión robusta para PowerShell 5.1
  que evita el bug de conversión `Decimal → Char`.
- Aplica formato de encabezado (fondo turquesa, texto blanco), formato de
  fecha (`yyyy-mm-dd`) y formato numérico (`#,##0.00`) según el tipo real de
  cada valor (`DateTime`, numérico, booleano o texto).
- Incluye autofiltro en la fila de encabezados y congela esa primera fila.
- El archivo temporal se genera en la carpeta temporal del sistema y se
  elimina inmediatamente después de enviarse al navegador.

## 10. Seguridad y alcance

- Servidor vinculado únicamente a `127.0.0.1` (no accesible desde la red).
- Sin autenticación de usuarios de la aplicación (de uso interno, en equipo
  local); el control de acceso real recae en los permisos de la cuenta SQL.
- Tamaño máximo de solicitud HTTP: 8.5 MB; tamaño máximo de archivo Excel de
  equivalencias: 5 MB.
- No se registra actividad en archivos de log; los errores se imprimen en la
  consola donde corre `SERVIDOR.ps1`.

## 11. Estado funcional

| Funcionalidad | Estado |
|---|---|
| Inicio guiado con validación de conexión SQL | Implementado |
| Selección dependiente macroproyecto → torre → banco | Implementado |
| Ejecución de las 6 consultas bancarias | Implementado |
| Columnas dinámicas, reordenables y configurables | Implementado |
| Persistencia de preferencias de columnas (`localStorage`) | Implementado |
| Paginación de resultados (25 por página) | Implementado |
| Exportación a Excel con todas las filas y columnas seleccionadas | Implementado |
| Equivalencias Excel editables, con restauración a base | Implementado |
| `CUOTA_INICIAL` (BBVA) y `CUOTA_INICIAL_PAGADA` / `RECURSOS_PROPIOS` (Bogotá) | Definidos y calculados |
| Validación financiera integral con datos reales de los 6 bancos | Pendiente de verificación por el usuario |
