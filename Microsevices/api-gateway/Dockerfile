FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY api-gateway-nginx.conf /etc/nginx/conf.d/api-gateway.conf
EXPOSE 80