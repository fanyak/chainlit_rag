# ruff: noqa: RUF001

import json
import os
import platform
import subprocess
from typing import Literal, Optional, TypedDict
from uuid import UUID

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field

from chainlit.config import APP_ROOT
from chainlit.user import PersistedUser, User

AmountType = Literal[500, 1000]
AmountTypePaid = Literal[5, 10]


class CreateOrderPayload(TypedDict):
    amount_cents: AmountType


class CreatePaymentResponse(TypedDict):
    id: UUID
    balance: float


class UserPaymentInfo(BaseModel, arbitrary_types_allowed=True):
    """Pydantic Model for user payment information"""

    user_id: str
    transaction_id: str
    order_code: str  # big int in viva payments
    event_id: int
    eci: int
    amount: AmountTypePaid
    created_at: str | None = None


class UserPaymentInfoDict(TypedDict):
    user_id: str
    transaction_id: str
    order_code: str
    event_id: int
    eci: int
    amount: AmountTypePaid
    created_at: Optional[str]


class UserPaymentInfoShell(TypedDict, total=False):
    user_id: str
    transaction_id: str
    order_code: str
    event_id: int
    eci: int
    amount: AmountTypePaid
    created_at: Optional[str]


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
    merchantTrns: str
    transactionTypeId: int


class VivaWebHookEventData(BaseModel):
    transaction_id: str = Field(alias="TransactionId")
    order_code: int = Field(alias="OrderCode")
    eci: int = Field(alias="ElectronicCommerceIndicator")
    amount: float = Field(alias="Amount")
    status_id: str = Field(alias="StatusId")
    user_identifier: str = Field(alias="MerchantTrns")


class VivaWebhookPayload(BaseModel):
    Url: str
    EventData: VivaWebHookEventData
    event_id: int = Field(alias="EventTypeId")
    created_at: str = Field(alias="Created")


class TransactionStatusTypedDict(TypedDict):
    # This says: status_id must be exactly "F" or "E"
    status_id: Literal["F", "E"]


def operating_system_bash_path() -> str:
    """Get the path to bash based on the operating system."""
    # 1. Determine the correct executable based on the OS
    if platform.system() == "Windows":
        # Force Git Bash on Windows to avoid the WSL issue
        BASH_EXE = r"C:\Program Files\Git\bin\bash.exe"
    else:
        # On Linux (Hetzner), 'bash' is standard and in the system PATH
        BASH_EXE = "bash"
    return BASH_EXE


def generate_viva_token() -> bool:
    """Validate that the token file exists and is readable."""
    # path = os.path.join(APP_ROOT, "viva_payments.sh")
    try:
        # If the script is executable (chmod +x script.sh)
        # subprocess.run(["./myscript.sh"])

        # If you need to invoke bash explicitly
        BASH_PATH = operating_system_bash_path()
        result = subprocess.run(
            [BASH_PATH, "./viva_payments.sh"],
            shell=False,
            cwd=APP_ROOT,
            env=os.environ,
        )
        print("Viva Payments token generation output!!!!:", result.stdout)
        if result.returncode != 0:
            print("Error generating Viva Payments token:", result.stderr)
            return False
        return True
    except Exception:
        return False


def extract_data_from_viva_webhook_payload(
    data: VivaWebhookPayload,
):
    """Extract relevant data from Viva Webhook payload."""
    obj = data.model_dump()
    eventData = obj.get("EventData", {})
    return {
        "user_id": eventData.get("user_identifier"),
        "transaction_id": eventData.get("transaction_id"),
        "order_code": str(eventData.get("order_code")),
        "event_id": obj.get("event_id"),
        "eci": eventData.get("eci"),
        "amount": int(eventData.get("amount", 0)),
        "created_at": obj.get("created_at"),
        "status_id": eventData.get("status_id"),
    }


def convert_viva_payment_hook_to_UserPaymentInfo_object(
    data, user: PersistedUser
) -> UserPaymentInfo:
    """Convert Viva Webhook payload to Pydantic UserPaymentInfo."""
    # pass the data from the webhook to the UserPaymentInfo Pydantic as keyword arguments
    return UserPaymentInfo(
        user_id=user.identifier,
        transaction_id=data["transaction_id"],
        order_code=str(data["order_code"]),
        event_id=data["event_id"],
        eci=data["eci"],
        amount=data["amount"],
        created_at=data["created_at"],
    )


def get_viva_payment_token() -> str | None:
    """Get Viva Payments token from environment variable."""
    token = None
    print(APP_ROOT)
    if generate_viva_token() is False:
        return token
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


async def create_viva_payment_order(user: User, amount_cents: AmountType) -> str:
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


async def get_viva_payment_transaction_status(
    transaction_id: str,
) -> TransactionStatusInfo:
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
        # NOTE: the httpx request returns error 404 if transaction not found
        # pass the error to the calling route function so that fastAPI can handle it
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
