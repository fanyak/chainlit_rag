#!/bin/bash

# export .env viariables to the process env
# set -a;
# source ./.env;
# set +a;

CREDS="$VIVA_MERCHANT_ID:$VIVA_API_KEY"
ENCODED=$(echo -n "$CREDS" | base64)
echo $CREDS

curl -L "$VIVA_GENERATE_WEBHOOK_KEY_URL" \
-H "Authorization: Basic $(echo -n $ENCODED)" \
--output response_hook.json