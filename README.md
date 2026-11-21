# CI-MONITOR — Integración continua (semanas 3 y 5)

**Asignatura:** Énfasis Profesional I — Integración Continua  
**Repositorio:** [MCG1987/CI-MONITOR](https://github.com/MCG1987/CI-MONITOR)  
**Rama principal:** `main`

CI-MONITOR es una aplicación web mínima con **dos contenedores Docker comunicados entre sí**. En la semana 3 se preparó la arquitectura con Docker Compose; en la semana 5 se incorporó un `Jenkinsfile` para automatizar la construcción y la comprobación de la comunicación entre servicios.

## 1. Arquitectura y funcionamiento

```text
Navegador
   |
   | http://localhost:8080 (solo en ejecución manual)
   v
Frontend: Nginx + HTML/CSS/JavaScript
   |
   | GET /api/estado
   | proxy interno a http://backend:3000/api/estado
   v
Backend: Node.js (API HTTP, puerto interno 3000)
```

1. El navegador abre la página del frontend.
2. El botón **Verificar conexión** solicita `/api/estado`.
3. Nginx reenvía la solicitud al backend por la red interna de Docker.
4. Node.js responde con un JSON que contiene `estado: "activo"` y un mensaje de confirmación.

El puerto 3000 del backend no se publica al equipo. La aplicación no necesita una base de datos ni paquetes npm adicionales.

## 2. Estructura del repositorio

| Archivo | Función |
| --- | --- |
| `frontend/index.html` | Interfaz y botón de verificación |
| `frontend/nginx.conf` | Servidor web y proxy hacia el backend |
| `frontend/Dockerfile` | Imagen Docker de Nginx |
| `backend/server.js` | API HTTP de Node.js |
| `backend/Dockerfile` | Imagen Docker de Node.js |
| `docker-compose.yml` | Definición de los dos servicios |
| `Jenkinsfile` | Pipeline de integración continua de la semana 5 |
| `.gitignore` | Exclusión de archivos locales y temporales |

## 3. Requisitos

Para ejecutar manualmente la aplicación:
- Docker Engine o Docker Desktop con Docker Compose.
- Navegador web.

Para ejecutar el pipeline:
- Jenkins con complementos **Pipeline** y **Git**.
- Git disponible para el proceso que ejecuta Jenkins.
- Un **agente Windows con Windows PowerShell** y acceso operativo a Docker y Docker Compose.
- Java compatible con la versión de Jenkins instalada.

**Entorno en el que se verificó una ejecución exitosa:** Windows 10 Pro 22H2, Jenkins 2.591, JDK 25, Git 2.55.0.windows.5, Docker Engine/CLI 29.9.2 y Docker Compose v5.6.1. Jenkins estaba ejecutándose como servicio `LocalSystem`. Estos datos describen la prueba realizada; no implican compatibilidad universal con todas las instalaciones de Windows o Docker.

## 4. Ejecución manual (Docker)

Desde la raíz del repositorio:

```powershell
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://localhost:8080/api/estado
```

Abrir **http://localhost:8080** y pulsar **Verificar conexión**. Se espera el mensaje: `Conexión exitosa: el frontend se comunicó con el backend.`

Pruebas manuales adicionales sugeridas:
- Detener el backend: `docker compose stop backend`; la página puede abrir, pero la consulta a la API falla. Restaurar con `docker compose start backend`.
- Detener el frontend: `docker compose stop frontend`; la página deja de estar disponible. Restaurar con `docker compose start frontend`.

Para detener y retirar los contenedores de la ejecución manual:

```powershell
docker compose down
```

**Atención al puerto 8080:** si Jenkins utiliza `http://localhost:8080`, la aplicación manual no podrá publicar el mismo puerto al mismo tiempo. El pipeline evita este conflicto al ejecutar el frontend de prueba **sin publicar puertos**.

## 5. Configurar Jenkins (semana 5)

1. Acceder al panel de Jenkins.
2. Seleccionar **Nueva Tarea** y crear un proyecto de tipo **Pipeline**, por ejemplo `CI_MONITOR`.
3. En la configuración, sección **Pipeline**, seleccionar **Pipeline script from SCM**.
4. Completar:
   - **SCM:** `Git`
   - **Repository URL:** `https://github.com/MCG1987/CI-MONITOR.git`
   - **Credentials:** `- none -` (repositorio público)
   - **Branch Specifier:** `*/main`
   - **Script Path:** `Jenkinsfile`
5. Guardar y seleccionar **Construir ahora**.
6. Abrir la ejecución y consultar **Console Output** y la vista de etapas.

La configuración del trabajo de Jenkins se realiza en Jenkins; no está guardada en este repositorio. El pipeline usa `checkout scm` para obtener el código de la rama configurada.

## 6. Etapas del Jenkinsfile

| Etapa | Acción | Comprobación |
| --- | --- | --- |
| 1. Obtener código de GitHub | `checkout scm` | Descarga el código del repositorio |
| 2. Verificar Docker | Ejecuta `docker --version`, `docker compose version` y `docker info` | Herramientas y motor disponibles |
| 3. Construir imágenes | `docker compose -p ci-monitor-jenkins build` | Construcción de frontend y backend |
| 4. Iniciar contenedores | Inicia backend y frontend en la red Docker | Contenedores arrancados |
| 5. Probar comunicación | Consulta la página Nginx y `/api/estado` desde el contenedor frontend | La API responde con `estado = activo` |

El pipeline utiliza el nombre de proyecto Docker `ci-monitor-jenkins` para separar sus recursos de una ejecución manual. El frontend de prueba se inicia sin publicar el puerto 8080. La sección `post { always { ... } }` elimina los contenedores y la red de prueba al finalizar, incluso si una etapa falla. Por ello, **es normal que los contenedores del pipeline no permanezcan en Docker Desktop**.

## 7. Resultado real de la primera ejecución

**Estado: `SUCCESS` — las cinco etapas finalizaron correctamente.**

En la primera ejecución proporcionada por el equipo, Jenkins:
- Descargó el commit `f53233698d752bf5739243b4c9c50345d4d63b8b` de la rama `main`.
- Reconoció Git 2.55.0.windows.5, Docker 29.9.2 y Docker Compose v5.6.1.
- Construyó las imágenes de frontend (Nginx) y backend (Node.js).
- Creó e inició los contenedores necesarios.
- Comprobó correctamente la comunicación entre frontend y backend.
- Detuvo y retiró los recursos temporales al terminar.

Fragmento del registro de ejecución:

```text
Respuesta de la API: Conexión exitosa: el frontend se comunicó con el backend.
PRUEBA EXITOSA: los dos contenedores se comunican.
CI-MONITOR: compilacion y pruebas de comunicacion completadas.
Finished: SUCCESS
```

La consola también mostró mensajes `NativeCommandError` asociados a la salida de progreso de Docker en PowerShell y el aviso `Selected Git installation does not exist. Using Default`. **No impidieron la ejecución exitosa**: Git realizó el checkout, Docker construyó las imágenes y la prueba final pasó. Pueden revisarse para mejorar la claridad de los registros, sin confundirlos con fallos de esta ejecución.

**Alcance de la prueba:** se verificaron la construcción de imágenes, el inicio de contenedores y la comunicación HTTP entre ellos. No se afirma haber realizado pruebas unitarias, de carga, seguridad, despliegue en producción ni integración con otras plataformas de CI.

## 8. Evidencias para el informe académico

Se recomienda conservar localmente capturas de:
1. Panel principal de Jenkins con la versión instalada.
2. Configuración del Pipeline con URL del repositorio, rama y `Jenkinsfile`.
3. Visualización de las cinco etapas completadas.
4. Consola con `PRUEBA EXITOSA` y `Finished: SUCCESS`.

**Las capturas y la carpeta `evidencias` no se publican en este repositorio**, de acuerdo con la decisión del equipo. Deben incorporarse al documento académico correspondiente.

## 9. Estado y siguientes entregas

- **Semana 3:** arquitectura de dos contenedores y configuración de Docker Compose implementadas.
- **Semana 5:** `Jenkinsfile` publicado, trabajo Pipeline configurado y primera ejecución **verificada con resultado `SUCCESS`**.
- **Semanas 7 y 8:** pendientes las integraciones, pruebas adicionales y documentación que correspondan a las indicaciones del curso.

Este README describe el código publicado y los resultados observados en la consola real de Jenkins; no sustituye el informe académico ni las capturas de evidencia.
