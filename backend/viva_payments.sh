#!/bin/bash

# GITHUB: instead of `source .env`` file, we pass the env variables as arguments
# source .env
# Environment variables are passed from GitHub Actions workflow
# VIVA_SMART_CHECKOUT_CLIENT_ID and VIVA_SMART_CHECKOUT_CLIENT_SECRET

# Example cURL command to get an access token from Viva Payments
# echo "viva_api_key: $VIVA_SMART_CHECKOUT_CLIENT_SECRET"
# echo "viva_merchant_id: $VIVA_SMART_CHECKOUT_CLIENT_ID"
#base64_credentials=$(echo -n "$VIVA_SMART_CHECKOUT_CLIENT_ID:$VIVA_SMART_CHECKOUT_CLIENT_SECRET" | base64)

# REF: https://developer.viva.com/smart-checkout/smart-checkout-integration/
# REF: https://developer.viva.com/integration-reference/oauth2-authentication/

# get the environment variables
#printenv

# check if existing vt.txt file exists
if [ -f "./vt.txt" ]; then
  DATE_LAST_MODIFIED=$(stat -c %Y ./vt.txt)
  CURRENT_DATE=$(date +%s)
  ELAPSED_TIME=$((CURRENT_DATE - DATE_LAST_MODIFIED))
  echo "Elapsed time since vt.txt modified: $ELAPSED_TIME seconds"
  if [ $ELAPSED_TIME -lt 3500 ]; then 
    echo "vt.txt is less than ~58 minutes old. Skipping token generation."
    exit 0
  else
    echo "vt.txt is older than ~58 minutes. Generating new token."
  fi
fi

# Step 1. Get access token using client base64 encoded credentials grant for smart checkout

CREDS="$VIVA_SMART_CHECKOUT_CLIENT_ID:$VIVA_SMART_CHECKOUT_CLIENT_SECRET"
# echo -n "Base64 encoding credentials...$CREDS"

# the quotes around $CREDS are important
# ensure that it is treated as a single string
# because of the colon : - it would be split otherwise
ENCODED=$(echo -n "$CREDS" | base64)

curl -L -X POST "$VIVA_GENERATE_ORDER_TOKEN_URL" \
--header "Authorization: Basic  $(echo -n $ENCODED)" \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=client_credentials' \
--output response.json

# save access token to docker container env file

grep -o '"access_token":"[^"]*"' response.json | sed 's/"access_token":"\([^"]*\)"/\1/' > vt.txt
chmod 600 ./vt.txt # Only owner can read/write
rm -f response.json
echo "Viva Payments access token saved to vt.txt"