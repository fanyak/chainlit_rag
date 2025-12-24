import json
import os
from typing import Optional

import pytest
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from chainlit.data.sql_alchemy import SQLAlchemyDataLayer
from chainlit.logger import payment_logger
from chainlit.order import (
    UserPaymentInfo,
    VivaTransactionCreatedWebhookPayload,
    convert_viva_payment_hook_to_UserPaymentInfo_object,
    extract_data_from_viva_webhook_payload,
    get_viva_webhook_key,
)
from chainlit.server import is_allowed_payment
from chainlit.user import PersistedUser, User

app = FastAPI()


async def data_layer():
    db_file = os.path.join(os.path.dirname(__file__), "test_payment_db.sqlite")

    conninfo = f"sqlite+aiosqlite:///{db_file}"

    # Create async engine
    engine = create_async_engine(conninfo)

    # Execute initialization statements
    # Ref: https://docs.chainlit.io/data-persistence/custom#sql-alchemy-data-layer
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                    CREATE TABLE IF NOT EXISTS users (
                        "id" UUID PRIMARY KEY,
                        "identifier" TEXT NOT NULL UNIQUE,
                        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        "balance" REAL DEFAULT 0.0,
                        "metadata" JSONB NOT NULL
                    );
                """
            )
        )
        await conn.execute(
            text(
                """
                    CREATE TABLE IF NOT EXISTS payments(
                        "id" UUID PRIMARY KEY,
                        "user_id" TEXT NOT NULL,
                        "transaction_id" UUID UNIQUE NOT NULL,
                        "order_code" TEXT NOT NULL,
                        "event_id" INT NOT NULL,
                        "eci" INT NOT NULL,
                        "amount" INT NOT NULL,
                        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY ("user_id") REFERENCES users("identifier") ON DELETE NO ACTION
                    )
                """
            )
        )

    # Create SQLAlchemyDataLayer instance
    data_layer_instance = SQLAlchemyDataLayer(conninfo)
    data_layer_instance.engine = engine
    return data_layer_instance


@pytest.fixture
async def get_data_layer():
    db_instance = await data_layer()
    yield db_instance
    # Cleanup: close the engine and remove the database file
    if hasattr(db_instance, "engine"):
        await db_instance.engine.dispose()
    db_file = os.path.join(os.path.dirname(__file__), "test_payment_db.sqlite")
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass  # File may be locked, but we tried


@app.get("/payment/webhook")
def payment_webhook():
    return get_viva_webhook_key()


@app.post("/payment/webhook")
async def process_payment_webhook(
    payload: VivaTransactionCreatedWebhookPayload, data_layer=Depends(data_layer)
):
    eventData = extract_data_from_viva_webhook_payload(payload)
    if eventData.get("status_id") != "F":
        payment_logger.info(
            f"""Ignoring webhook with non-finalized status id {eventData.get("status_id")}
            for user {eventData.get("user_id")}
            and transaction {eventData.get("transaction_id")}
            and order code {eventData.get("order_code")}"""
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK, content={"message": "status not finalized"}
        )
    try:
        # 2nd point of failure is here:
        # if we have an assertion here, and it bubbles up
        # then fastapi will return a 500 error to the client
        user: Optional[PersistedUser] = await data_layer.get_user(
            identifier=eventData.get("user_id")
        )
        # 3rd  of failure are here:
        # The user doesn't exist in the database
        if not user:
            payment_logger.info(
                f"""Ignoring webhook with no user found for identifier {eventData.get("user_id")}
                for transaction {eventData.get("transaction_id")}
                and order code {eventData.get("order_code")}
                with status id {eventData.get("status_id")}"""
            )
            return JSONResponse(
                status_code=status.HTTP_200_OK, content={"message": "user not found"}
            )

        payment: UserPaymentInfo = convert_viva_payment_hook_to_UserPaymentInfo_object(
            eventData,
            user,
        )
        # payment_payload = payment.model_dump()

        #  Idempotency Check (Fast check for duplicate entries before API call)
        # is_allowed_payment checks if we already processed this ID
        # 3rd point of failure is here:
        # if there is a system error checking existing payment,
        # then an http exception 500 is raised
        if not await is_allowed_payment(data_layer, payment):
            payment_logger.info(
                f"Duplicate webhook received for {payment.transaction_id}, ignoring."
            )
            return JSONResponse(
                status_code=status.HTTP_200_OK, content={"message": "Already processed"}
            )

        # Verify transaction status again before creating payment record
        # because webhooks can be spoofed by malicious users

        # Note: In FastAPI, if you are inside a utility function,
        # (i.e get_viva_payment_transaction_status)
        # that you are calling inside of your path operation function,
        # and you raise the fastapi HTTPException from inside of that utility function,
        # it won't run the rest of the code in the path operation function,
        # it will terminate that request right away and send an HTTP error response
        # with the detail to the client!!!!!

        # 5th point of failure is here:
        # if the transaction doesn't exist, Viva Payments API returns HTTP 404 - item not found!
        # if the Viva Payments API cannot be reached, it returns HTTP 500!
        # if there is other system error reaching Viva Payments API, it returns HTTP 500!

        # MOCK REQUEST TO VIVA PAYMENTS API FOR VERIFYING TRANSACTION STATUS
        # transaction_status: TransactionStatusInfo = (
        #     await get_viva_payment_transaction_status(payment.transaction_id)
        # )
        if payment.transaction_id == "nonexistent-transaction-id":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )
        transaction_status = dict(
            {
                "statusId": "F",
                "orderCode": data[0]["OrderCode"],
                "merchantTrns": data[0]["MerchantTrns"],
                "amount": data[0]["Amount"],
            }
        )

        print(f"Transaction status: {transaction_status}")
        if (
            transaction_status
            and transaction_status.get("statusId") == "F"
            and str(transaction_status.get("orderCode")) == payment.order_code
            and transaction_status.get("merchantTrns") == payment.user_id
            and int(transaction_status.get("amount")) == payment.amount
        ):
            print("Creating new payment record in database from webhook")
            # 5th point of failure is here:
            # if there is a system error creating the payment, assertions are raised
            # then an http exception 500 is raised
            await data_layer.create_payment(payment)
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content={"message": "transaction recorded"},
            )

        else:  # false webhook -> ignore and don't send again
            payment_logger.info(
                f"""ignoring data received: webhook doesn't match a transaction
                for user {eventData.get("user_id")} 
                and transaction {eventData.get("transaction_id")}
                and order code {eventData.get("order_code")}
                and amount {payment.amount}
                with status id {eventData.get("status_id")}"""
            )
            return JSONResponse(
                status_code=status.HTTP_200_OK, content={"message": "Data mismatch"}
            )

    except HTTPException as e:
        # errors reaching the transaction from Viva Payments API: Error 404, 422, 500
        payment_logger.error(
            f"Viva API or system error for transaction id {payload.EventData.transaction_id}: {e.detail}"
        )
        raise e

    except Exception as e:
        payment_logger.info(
            f"""unexpected database error processing webhook for transaction
                {payload.EventData.transaction_id}: {e}"""
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal Server Error",
        )


client = TestClient(app)

data = json.load(open("./tests/test_payment_db.json"))


def test_get_viva_payment_webhook():
    """Test retrieving Viva payment token."""
    response = client.get("/payment/webhook")
    assert response.status_code == 200
    token = response.json()
    assert token.get("Key") is not None


def test_viva_payment_webhook_with_invalid_payload():
    """Test the process of the Viva payment token."""
    # send invalid payload -> 422 Unprocessable Entity
    response = client.post("/payment/webhook", json=data[0])
    assert response.status_code == 422


def test_viva_payment_webhook_payload_valid_not_finished():
    """Test the process of the Viva payment token."""
    # send valid payload -> 201 Created
    d = data[0]
    obj = {
        "EventData": {
            "TransactionId": d["TransactionId"],
            "OrderCode": d["OrderCode"],
            "Amount": d["Amount"],
            "MerchantTrns": d["MerchantTrns"],
            "StatusId": "E",  # d["StatusId"],
            "ElectronicCommerceIndicator": d["ElectronicCommerceIndicator"],
        },
        "EventTypeId": d["EventTypeId"],
        "Url": d["Url"],
        "Created": "any-date-string",
    }

    response = client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # ignoring webhook with not finished status E -> 200 OK
    assert response.status_code == 200


def test_viva_payment_webhook_payload_valid_no_user():
    """Test the process of the Viva payment token."""
    # send valid payload -> 201 Created
    d = data[0]
    obj = {
        "EventData": {
            "TransactionId": d["TransactionId"],
            "OrderCode": d["OrderCode"],
            "Amount": d["Amount"],
            "MerchantTrns": d["MerchantTrns"],
            "StatusId": d["StatusId"],
            "ElectronicCommerceIndicator": d["ElectronicCommerceIndicator"],
        },
        "EventTypeId": d["EventTypeId"],
        "Url": d["Url"],
        "Created": "any-date-string",
    }

    response = client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # ignoring webhook with no user found -> 200 OK
    assert response.status_code == 200


async def test_viva_payment_webhook_payload_valid_with_user(get_data_layer):
    """Test the process of the Viva payment token."""
    # send valid payload -> 201 Created
    d = data[0]
    obj = {
        "EventData": {
            "TransactionId": d["TransactionId"],
            "OrderCode": d["OrderCode"],
            "Amount": d["Amount"],
            "MerchantTrns": d["MerchantTrns"],
            "StatusId": d["StatusId"],
            "ElectronicCommerceIndicator": d["ElectronicCommerceIndicator"],
        },
        "EventTypeId": d["EventTypeId"],
        "Url": d["Url"],
        "Created": "any-date-string",
    }

    await get_data_layer.create_user(
        User(
            identifier=d["MerchantTrns"],
            metadata={},
        )
    )
    response = client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # valid webhook with user -> 201 Created
    assert response.status_code == 201
    user = await get_data_layer.get_user(identifier=d["MerchantTrns"])
    assert user is not None
    assert user.balance == d["Amount"]


async def test_viva_payment_webhook_payload_valid_duplicate(get_data_layer):
    """Test the process of the Viva payment token."""
    # send valid payload -> 201 Created
    d = data[0]
    obj = {
        "EventData": {
            "TransactionId": d["TransactionId"],
            "OrderCode": d["OrderCode"],
            "Amount": d["Amount"],
            "MerchantTrns": d["MerchantTrns"],
            "StatusId": d["StatusId"],
            "ElectronicCommerceIndicator": d["ElectronicCommerceIndicator"],
        },
        "EventTypeId": d["EventTypeId"],
        "Url": d["Url"],
        "Created": "any-date-string",
    }

    response = client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # ingore duplicate webhook with user -> 200 OK
    assert response.status_code == 200


async def test_viva_payment_webhook_payload_valid_mismatched_transaction_order_payment(
    get_data_layer,
):
    """Test the process of the Viva payment token."""
    d = data[0]
    obj = {
        "EventData": {
            # true/existing transaction ID
            "TransactionId": d["TransactionId"],
            "OrderCode": 13345,  # d["OrderCode"],
            "Amount": d["Amount"],
            "MerchantTrns": d["MerchantTrns"],
            "StatusId": d["StatusId"],
            "ElectronicCommerceIndicator": d["ElectronicCommerceIndicator"],
        },
        "EventTypeId": d["EventTypeId"],
        "Url": d["Url"],
        "Created": "any-date-string",
    }

    response = client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # ignore mismatched data webhook with user -> 200 OK
    assert response.status_code == 200


async def test_viva_payment_webhook_payload_valid_nonexistent_transaction_id(
    get_data_layer,
):
    """Test the process of the Viva payment token."""
    d = data[2]
    obj = {
        "EventData": {
            # d["TransactionId"],
            "TransactionId": "nonexistent-transaction-id",
            "OrderCode": d["OrderCode"],
            "Amount": d["Amount"],
            "MerchantTrns": d["MerchantTrns"],
            "StatusId": d["StatusId"],
            "ElectronicCommerceIndicator": d["ElectronicCommerceIndicator"],
        },
        "EventTypeId": d["EventTypeId"],
        "Url": d["Url"],
        "Created": "any-date-string",
    }

    response = client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # item not found error for nonexistent transaction ID -> 404 Not Found
    assert response.status_code == 404
