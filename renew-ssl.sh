#!/bin/bash
# Add to crontab: 0 3 * * 1 /path/to/blugen/renew-ssl.sh
cd "$(dirname "$0")"
docker compose run --rm certbot renew --quiet
docker compose restart nginx
