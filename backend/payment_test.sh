
#!/bin/bash
# Test script to send a payment request to the backend server


# curl -X POST "http://localhost:8000/payment" \
#   -H "Content-Type: application/json" \
#   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGlmaWVyIjoiZmFjZWJvb2t8MTAyMzUyODY3NDgyMjMyMjkiLCJkaXNwbGF5X25hbWUiOm51bGwsIm1ldGFkYXRhIjp7ImltYWdlIjoiaHR0cHM6Ly9wbGF0Zm9ybS1sb29rYXNpZGUuZmJzYnguY29tL3BsYXRmb3JtL3Byb2ZpbGVwaWMvP2FzaWQ9MTAyMzUyODY3NDgyMjMyMjkmaGVpZ2h0PTUwJndpZHRoPTUwJmV4dD0xNzY4NDAwMTQzJmhhc2g9QVQ4VGtKTTl5SEVmYklEcWhnaExiaXVpIiwicHJvdmlkZXIiOiJhdXRoMCJ9LCJiYWxhbmNlIjpudWxsLCJleHAiOjE3NjcxOTM3OTAsImlhdCI6MTc2NTg5Nzc5MH0.Q88X33XV7JnoRwgQnCXNzjkYprLrZdZuSlZZWksu5Qc" \
#   -d '{"transaction_id":"47134b39-40c1-43ca-a69c-47a15302414b","user_id":"facebook|10235286748223229","order_code":"2412864141472606","event_id":1796,"eci":5,"amount":1000}'

# curl -X POST "http://localhost:8000/payment" \
#   -H "Content-Type: application/json" \
#   -b "access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGlmaWVyIjoiZmFjZWJvb2t8MTAyMzUyODY3NDgyMjMyMjkiLCJkaXNwbGF5X25hbWUiOm51bGwsIm1ldGFkYXRhIjp7ImltYWdlIjoiaHR0cHM6Ly9wbGF0Zm9ybS1sb29rYXNpZGUuZmJzYnguY29tL3BsYXRmb3JtL3Byb2ZpbGVwaWMvP2FzaWQ9MTAyMzUyODY3NDgyMjMyMjkmaGVpZ2h0PTUwJndpZHRoPTUwJmV4dD0xNzY4NDAwMTQzJmhhc2g9QVQ4VGtKTTl5SEVmYklEcWhnaExiaXVpIiwicHJvdmlkZXIiOiJhdXRoMCJ9LCJiYWxhbmNlIjpudWxsLCJleHAiOjE3NjcxOTM3OTAsImlhdCI6MTc2NTg5Nzc5MH0.Q88X33XV7JnoRwgQnCXNzjkYprLrZdZuSlZZWksu5Qc" \
#   -d '{"transaction_id":"47134b39-40c1-43ca-a69c-47a15302414b","user_id":"facebook|10235286748223229","order_code":"2412864141472606","event_id":1796,"eci":5,"amount":1000}'

curl -X POST "https://shamefully-nonsudsing-edmond.ngrok-free.dev/payment/webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGlmaWVyIjoiZmFjZWJvb2t8MTAyMzUyODY3NDgyMjMyMjkiLCJkaXNwbGF5X25hbWUiOm51bGwsIm1ldGFkYXRhIjp7ImltYWdlIjoiaHR0cHM6Ly9wbGF0Zm9ybS1sb29rYXNpZGUuZmJzYnguY29tL3BsYXRmb3JtL3Byb2ZpbGVwaWMvP2FzaWQ9MTAyMzUyODY3NDgyMjMyMjkmaGVpZ2h0PTUwJndpZHRoPTUwJmV4dD0xNzY4NDAwMTQzJmhhc2g9QVQ4VGtKTTl5SEVmYklEcWhnaExiaXVpIiwicHJvdmlkZXIiOiJhdXRoMCJ9LCJiYWxhbmNlIjpudWxsLCJleHAiOjE3NjczNjUwODgsImlhdCI6MTc2NjA2OTA4OH0.CeAAnvFhRWUT1rWrjA-QA4PXnrYE3OVzuKadqvPYjeA" \
  -d '{"EventData": {"TransactionId":"ff2c3563-86ec-4dc3-847b-323b9a303003","OrderCode":5129462721272606,"StatusId":"F","ElectronicCommerceIndicator":5,"Amount":10.0, "MerchantTrns": "facebook|10235286748223229"}, "EventTypeId":1796, "Url":"a", "Created": ""}'\
  -o '/dev/null' -D -