#!/bin/bash
# bearer_token=$1
bearer_token=$(cat ./vt.txt)

# curl -L -X POST 'https://demo-api.vivapayments.com/dataservices/v2/transactions/Search?PageSize=100&Page=1&OrderBy=Descending' \
# -H 'Content-Type: application/json' \
# -H "Authorization: Bearer $(echo -n $bearer_token)" \
# --data '{"MerchantTrns": "facebook|10235286748223229"}'\

#test transaction retrieval by ID for user facebook|10235286748223229
# 404: /order/success?t=2305c-e151-4086-b83f-387b5ec6b76c&s=1803017863372608&lang=el-GR&eventId=0&eci=1
# 200: /order/success?t=ff2c3563-86ec-4dc3-847b-323b9a303003&s=5129462721272606&lang=el-GR&eventId=0&eci=1  
curl -L "$VIVA_RETRIEVE_TRANSACTION_URL/ff2c3563-86ec-4dc3-847b-323b9a303003" \
-H "Authorization: Bearer $(echo -n $bearer_token)" \
-H 'Content-Type: application/json' \
-o /dev/null -D -


 