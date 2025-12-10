# ruff: noqa: RUF001

import json
import os
import subprocess
from typing import Optional, TypedDict

import httpx
from fastapi import HTTPException

from chainlit.config import APP_ROOT
from chainlit.user import PersistedUser, User


class UserPaymentInfo(TypedDict):
    user_identifier: str
    transaction_id: str
    order_code: str  # big int in viva payments
    event_id: int
    eci: int
    amount: int
    created: Optional[str]


class TransactionStatusInfo(TypedDict):
    email: str
    amount: float
    orderCode: int
    statusId: str
    fullName: str
    insDate: str
    cardNumber: str
    currencyCode: str
    cardTypeId: int


class WebHookEventData(TypedDict):
    TransactionId: str
    OrderCode: str
    ElectronicCommerceIndicator: int
    Amount: int


class VivaWebhookPayload(TypedDict):
    url: str
    EventData: WebHookEventData
    EventTypeId: int
    Created: str


def generate_viva_token() -> bool:
    """Validate that the token file exists and is readable."""
    # path = os.path.join(APP_ROOT, "viva_payments.sh")
    try:
        # If the script is executable (chmod +x script.sh)
        # subprocess.run(["./myscript.sh"])

        # If you need to invoke bash explicitly
        result = subprocess.run(
            ["bash", "./viva_payments.sh"], capture_output=True, text=True, cwd=APP_ROOT
        )
        if result.returncode != 0:
            print("Error generating Viva Payments token:", result.stderr)
            return False
        return True
    except Exception:
        return False


def convert_hook_to_UserPaymentInfo(
    data: VivaWebhookPayload, persisted_user: PersistedUser
) -> UserPaymentInfo:
    return UserPaymentInfo(
        user_identifier=persisted_user.identifier,
        transaction_id=data["EventData"]["TransactionId"],
        order_code=str(data["EventData"]["OrderCode"]),
        event_id=data["EventTypeId"],
        eci=data["EventData"]["ElectronicCommerceIndicator"],
        amount=data["EventData"]["Amount"],
        created=data["Created"],
    )


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


async def create_viva_payment_order(user: User, amount_cents: int) -> str:
    """Create a new order."""
    # Here you would add logic to process the order
    orderCode = None
    token = get_viva_payment_token()
    payload = {
        # FOR FAILURE: 99.06 euros in cents (1 euro = 100 cents)
        # "amount": 9906,
        "amount": amount_cents,  # amount in cents (1 euro = 100 cents)
        "customerTrns": f"αγορά από Chainlit RAG για tokens αξίας {amount_cents / 100} ευρώ από τον χρήστη {user.identifier}",
        "customer": {
            "email": "",
            "fullName": "",
            "phone": "",
            "countryCode": "GR",
            "requestLang": "el-GR",
        },
        "dynamicDescriptor": "viva payment",
        "paymentTimeout": 1800,
        "currencyCode": 978,
        "preauth": False,
        "allowRecurring": False,
        "maxInstallments": 0,
        "forceMaxInstallments": False,
        "paymentNotification": False,
        "tipAmount": 0,
        "disableExactAmount": False,
        "disableCash": True,
        "disableWallet": False,
        "sourceCode": "Default",
        "merchantTrns": f"{user.identifier}",
    }
    # this is defaults to cwd
    # which is : C:\Users\fanyak\chainlit_rag\backend

    if token:
        try:
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
            # The HTTPStatusError class is raised by response.raise_for_status()
            # on responses which are not a 2xx success code.
            # These exceptions include both a .request and a .response attribute.
            response.raise_for_status()
            res = response.json()
            orderCode = res.get("orderCode")
            if not orderCode:
                # use fastapi exception handling - returns an HTTP error response with the details
                # it is handled in the calling path operation function
                raise HTTPException(
                    status_code=400, detail="Failed to get the order code"
                )
            return orderCode
        except httpx.HTTPStatusError:
            # use fastapi exception handling - returns an HTTP error response with the details
            # it is handled in the calling path operation function
            raise HTTPException(status_code=400, detail="Failed to create order")
        except httpx.RequestError:
            raise HTTPException(
                status_code=500, detail="Failed to reach Viva Payments API"
            )
        except HTTPException as e:
            raise e
        except Exception:
            raise HTTPException(
                status_code=500, detail="Error occured while retrieving transaction"
            )
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
        try:
            async with httpx.AsyncClient() as client:
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
            # use fastapi exception handling - returns an HTTP error response with the details
            # it is handled in the calling path operation function
            raise HTTPException(status_code=409, detail="Transaction not found")
        except httpx.RequestError:
            raise HTTPException(
                status_code=500, detail="Failed to reach Viva Payments API"
            )
        except Exception:
            raise HTTPException(
                status_code=500, detail="Error occured while retrieving transaction"
            )
    raise HTTPException(status_code=500, detail="Viva Payments token not found")
