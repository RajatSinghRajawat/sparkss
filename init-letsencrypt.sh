#!/bin/bash
# First-time SSL setup. Run ONCE on the server:  sudo ./init-letsencrypt.sh
# Prereq: DNS A records for both domains point to this server; ports 80/443 open.
#   STAGING=1 ./init-letsencrypt.sh   -> test run (no Let's Encrypt rate limits)
#   EMAIL=you@example.com ./init-letsencrypt.sh
set -e

DOMAINS=(api.sparks-learning.com admin.sparks-learning.com)
EMAIL="${EMAIL:-santoshkumar.s@cetl.in}"
STAGING="${STAGING:-0}"
DATA=./certbot

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

mkdir -p "$DATA/conf" "$DATA/www"

# 1) Dummy certs so nginx can start with the 443 server blocks
for d in "${DOMAINS[@]}"; do
  if [ -e "$DATA/conf/live/$d/fullchain.pem" ] && [ ! -e "$DATA/conf/live/$d/.dummy" ]; then
    echo "### Real certificate for $d already exists, skipping."
    continue
  fi
  echo "### Creating dummy certificate for $d ..."
  mkdir -p "$DATA/conf/live/$d"
  $DC run --rm --entrypoint "\
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout /etc/letsencrypt/live/$d/privkey.pem \
      -out /etc/letsencrypt/live/$d/fullchain.pem \
      -subj /CN=localhost" certbot
  touch "$DATA/conf/live/$d/.dummy"
done

# 2) Build + start the whole stack
echo "### Building and starting containers ..."
$DC up -d --build

# 3) Replace dummy certs with real Let's Encrypt certs
staging_arg=""
[ "$STAGING" != "0" ] && staging_arg="--staging"

for d in "${DOMAINS[@]}"; do
  [ -e "$DATA/conf/live/$d/.dummy" ] || continue
  echo "### Requesting Let's Encrypt certificate for $d ..."
  rm -rf "$DATA/conf/live/$d" "$DATA/conf/archive/$d" "$DATA/conf/renewal/$d.conf"
  $DC run --rm --entrypoint "\
    certbot certonly --webroot -w /var/www/certbot $staging_arg \
      --email $EMAIL --agree-tos --no-eff-email --non-interactive \
      -d $d" certbot
done

echo "### Reloading nginx ..."
$DC exec nginx nginx -s reload
echo "### Done:  https://${DOMAINS[0]}   https://${DOMAINS[1]}"
