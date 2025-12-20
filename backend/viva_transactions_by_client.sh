#!/bin/bash
# bearer_token=$1
bearer_token=$(cat ./vt.txt)

curl -L -X POST 'https://demo-api.vivapayments.com/dataservices/v2/transactions/Search?PageSize=100&Page=1&OrderBy=Descending' \
-H 'Content-Type: application/json' \
-H "Authorization: Bearer $(echo -n $bearer_token)" \
--data '{"MerchantTrns": "facebook|10235286748223229"}'\



 