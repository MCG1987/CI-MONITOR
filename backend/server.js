// Contenedor 2: API mínima con Node.js, sin instalar paquetes.
const http = require('node:http');

const PORT = 3000;

const servidor = http.createServer((solicitud, respuesta) => {
  // La página web consulta esta dirección para comprobar la comunicación.
  if (solicitud.method === 'GET' && solicitud.url === '/api/estado') {
    respuesta.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    respuesta.end(JSON.stringify({
      estado: 'activo',
      mensaje: 'Conexión exitosa: el frontend se comunicó con el backend.'
    }));
    return;
  }

  // Toda ruta distinta devuelve un error 404.
  respuesta.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  respuesta.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

// 0.0.0.0 permite que otros contenedores lo consulten.
servidor.listen(PORT, '0.0.0.0', () => {
  console.log(`API disponible en el puerto ${PORT}`);
});
