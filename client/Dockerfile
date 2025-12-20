# =========================
# Giai đoạn 1: Node base
# =========================
# Môi trường build cho Vite/React: chỉ cài những thứ tối thiểu để biên dịch
FROM alpine:3.20@sha256:765942a4039992336de8dd5db680586e1a206607dd06170ff0a37267a9e01958 AS node-base
RUN apk add --no-cache nodejs npm git python3 g++ make && \
    npm install -g pnpm@9.12.2 && npm cache clean --force

# =========================
# Giai đoạn 2: Builder
# =========================
# Dùng cache mount cho pnpm để tăng tốc build lại; xóa source map; nén gzip sẵn
FROM node-base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-custom,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline
# Sao chép cấu hình & mã nguồn
COPY index.html ./
COPY vite.config.ts tsconfig.json tsconfig.node.json ./
COPY postcss.config.js tailwind.config.ts ./
COPY public ./public
COPY src ./src
# Build & tối ưu artefact tĩnh
RUN pnpm run build && \
    find /app/dist -name "*.map" -type f -delete || true && \
    find /app/dist -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.json' \) \
    -exec gzip -k -9 {} \;

# ======================================
# Giai đoạn 3: Nginx builder (tự biên dịch)
# ======================================
# Biên dịch nginx 1.27.3 với module tối thiểu cho SPA + nén tĩnh
FROM alpine:3.20@sha256:765942a4039992336de8dd5db680586e1a206607dd06170ff0a37267a9e01958 AS nginx-builder
RUN apk add --no-cache --virtual .build-deps gcc libc-dev make pcre2-dev zlib-dev openssl-dev linux-headers && \
    wget -O /tmp/nginx.tar.gz https://nginx.org/download/nginx-1.27.3.tar.gz && \
    tar -xzf /tmp/nginx.tar.gz -C /tmp && cd /tmp/nginx-1.27.3 && \
    ./configure \
      --prefix=/etc/nginx \
      --sbin-path=/usr/sbin/nginx \
      --modules-path=/usr/lib/nginx/modules \
      --conf-path=/etc/nginx/nginx.conf \
      --error-log-path=/var/log/nginx/error.log \
      --http-log-path=/var/log/nginx/access.log \
      --pid-path=/var/run/nginx.pid \
      --lock-path=/var/run/nginx.lock \
      --http-client-body-temp-path=/var/cache/nginx/client_temp \
      --http-proxy-temp-path=/var/cache/nginx/proxy_temp \
      --user=nginx --group=nginx \
      --with-http_ssl_module --with-http_v2_module \
      --with-http_gzip_static_module --with-http_stub_status_module \
      --with-threads --with-file-aio \
      --without-http_autoindex_module --without-http_browser_module \
      --without-http_geo_module --without-http_map_module \
      --without-http_memcached_module --without-http_userid_module \
      --without-mail_pop3_module --without-mail_imap_module \
      --without-mail_smtp_module --without-http_split_clients_module \
      --without-http_uwsgi_module --without-http_scgi_module \
      --without-http_grpc_module && \
    make -j$(nproc) && make install && strip /usr/sbin/nginx && \
    rm -rf /tmp/nginx* && apk del .build-deps

# ======================================
# Giai đoạn 4: Runtime base tối giản
# ======================================
# Chỉ giữ runtime deps; tạo user non-root; chuẩn bị thư mục và quyền
FROM alpine:3.20@sha256:765942a4039992336de8dd5db680586e1a206607dd06170ff0a37267a9e01958 AS custom-runtime-base
RUN apk add --no-cache pcre2 zlib openssl tzdata && \
    addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx && \
    mkdir -p /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html
COPY --from=nginx-builder /usr/sbin/nginx /usr/sbin/nginx
COPY --from=nginx-builder /etc/nginx /etc/nginx

# ======================================
# Giai đoạn 5: Runtime cuối
# ======================================
FROM custom-runtime-base AS runtime
LABEL org.opencontainers.image.title="SvnFrs-Dockerfile_Contest_2025" \
      org.opencontainers.image.description="SPA production trên Alpine với Nginx tự biên dịch, tối ưu và bảo mật" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.created="2025-10-28" \
      org.opencontainers.image.base.name="alpine:3.20"

# Ứng dụng tĩnh đã build
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Cấu hình Nginx tối thiểu (inline) bật gzip_static để phục vụ file .gz
RUN echo 'server { \
  listen 3000; server_name localhost; \
  root /usr/share/nginx/html; index index.html; \
  gzip_static on; gzip_vary on; \
  location / { try_files $uri $uri/ /index.html; expires 1y; add_header Cache-Control "public, immutable"; } \
  location = /index.html { expires -1; add_header Cache-Control "no-cache"; } \
  add_header X-Frame-Options "SAMEORIGIN" always; \
  add_header X-Content-Type-Options "nosniff" always; \
  add_header X-XSS-Protection "1; mode=block" always; \
}' > /etc/nginx/conf.d/default.conf && \
echo 'worker_processes auto; error_log /var/log/nginx/error.log warn; pid /var/run/nginx.pid; \
events { worker_connections 1024; } http { include /etc/nginx/mime.types; default_type application/octet-stream; sendfile on; keepalive_timeout 65; include /etc/nginx/conf.d/*.conf; }' > /etc/nginx/nginx.conf && \
echo 'types { \
  text/html html htm shtml; text/css css; text/javascript js; application/json json; \
  image/svg+xml svg svgz; image/x-icon ico; image/png png; image/jpeg jpeg jpg; \
  font/woff2 woff2; application/wasm wasm; \
}' > /etc/nginx/mime.types

# Thư mục tạm/ngầm của Nginx + phân quyền trước khi chuyển USER
RUN mkdir -p /var/cache/nginx/client_temp \
             /var/cache/nginx/proxy_temp \
             /etc/nginx/fastcgi_temp \
             /etc/nginx/proxy_temp \
             /etc/nginx/client_body_temp \
             /etc/nginx/uwsgi_temp \
             /etc/nginx/scgi_temp && \
    chown -R nginx:nginx /var/cache/nginx \
                         /var/log/nginx \
                         /usr/share/nginx/html \
                         /etc/nginx/fastcgi_temp \
                         /etc/nginx/proxy_temp \
                         /etc/nginx/client_body_temp \
                         /etc/nginx/uwsgi_temp \
                         /etc/nginx/scgi_temp && \
    chmod -R 755 /var/cache/nginx \
                 /etc/nginx/fastcgi_temp \
                 /etc/nginx/proxy_temp \
                 /etc/nginx/client_body_temp \
                 /etc/nginx/uwsgi_temp \
                 /etc/nginx/scgi_temp && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Healthcheck rẻ: HTTP 200 ở cổng 3000
RUN apk add --no-cache wget
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000
STOPSIGNAL SIGQUIT
USER nginx
CMD ["nginx", "-g", "daemon off;"]