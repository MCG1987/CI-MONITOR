# CI-Monitor — Entrega Semana 3

**Asignatura:** Énfasis Profesional I (Integración Continua)

Aplicación web mínima compuesta por **dos contenedores Docker comunicados entre sí**.

## Cómo funciona
1. El navegador carga la página del contenedor frontend (Nginx).
2. Al presionar **Verificar conexión**, solicita `/api/estado`.
3. Nginx reenvía la solicitud a `http://backend:3000/api/estado` por la red interna de Docker.
4. El backend Node.js responde con JSON y la página muestra el resultado.

## Requisitos
- Docker Desktop o Docker Engine con Docker Compose.
- Un navegador web.

## Ejecutar
En la carpeta raíz del repositorio:

```bash
docker compose up --build -d
```

Abrir **http://localhost:8080** y pulsar **Verificar conexión**.

Comprobar que los dos contenedores están activos:

```bash
docker compose ps
```

Comprobar la API mediante el frontend:

```bash
curl http://localhost:8080/api/estado
```

En PowerShell se puede usar `Invoke-RestMethod http://localhost:8080/api/estado`.

## Pruebas de fallos
**Prueba 1 — ambos encendidos:** `docker compose up -d`. La página y la consulta funcionan.

**Prueba 2 — backend apagado:**

```bash
docker compose stop backend
```
La página abre, pero al presionar el botón aparece un error. Restaurar con `docker compose start backend`.

**Prueba 3 — frontend apagado:**

```bash
docker compose stop frontend
```
La página deja de estar disponible en el navegador, aunque el backend sigue activo. Restaurar con `docker compose start frontend`.

Al finalizar:

```bash
docker compose up -d
```

## Estructura
- `frontend/index.html`: página con estilos y JavaScript comentado.
- `frontend/nginx.conf`: proxy para comunicarse con el backend.
- `frontend/Dockerfile`: imagen Nginx.
- `backend/server.js`: API mínima en Node.js, sin dependencias.
- `backend/Dockerfile`: imagen Node.js.
- `docker-compose.yml`: define los dos servicios y su red.
- `.gitignore`: excluye archivos temporales y privados.

**Evidencias:** por solicitud, las capturas y la carpeta `evidencias` no forman parte del repositorio. Se generan localmente para la entrega académica.

## Entregas posteriores
- **Semana 5:** añadir un pipeline con Jenkins.
- **Semana 7:** extender las pruebas y la integración según las herramientas disponibles y las indicaciones del tutor.

Este repositorio contiene el código, pero la ejecución real de Docker debe comprobarse en una máquina con Docker disponible.
