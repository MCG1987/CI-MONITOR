# Contenedor 1: Nginx publica la página HTML.
FROM nginx:alpine

# Copiar la página y la configuración del proxy.
COPY index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
