# ruff: noqa: RUF001

import json
import os
from typing import Optional, TypedDict

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


def get_viva_payment_token() -> str | None:
    """Get Viva Payments token from environment variable."""
    token = None
    print(APP_ROOT)
    for path in [
        os.path.join(APP_ROOT, "vt.txt"),
    ]:
        if os.path.exists(path):
            with open(path) as f:
                token = f.read().strip()
            break
    return token


def get_viva_webhook_key() -> dict | None:
    """Get Viva Payments webhook secret from environment variable"""
    key = None
    print(APP_ROOT)
    for path in [
        os.path.join(APP_ROOT, "response_hook.json"),
    ]:
        if os.path.exists(path):
            key = json.load(open(path))
            break
    return key


async def create_viva_payment_order(user: User) -> str:
    """Create a new order."""
    # Here you would add logic to process the order
    orderCode = None
    token = get_viva_payment_token()
    payload = {
        "amount": 1000,  # amount in euros cents (1 euro = 100 cents)
        "customerTrns": "αγορά από Chainlit RAG για tokens αξίας 10 ευρώ",
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
                # fastapi exception handling - returns a json with the details
                # it is handled in the calling path operation function
                raise HTTPException(
                    status_code=400, detail="Failed to get the order code"
                )
        return orderCode

    raise HTTPException(status_code=500, detail="Viva Payments token not found")


async def get_viva_payment_transaction_status(transaction_id: str) -> Optional[dict]:
    """Get the status of an existing order."""
    token = get_viva_payment_token()
    if token:
        url = os.getenv(
            "VIVA_RETRIEVE_TRANSACTION_URL",
            "https://demo-api.vivapayments.com/checkout/v2/transactions",
        )
        transaction_url = f"{url}/{transaction_id}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    transaction_url,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {token}",
                    },
                )
                response.raise_for_status()
                res = response.json()
                return res
            except httpx.HTTPStatusError:
                # fastapi exception handling - returns a json with the details
                # it is handled in the calling path operation function
                raise HTTPException(status_code=409, detail="Transaction not found")
            except Exception:
                raise HTTPException(
                    status_code=500, detail="Error occured while retrieving transaction"
                )

    raise HTTPException(status_code=409, detail="Viva Payments token not found")
