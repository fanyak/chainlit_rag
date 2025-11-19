import os
from typing import TypedDict

import httpx
from fastapi import HTTPException

from chainlit.config import APP_ROOT
from chainlit.user import User


class UserPaymentInfo(TypedDict):
    user_identifier: str
    transaction_id: str
    order_code: str  # big int in viva payments
    event_id: int
    eci: int


async def create_viva_payment_order(user: User):
    """Create a new order."""
    # Here you would add logic to process the order
    token = None
    orderCode = None
    payload = {
        "amount": 1234,
        "customerTrns": "string",
        "customer": {
            "email": "",
            "fullName": f"{user.identifier}",
            "phone": "",
            "countryCode": "GR",
            "requestLang": "gr-GR",
        },
        "dynamicDescriptor": "viva payments",
        "paymentTimeout": 1800,
        "currencyCode": 978,
        "preauth": False,
        "allowRecurring": False,
        "maxInstallments": 0,
        "forceMaxInstallments": False,
        "paymentNotification": False,
        "tipAmount": 0,
        "disableExactAmount": False,
        "disableCash": False,
        "disableWallet": False,
        "sourceCode": "Default",
    }
    # this is defaults to cwd
    # which is : C:\Users\fanyak\chainlit_rag\backend
    print(APP_ROOT)
    for path in [
        os.path.join(APP_ROOT, "vt.txt"),
    ]:
        if os.path.exists(path):
            with open(path) as f:
                token = f.read().strip()
            break
    if token:
        url = os.getenv(
            "VIVA_PAYMENTS_ORDER_URL",
            "https://demo-api.vivapayments.com/checkout/v2/orders",
        )

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                },
                json=payload,
            )
            response.raise_for_status()
            res = response.json()
            orderCode = res.get("orderCode")
            if not orderCode:
                raise HTTPException(
                    status_code=400, detail="Failed to get the order code"
                )
        return orderCode

    raise HTTPException(status_code=500, detail="Viva Payments token not found")
