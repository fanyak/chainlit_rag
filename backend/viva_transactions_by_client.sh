#!/bin/bash
# bearer_token=$1
bearer_token=$(cat ./vt.txt)

# curl -L -X POST 'https://demo-api.vivapayments.com/dataservices/v2/transactions/Search?PageSize=100&Page=1&OrderBy=Descending' \
# -H 'Content-Type: application/json' \
# -H "Authorization: Bearer $(echo -n $bearer_token)" \
# --data '{"MerchantTrns": "facebook|10235286748223229"}'\

curl -L  "$VIVA_RETRIEVE_TRANSACTION_URL/2a89d4d8-5f02-4dd3-813f-f2539effc49" \
-H "Authorization: Bearer $(echo -n $bearer_token)" \
-H 'Content-Type: application/json' \
-o /dev/null -D -


 