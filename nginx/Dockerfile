FROM nginx:1.26

RUN apt-get update && \
    apt-get install -y --no-install-recommends certbot openssl bash && \
    rm -rf /var/lib/apt/lists/*

COPY hosthaven.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

VOLUME ["/etc/letsencrypt", "/var/lib/letsencrypt", "/var/log/letsencrypt", "/var/www/certbot"]

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
