# Contenedor 2: Node.js ejecuta la API sin dependencias externas.
FROM node:22-alpine

WORKDIR /app
COPY server.js .

EXPOSE 3000
CMD ["node", "server.js"]
