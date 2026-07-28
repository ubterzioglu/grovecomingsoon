FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Grove Software — coming soon" \
      org.opencontainers.image.url="https://grovesoftware.tech/" \
      org.opencontainers.image.source="https://github.com/ubterzioglu/grovecomingsoon"

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/site.conf

COPY index.html styles.css canopy.js /usr/share/nginx/html/
COPY assets/grove-logo.png assets/icon-32.png assets/icon-180.png \
     assets/icon-512.png  assets/og-image.png /usr/share/nginx/html/assets/

RUN nginx -t

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
