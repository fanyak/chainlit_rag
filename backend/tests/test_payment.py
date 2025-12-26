"""
Payment tests module.

NOTE: Async test functions do not require @pytest.mark.asyncio decorator
because pyproject.toml has `asyncio_mode = "auto"` configured. This enables
pytest-asyncio to automatically detect and run async test functions.
Sinse the aysncio_mode is set to "auto", pytest-asyncio will handle both
synchronous and asynchronous test functions appropriately without needing
the explicit decorator.
We make all test functions async to keep consistency and use the async client
"""

import json
import os
from typing import Optional

import httpx
import pytest
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import JSONResponse

# from fastapi.testclient import TestClient
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

# data = json.load(open("./tests/test_payment_db.json"))
with open("./tests/test_payment_db.json") as f:
    data = json.load(f)


def get_data(index=0) -> dict:
    d = data[index]
    return {
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


@pytest.fixture(scope="module")
async def get_data_layer():
    """Created once when the first test that needs it runs.
    All test functions in the module will each receive the same datalayer instance.
    Since get_data_layer is module-scoped, database changes persist.
    Destroyed after all tests in the module have completed.
    """
    db_instance = await data_layer()
    yield db_instance
    # Cleanup: close the engine and remove the database file
    if hasattr(db_instance, "engine"):
        await db_instance.engine.dispose()
    db_file = os.path.join(os.path.dirname(__file__), "test_payment_db.sqlite")
    payment_logger.info(f"Removing test database file at: {db_file}")
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass  # File may be locked, but we tried


@pytest.fixture(scope="module")
async def add_user_to_db(get_data_layer):
    """Also created once for the entire module
    Depends on get_data_layer, so that fixture runs first
    The same user is reused across all tests that request it
    """
    identifier = data[0]["MerchantTrns"]
    await get_data_layer.create_user(
        User(
            identifier=identifier,
            metadata={},
        )
    )
    return await get_data_layer.get_user(identifier=identifier)


@pytest.fixture
async def client(scope="module"):
    """Also created once for the entire module
    Yields an async httpx.AsyncClient instance
    """
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    #  Test client for FastAPI app.
    # return TestClient(app)


def get_viva_payment_transaction_status(transaction_id: str):
    """Utility function that MOCKS the RESPONSE FROM VIVA PAYMENTS API
    In real implementation, this function would make an HTTP request to Viva Payments API
    to retrieve the transaction status.
    """
    for d in data:
        if d["TransactionId"] == transaction_id:
            return {
                "statusId": d["StatusId"],
                "orderCode": d["OrderCode"],
                "merchantTrns": d["MerchantTrns"],
                "amount": d["Amount"],
            }
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Transaction not found",
    )


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
        transaction_status = get_viva_payment_transaction_status(payment.transaction_id)

        # if payment.transaction_id == "nonexistent-transaction-id":
        #     raise HTTPException(
        #         status_code=status.HTTP_404_NOT_FOUND,
        #         detail="Transaction not found",
        #     )
        # transaction_status = dict(
        #     {
        #         "statusId": "F",
        #         "orderCode": data[0]["OrderCode"],
        #         "merchantTrns": data[0]["MerchantTrns"],
        #         "amount": data[0]["Amount"],
        #     }
        # )

        print(f"Transaction status: {transaction_status}")
        if (
            transaction_status
            and transaction_status.get("statusId") == "F"
            and str(transaction_status.get("orderCode")) == payment.order_code
            and transaction_status.get("merchantTrns") == payment.user_id
            and transaction_status.get("amount") == payment.amount
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


async def test_get_viva_payment_webhook(client):
    """Test retrieving Viva payment token."""
    #      ├─ [FIRST use of client]
    # │   │   └─ [creates client]
    response = await client.get("/payment/webhook")
    assert response.status_code == 200
    token = response.json()
    assert token.get("Key") is not None


async def test_viva_payment_webhook_with_invalid_payload(client):
    """Send invalid (not parsed) payload -> 422 Unprocessable Entity."""
    #  └─ [reuses client]
    response = await client.post("/payment/webhook", json=data[0])
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


async def test_viva_payment_webhook_payload_valid_not_finished(client):
    """Send valid payload but with not finished status (E) -> 200 OK."""
    obj = get_data()
    obj["EventData"]["StatusId"] = "E"
    #  └─ [reuses client]
    response = await client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # ignoring webhook with not finished status E -> 200 OK
    assert response.status_code == status.HTTP_200_OK


async def test_viva_payment_webhook_payload_valid_no_user(client):
    """Send valid payload but with no user found -> 200 OK."""
    obj = get_data()
    #  └─ [reuses client]
    response = await client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # ignoring webhook with no user found -> 200 OK
    assert response.status_code == status.HTTP_200_OK


async def test_viva_payment_webhook_payload_valid_nonexistent_transaction_id(
    client, add_user_to_db
):
    """Send valid payload but with nonexistent transaction ID -> 404 Not Found."""
    obj = get_data(2)
    obj["EventData"]["TransactionId"] = "nonexistent-transaction-id"
    #      ├─ [FIRST use of add_user_to_db]
    # │   │   ├─ [FIRST use of get_data_layer → creates DB, tables]
    # │   │   └─ [creates user in DB]
    user = add_user_to_db
    identifier = obj["EventData"]["MerchantTrns"]
    assert identifier == user.identifier
    #  └─ [reuses client]
    response = await client.post("/payment/webhook", json=obj)
    # item not found error for nonexistent transaction ID -> 404 Not Found
    assert response.status_code == status.HTTP_404_NOT_FOUND


async def test_viva_payment_webhook_payload_valid_with_user(
    client, get_data_layer, add_user_to_db
):
    """Send valid payload with user -> 201 Created."""
    # send valid payload -> 201 Created
    obj = get_data()
    #   ├─ [reuses same get_data_layer instance]
    #   ├─ [reuses same add_user_to_db result]
    user = add_user_to_db  # this is stale user before payment
    #  └─ [reuses client]
    response = await client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # valid webhook with user -> 201 Created
    assert response.status_code == status.HTTP_201_CREATED
    # get the updated user from the database
    user = await get_data_layer.get_user(identifier=user.identifier)
    assert user is not None
    assert user.balance == obj["EventData"]["Amount"]


async def test_viva_payment_webhook_payload_valid_duplicate(
    client, get_data_layer, add_user_to_db
):
    """Send valid duplicate payload with user -> 200 OK."""
    obj = get_data()
    #   ├─ [reuses same get_data_layer instance]
    #   ├─ [reuses same add_user_to_db result]
    user = add_user_to_db  # stale user (not from database but from fixture)
    #  └─ [reuses client]
    response = await client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # ingore duplicate webhook with user -> 200 OK
    identifier = obj["EventData"]["MerchantTrns"]
    assert identifier == user.identifier
    assert response.status_code == status.HTTP_200_OK
    existing_transaction = await get_data_layer.get_payment_by_transaction(
        transaction_id=obj["EventData"]["TransactionId"],
        order_code=obj["EventData"]["OrderCode"],
        user_id=identifier,
    )
    assert existing_transaction is not None
    assert len(existing_transaction.keys()) > 0


async def test_viva_payment_webhook_payload_valid_mismatched_transaction_order_payment(
    client, get_data_layer, add_user_to_db
):
    """Send valid payload with mismatched order code -> 200 OK."""
    obj = get_data()
    obj["EventData"]["OrderCode"] = 13345  # mismatched order code
    #   ├─ [reuses same get_data_layer instance]
    #   ├─ [reuses same add_user_to_db result]
    user = add_user_to_db  # stale user (not from database but from fixture)
    identifier = obj["EventData"]["MerchantTrns"]
    assert identifier == user.identifier
    #  └─ [reuses client]
    response = await client.post("/payment/webhook", json=obj)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    # ignore mismatched data webhook with user -> 200 OK
    assert response.status_code == status.HTTP_200_OK
    existing_transaction = await get_data_layer.get_payment_by_transaction(
        transaction_id=obj["EventData"]["TransactionId"],
        order_code=get_data(0)["EventData"]["OrderCode"],
        user_id=identifier,
    )
    assert existing_transaction is not None
    assert len(existing_transaction.keys()) > 0


async def test_user_balance_after_payments(client, get_data_layer, add_user_to_db):
    """Test that user balance is updated correctly after multiple payments."""
    #   ├─ [reuses same get_data_layer instance]
    #   ├─ [reuses same add_user_to_db result]
    # get the updated user from the database (don't use stale user from fixture)
    user = await get_data_layer.get_user(identifier=add_user_to_db.identifier)
    assert user is not None
    assert user.identifier == get_data(0)["EventData"]["MerchantTrns"]
    # After processing the valid payment webhook, the user's balance should equal
    # the amount of the first payment
    assert user.balance == get_data(0)["EventData"]["Amount"]
    #  └─ [reuses client]
    response = await client.post("/payment/webhook", json=get_data(2))
    assert response.status_code == status.HTTP_201_CREATED
    # get the updated user from the database again!
    user = await get_data_layer.get_user(identifier=add_user_to_db.identifier)
    assert user.balance == data[0]["Amount"] + data[2]["Amount"]
