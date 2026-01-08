# ruff: noqa: RUF001
import asyncio
import json
import logging

# import pandas as pd
# import numpy as np
import os
from datetime import datetime
from typing import Dict, List, Optional

from langchain.chat_models import init_chat_model

# from langchain_community.cross_encoders import HuggingFaceCrossEncoder
# from langchain.retrievers.document_compressors import CrossEncoderReranker
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.multi_query import MultiQueryRetriever

# from langchain_community.llms import Cohere
from langchain_cohere import CohereRerank

# from langchain_core.prompts import ChatPromptTemplate # Added this line
from langchain_core.callbacks import UsageMetadataCallbackHandler
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.messages.ai import UsageMetadata
from langchain_core.output_parsers import BaseOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.rate_limiters import InMemoryRateLimiter
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

# from dotenv import load_dotenv
# load_dotenv()
# Gemma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from langchain_qdrant import FastEmbedSparse, QdrantVectorStore, RetrievalMode
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode
from qdrant_client import QdrantClient, models

import chainlit as cl
from chainlit import logger
from chainlit.data.sql_alchemy import SQLAlchemyDataLayer
from chainlit.data.storage_clients.gcs import GCSStorageClient
from chainlit.logger import db_logger
from chainlit.user import PersistedUser
from override_provider import override_providers
from user_token import db_object
from utils_b import amendment, parse_links_to_markdown

# Gemma

embeddings = HuggingFaceEmbeddings(
    model_name="google/embeddinggemma-300m",
    query_encode_kwargs={"prompt_name": "Retrieval-query"},
    encode_kwargs={"prompt_name": "Retrieval-document"},
)

rate_limiter = InMemoryRateLimiter(
    # <-- Super slow! We can only make a request once every 10 seconds!!
    requests_per_second=0.1,
    # Wake up every 100 ms to check whether allowed to make a request,
    check_every_n_seconds=0.1,
    # max_bucket_size=10,  # Controls the maximum burst size.
)

chat_model = init_chat_model(
    os.environ.get("MODEL_NAME", "gemini-2.5-flash"),
    model_provider="google_genai",
    temperature=0,
    rate_limiter=rate_limiter,
    model_kwargs={"stream_usage": True},
    thinking_budget=512,  # see cot in config.toml
    # max_tokens = 512, ################## limit tokens
    # response_mime_type = "application/json",
)

sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")

# Create a Qdrant client for local storage
# client = QdrantClient(":memory:")
qdrant_client = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_API_KEY"],
    # prefer_grpc=True,
)

COLLECTION_NAME = "aade_docs_faiss"  # gemma, not finetuned, dot
qdrant_compare = QdrantVectorStore(
    client=qdrant_client,
    collection_name=COLLECTION_NAME,
    embedding=embeddings,  # greek embedings'
    sparse_embedding=sparse_embeddings,
    # https://python.langchain.com/docs/integrations/vectorstores/qdrant/#hybrid-vector-search
    retrieval_mode=RetrievalMode.HYBRID,
    vector_name="dense",
    sparse_vector_name="sparse",
    distance=models.Distance.DOT,
)

# print(qdrant_compare.get_by_ids(['06ac1430-a1e5-4b84-bce7-de4dfe33af05']))

##### MULTI QUERY ######
current_date = datetime.now().strftime("%B,%Y")

# Output parser will split the LLM result into a list of queries


class LineListOutputParser(BaseOutputParser[List[str]]):
    """Output parser for a list of lines."""

    def parse(self, text: str) -> List[str]:
        lines = text.strip().split("\n")
        return list(filter(None, lines))  # Remove empty lines


output_parser = LineListOutputParser()

RETRIEVAL_PROMPT = PromptTemplate(
    input_variables=["question"],
    template="""You are a highly specialized AI assistant for Greek tax law,
    an expert in generating effective search queries for a vector database that contains legal documents.
    Your task is to generate five different versions in Greek of the given user question,
    in order to retrieve the most relevant and up-to-date documents from the vector database.
    By generating multiple perspectives on the user question, your goal is to help the user overcome some of the limitations
      of the distance-based similarity search."""
    """ Today's date is """
    + current_date
    + """ You must identify all relevant dates in the user's query and the provided context, including the current date.
    For a query about a specific effective period or expiration date, compare it against the current date."""
    """If the user divided the question into sub-queries, or If the user's question can be broken-down to two or more distinct sub-queries, you must generate three different versions in Greek for each of these sub-queries."""
    """ Otherwise, if the user asked one specific question and if the question cannot be broken-down to more than one sub-query, you must generate five different versions in Greek for the original query."""
    """ When you generate each alternative question you must take into consideration today's date so that the most recent information from the vector datatabase is retrieved."""
    """ You must provide these alternative questions separated by newlines.
    Original question: {question}""",
)
# print(RETRIEVAL_PROMPT.format(question="Ποιο είναι το όριο για αφορολόγητο με μερίσματα το 2024;"))

# Chain
retrieval_chain = RETRIEVAL_PROMPT | chat_model | output_parser

logging.basicConfig()
logging.getLogger("langchain.retrievers.multi_query").setLevel(logging.INFO)

### Build the Graph ####
graph_builder = StateGraph(MessagesState)


##### Chohere Reranker ##
# https://dashboard.cohere.com/api-keys
# https://docs.cohere.com/docs/rerank-overview#multilingual-reranking


@tool(response_format="content_and_artifact")
def retrieve(query: str):
    """Retrieve information related to a query."""
    compressor = CohereRerank(model="rerank-v3.5", top_n=10)
    retriever = MultiQueryRetriever(
        # retriever = qdrant_compare.as_retriever(search_type="mmr", k=15, fetch_k=20, lambda_mult=0.7),
        # retriever = vector_store.as_retriever(search_type="similarity", k=15)
        retriever=qdrant_compare.as_retriever(search_type="similarity", k=15),
        llm_chain=retrieval_chain,
        parser_key="lines",
    )  # "lines" is the key (attribute name) of the parsed output

    compression_retriever = ContextualCompressionRetriever(
        base_compressor=compressor, base_retriever=retriever
    )

    # Results
    # retrieved_docs = retriever.invoke(query)
    retrieved_docs = compression_retriever.invoke(query)

    serialized = "\n\n".join(
        [
            f"{doc.page_content}\nΠηγή: {doc.metadata['source']}\nΤροποποίηση: {amendment(doc.metadata)}"
            for doc in retrieved_docs
        ]
    )

    # return tuple(content, artifact)
    return serialized, retrieved_docs


# import google.genai
# from google.genai import types


# Step 1: Generate an AIMessage that may include a tool-call to be sent.
def query_or_respond(state: MessagesState):
    """
    Generate tool call for retrieval or respond.
    Force tool calling by using tool choice!!!!
    """
    llm_with_tools = chat_model.bind_tools([retrieve], tool_choice="retrieve")
    response = llm_with_tools.invoke(state["messages"])
    # MessagesState appends messages to state instead of overwriting
    return {"messages": [response]}


# Step 2: Execute the retrieval.
tools = ToolNode([retrieve])


# Step 3: Generate a response using the retrieved content.
def generate(state: MessagesState):
    """Generate answer."""
    # Get generated ToolMessages
    recent_tool_messages = []
    for message in reversed(state["messages"]):
        if message.type == "tool":
            recent_tool_messages.append(message)
        else:
            break
    tool_messages: list[ToolMessage] = recent_tool_messages[::-1]
    # Format into prompt
    docs_content = "\n\n".join(str(doc.content) for doc in tool_messages)
    system_message_content = (
        ## Persona and Core Task ###
        """You are a professional assistant for question-answering tasks regarding Greek tax laws.
        Your primary goal is to answer a user's question accurately and helpfully, based *only* on the provided context."""
        """Always interpret the question as it relates to Greek laws and government decisions. """
        ### Internal Reasoning Process (Do not include in final output) ###
        """ The process you should follow is this:
        1.  **Analyze Dates:** Identify all relevant dates in the user's query and the provided context, including the current date, which is  """
        + current_date
        + """.
        2.  **Temporal Logic Check:** For any law or provision with a specific effective period or expiration date, compare it against the current date.
            If a provision's effective period has explicitly expired (i.e., the current date is after the explicit end date), and there doesn't exist
             a newer law or provision, then use the most recent expired privsion. Otherwise, mark the expired law or provision as inactive.
        3.  **Synthesize:** Formulate the final answer by combining only the information from the context that is temporally valid and directly relevant to the user's question.
        """
        ### Constraints and Instructions for Final Output ###
        """ Adhere to these Contrains and Instructions:
        1.  **Strict Context Reliance:** Use *only* the provided context to formulate your response. Do not use any external or prior knowledge.
            If the context is insufficient to answer the question, state that the information is not available in the documents.
            If you need more information then ask the user for more information
            Do not hallucinate or make up an answer.
        2.  **Focus on Recency and Relevance:** Prioritize the most up-to-date information that is active as of the current date.
            If a law or state order has been amended or superseded, include only the most recent and currently active version.
        3.  **Required Information and Format:**
            * Provide a succinct and concise response, limited to a maximum of three hundrend Greek words.
            * For every fact or statement, cite the relevant law or state decision from the context.
            * When citing an article, also include the full title of the law or order.
        4.  **Language:** All responses must be in Greek.
        5.  **Citations:** At the end of your response, list all sources from the provided context that were used.
            For each source, you must include the specific page and file name. Always use the complete file name, including the extension and the folder path.
        """
        ### Context ###
        """
        Today's date is """ + current_date + """. The context is the following: """
        "\n\n"
        f"{docs_content}"
    )
    conversation_messages = [
        message
        for message in state["messages"]
        if message.type in ("human", "system")
        or (message.type == "ai" and not message.tool_calls)
    ]
    prompt = [SystemMessage(system_message_content)] + conversation_messages

    # Run
    response = chat_model.invoke(prompt)

    # TOKEN USAGE
    # print("\nUsage Metadata:")
    # print(response.usage_metadata)
    ############

    return {"messages": [response]}


graph_builder.add_node(query_or_respond)
graph_builder.add_node(tools)
graph_builder.add_node(generate)

graph_builder.set_entry_point("query_or_respond")
# graph_builder.add_conditional_edges(
#     "query_or_respond",
#     tools_condition,
#     {END: END, "tools": "tools"},
# )
graph_builder.add_edge("query_or_respond", "tools")
graph_builder.add_edge("tools", "generate")
graph_builder.add_edge("generate", END)


# @cl.on_chat_start
# async def on_chat_start():
#    return 'geia!'

# @cl.step(type="tool")
# async def tool():
#     # Fake tool
#     await cl.sleep(2)
#     return "για!"

memory = MemorySaver()
graph = graph_builder.compile(checkpointer=memory)

# REF: https://docs.chainlit.io/authentication/overview
# @cl.password_auth_callback
# def auth_callback(username: str, password: str):
#     # Fetch the user matching username from your database
#     # and compare the hashed password with the value stored in the database
#     if (username, password) == ("admin1", "admin1"):
#         return cl.User(
#             identifier="admin", metadata={"role": "admin", "provider": "credentials"}
#         )
#     else:
#         return None

override_providers()


async def handle_user_balance_in_session(balance):
    user_id = cl.user_session.get("user_id")
    if balance is None:
        print(f"Error retrieving balance for user {user_id}.")
        await cl.Message(
            content=f"Error retrieving balance for user {user_id}. Token tracking disabled.",
            author="System",
        ).send()
        # flag to disable token tracking in main()
        cl.user_session.set("error_db", True)
    # in any case set the balance (might be None)
    else:
        pass
    cl.user_session.set("balance", balance)


async def print_insufficient_balance_message():
    user_id = cl.user_session.get("user_id")
    balance = cl.user_session.get("balance")
    balance = max(balance, 0)
    print(f"User {user_id} has insufficient balance: {balance}.")
    elements = [
        # type: ignore
        cl.Text(
            name="",
            content="[συνδρομή εδώ](/order)",
            display="inline",
        )
    ]
    await cl.Message(
        content=f"Το υπόλοιπο σας είναι {balance:.2f}€. Παρακαλώ ανανεώστε τον λογαριασμό σας για να συνεχίσετε να χρησιμοποιείτε την υπηρεσία.",
        elements=elements,
        author="System",
    ).send()


# Data Layer for token usage tracking
db_object = db_object.setup__db()
# Use absolute path to ensure we're using the correct database file
db_file = os.path.join(os.path.dirname(__file__), "token_usage.db")
# Or use: db_file = "C:/Users/fanyak/chainlit_rag/backend/chainlit/token_usage.db"

conninfo = f"sqlite+aiosqlite:///{db_file}"

# Google Cloud Storage configuration
# Requires service account with Storage Object Admin role
# Set these in your .env file:
# GCS_PROJECT_ID=your-project-id
# GCS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
# GCS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
storage_provider = GCSStorageClient(
    bucket_name="aade_chat_elements",
    project_id=os.environ.get("GCS_PROJECT_ID"),
    client_email=os.environ.get("GCS_CLIENT_EMAIL"),
    private_key=os.environ.get("GCS_PRIVATE_KEY"),
)

# Create a single instance to reuse
_data_layer_instance = SQLAlchemyDataLayer(
    conninfo=conninfo, storage_provider=storage_provider, show_logger=True
)


@cl.data_layer  # type: ignore
def get_data_layer():
    return _data_layer_instance


############ #######################################


@cl.oauth_callback  # type: ignore
def oauth_callback(
    provider_id: str,
    token: str,
    raw_user_data: Dict[str, str],
    default_user: cl.User,  # type: ignore[name-defined]
) -> Optional[cl.User]:  # type: ignore[name-defined]
    print(raw_user_data)
    return default_user


# Each cl.user_session is unique to a user AND a given chat session!!!
@cl.on_chat_resume  # type: ignore[attr-defined]
@cl.on_chat_start  # type: ignore[has-type]
async def on_chat_start():
    # 1. Get the authenticated user and their ID
    """
    If the chainlit jwt for the user_session_timeout (which defaults to 15 days), is not expired,
    the frontend sends this token to the backend
     -> the OAuth callback is not called again: !!!
        The backend validates the token internally.
        If the token is valid, the user is immediately authenticated,
        and the chat lifecycle proceeds directly to @cl.on_chat_start.
    If the token is expired or invalid, the user is redirected to the login page and the Oauth is called.
    """
    user = cl.user_session.get("user")
    user_id = user.identifier
    cl.user_session.set("user_id", user_id)

    event = asyncio.Event()
    cl.user_session.set("stop_event", event)
    # SQLITE ALLOWS MULTIPLE CONNECTIONS FROM THE SAME THREAD
    # BUT WRITE OPERATIONS ARE SERIALIZED
    # https://www.sqlite.org/isolation.html

    # 1. Initialize db_object for user_id
    # each user gets their own instance of the db_object class
    # db_object: user_token.db_object = user_token.db_object(user_id)
    # store the db_object instance in the user session
    # cl.user_session.set("db_object", db_object)

    # user session id 4be5ba5c-e25e-46fa-9121-05f9611d80f2
    # print(cl.user_session.get("id"))

    # 2. Setup db connection for the user session
    # if db_object.check_db_connection() is False:
    #     conn = db_object.setup_user_db_connection()
    #     if conn is None:
    #         print("Failed to connect to the database.")
    #         await cl.Message(
    #             content="Failed to connect to the database. Token tracking disabled.",
    #             author="System",
    #         ).send()
    #         # flag to disable token tracking in main()
    #         cl.user_session.set("error_db", True)
    #         return
    # # 3. Check if user exists in the database, if not create a new user with initial balance = 0
    # user_exists = db_object.check_user_exists()
    # if user_exists is not True:
    #     if user_exists is None:
    #         print(f"Error checking if user {user_id} exists in the database.")
    #         await cl.Message(
    #             content=f"Error checking if user {user_id} exists in the database. Token tracking disabled.",
    #             author="System",
    #         ).send()
    #         # flag to disable token tracking in main()
    #         cl.user_session.set("error_db", True)
    #         return
    #     # if user_exists is False, then create new user
    #     if db_object.create_user_balance():
    #         print(f"Created new user {user_id} in the database.")
    #     else:
    #         print(f"Error creating user {user_id} in the database.")
    #         await cl.Message(
    #             content=f"Error creating user {user_id} in the database. Token tracking disabled.",
    #             author="System",
    #         ).send()
    #         # flag to disable token tracking in main()
    #         cl.user_session.set("error_db", True)
    #         return
    # # either user existed or was created successfully
    # 4. now get the balance
    balance = None
    persistedUser: PersistedUser = await get_data_layer().get_user(identifier=user_id)
    if persistedUser is None:
        print(f"Error retrieving persisted user {user_id} from the database.")
        await cl.Message(
            content=f"Error retrieving persisted user {user_id} from the database. Token tracking disabled.",
            author="System",
        ).send()
        # flag to disable token tracking in main()
        cl.user_session.set("error_db", True)
        return
    else:
        print(persistedUser)
        balance = persistedUser.balance
    # handle balance result
    await handle_user_balance_in_session(balance)
    if balance is None:
        return  # error already handled in handle_user_balance_in_session
    if balance <= 0:
        await print_insufficient_balance_message()
        return
    # # 5. Create a new chat id in the database
    # new_chat_id = db_object.create_new_token_usage()
    # if new_chat_id is not True:
    #     print(f"Error creating new chat for user {user_id} in the database.")
    #     await cl.Message(
    #         content=f"Error creating new chat for user {user_id} in the database. Token tracking disabled.",
    #         author="System",
    #     ).send()
    #     # flag to disable token tracking in main()
    #     cl.user_session.set("error_db", True)
    #     return
    # 6. Display initial usage
    print(
        f"User {user_id} has started or resumed a chat. Displaying initial token usage."
    )
    # usage = db_object.get_all_chats_tokens()
    # usage = (0, 0, 0)  # dummy usage
    elements = [
        # type: ignore
        cl.Text(
            name="",
            content="[δείτε το ιστορικό κατανάλωσης tokens και χρεώσεων εδώ](/account)",
            display="inline",
        )
    ]
    usage_msg = (
        f"Welcome, {user_id}! Το υπόλοιπο σας είναι: **{balance:.2f}€**."
        # f"Total tokens used so far: **{usage[2]}** (Prompt: {usage[0]}, Completion: {usage[1]})"
        # if usage
        # else f"Database error retrieving usage for user {user_id}! Token tracking disabled."
    )
    await cl.Message(content=usage_msg, elements=elements, author="System").send()
    # db_object.close_connection()


@cl.on_message  # type: ignore
async def main(message: cl.Message):  # type: ignore[name-defined]
    """
    This function is called every time a user inputs a message in the UI.
    Args:
        message: The user's message.
    Returns:
        None.
    """
    # 1. check for db error flag
    if cl.user_session.get("error_db", False) is True:  # type: ignore
        await cl.Message(  # type: ignore
            content="Token tracking was previously disabled due to previous database error.",
            author="System",
        ).send()
        cl.user_session.set("error_db", False)
        return

    # 2. check user balance
    balance = cl.user_session.get("balance")  # type: ignore[attr-defined]
    if balance <= 0:
        await print_insufficient_balance_message()
        return
    # Specify an ID for the thread
    # config = {"configurable": {"thread_id":cl.context.session.id}}
    # config = {"configurable": {"thread_id":str(uuid.uuid4())}}

    # Create a NEW callback for each turn only
    cb = UsageMetadataCallbackHandler()

    # fmt: off
    print(f"Thread ID: {cl.context.session.thread_id}") # type: ignore[attr-defined]
    config: RunnableConfig = {
        "configurable": {            
            "thread_id": cl.context.session.thread_id # type: ignore[attr-defined]
        },
        "callbacks": [cb],
    }
    # prepare for streaming response
    final_answer = cl.Message(content="")  # type: ignore
    usage_metadata: Optional[UsageMetadata] = None

    # initial greeting to message user that search is in progress
    progress = cl.Message(  # type: ignore
        content="Ψάχνω στα έγγραφα της ΑΑΔΕ...", author="AI")
    # await asyncio.sleep(1)  # allow greeting message to render
    await progress.send()
    async def runner(event):
        buffer = ""
        for msg, metadata in graph.stream(
            {"messages": [HumanMessage(content=message.content)]}, # type: ignore[arg-type]
            stream_mode="messages",
            config=config
        ):
            if event.is_set():
                print("Event is set, stopping the waiter.")
                event.clear()
                break
            if (msg.content and isinstance(msg, ToolMessage)):  # type: ignore[union-attr]
                progress.content ="Συγκεντρώνω τις πληροφορίες..."  # type: ignore
                await progress.update()
            if (
                msg.content  # type: ignore[union-attr]
                and not isinstance(msg, HumanMessage)
                and metadata["langgraph_node"] == "generate"  # type: ignore[index]
            ):
                # fmt: off
                await progress.remove()
                # Note: python name binding: assignments create a new local variable by default. 
                buffer += msg.content  # type: ignore[union-attr]
                await final_answer.stream_token(msg.content) # type: ignore[union-attr]
        return buffer 
    try:
        task = asyncio.create_task(runner(
            cl.user_session.get("stop_event"))# type: ignore
            )
        buffer = await task
    except Exception as e:
        print(f"user cancelled: {e}")
        buffer = ""
    finally:
        await final_answer.send()

    # fmt: off
    parsed_content = parse_links_to_markdown(buffer)
    if parsed_content:
        elements = [
            cl.Text(name=f"{cl.context.session.thread_id}", content=parsed_content, display="inline")  # type: ignore
        ]
        await cl.Message( # type: ignore
            content="Δείτε τα έγγραφα που χρησιμοποιήθηκαν για την απάντηση:",
            elements=elements
        ).send()

    print(f"USAGE {cb.usage_metadata}")

    #### Side effects after the response has been sent ####
    user = cl.user_session.get("user")  # type: ignore[attr-defined]
    user_id = user.identifier
    # fmt: off
    #db_object: user_token.db_object = cl.user_session.get("db_object") # type: ignore[attr-defined]
    usage_metadata = cb.usage_metadata[os.environ.get(
        "MODEL_NAME", "gemini-2.5-flash")]
    if usage_metadata is None:
        logger.warning("No usage metadata from callback")
        return # Can't proceed without usage data

    total_tokens = usage_metadata["total_tokens"]
    input_tokens = usage_metadata["input_tokens"]
    output_tokens = usage_metadata["output_tokens"]

    turn_token_data = {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens
    }

    # After streaming completes update with turn metadata
    final_answer.metadata = turn_token_data
    await final_answer.update()
    try:
        # Explicitly persist to database (update() uses create_task which doesn't wait)
        await get_data_layer().update_step(final_answer.to_dict()) 
    except Exception as e:
        db_logger.error(f"Error persisting step metadata: {e}")
        # Non-critical - continue with billing
    try:   
        thread = await get_data_layer().get_thread(thread_id=cl.context.session.thread_id)  # type: ignore[attr-defined]   
    except Exception as e:
        db_logger.error(f"Error getting thread: {e}")
        cl.user_session.set("error_db", True)
        return
    if thread is None:
        db_logger.error(f"Thread {cl.context.session.thread_id} not found")  # type: ignore[attr-defined]
        cl.user_session.set("error_db", True)
        return

    # print(f"thread: {thread}")
    units = 1000000  # tokens per million
    charge_per_input_token: float = float(os.environ.get("CHARGE_PER_INPUT_TOKEN", 0.30/units))
    charge_per_output_token: float = float(os.environ.get("CHARGE_PER_OUTPUT_TOKEN", 2.5/units))
    balance_to_deduct = charge_per_input_token * input_tokens + charge_per_output_token * output_tokens

    # Get existing totals (or 0 if first turn)
    existing_metadata = json.loads(thread.get("metadata") or "{}")

    # Accumulate
    thread_token_data = {
    "input_tokens": existing_metadata.get("input_tokens", 0) + input_tokens,
    "output_tokens": existing_metadata.get("output_tokens", 0) + output_tokens,
    "total_tokens": existing_metadata.get("total_tokens", 0) + total_tokens
    }

    # Update thread FIRST, check result
    try:
        await get_data_layer().update_thread(thread_id=cl.context.session.thread_id, metadata=thread_token_data)  # type: ignore[attr-defined]
    except Exception as e:
        db_logger.error(f"Error updating thread: {e}")
        print("Error updating thread metadata")
        cl.user_session.set("error_db", True)
        return  # Don't charge user if we can't log the tokens

    try:
        updated_user: PersistedUser = await get_data_layer().update_user_balance(identifier=user_id, balance_to_deduct=balance_to_deduct)  # type: ignore[attr-defined]
    except Exception as e:
        db_logger.error(f"Error updating user balance: {e}")
        cl.user_session.set("error_db", True)
        return

    if updated_user is None or updated_user.balance is None:
        print(f"Error updating user balance for {user_id}")
        cl.user_session.set("error_db", True)
        return

    new_balance: Optional[float] = updated_user.balance
    cl.user_session.set("balance", new_balance)
    print(f"Updated balance for user {user_id}: {new_balance}")

    if new_balance <= 0:
        await print_insufficient_balance_message()


# Close the database connection when the session ends
@cl.on_stop  # type: ignore[has-type]
def on_stop():
    print("The user wants to stop the task!")
    stop_event = cl.user_session.get("stop_event")
    if stop_event:
        stop_event.set()


@cl.on_chat_end  # type: ignore[has-type]
def on_chat_end():
    print("Chat ended!!!!!!!!!!!!!!!!!!!!")
    # db_object: user_token.db_object = cl.user_session.get("db_object")  # type: ignore[attr-defined]
    # db_object.close_connection()
    # cl.user_session.set("db_object", None)  # clear the db_object instance from the user session
    print(f"Closed DB connection for user {cl.user_session.get('user_id')}")


# @cl.set_starters
# async def set_starters():
#     return [
#         cl.Starter(
#             label="Morning routine ideation",
#             message="Can you help me create a personalized morning routine that would help increase my productivity throughout the day? Start by asking me about my current habits and what activities energize me in the morning.",
#             icon="/public/idea.svg",
#         ),

#         cl.Starter(
#             label="Explain superconductors",
#             message="Explain superconductors like I'm five years old.",
#             icon="/public/learn.svg",
#         ),
#         cl.Starter(
#             label="Python script for daily email reports",
#             message="Write a script to automate sending daily email reports in Python, and walk me through how I would set it up.",
#             icon="/public/terminal.svg",
#             command="code",
#         ),
#         cl.Starter(
#             label="Text inviting friend to wedding",
#             message="Write a text asking a friend to be my plus-one at a wedding next month. I want to keep it super short and casual, and offer an out.",
#             icon="/public/write.svg",
#         )
#     ]

# from chainlit.data import get_data_layer
# @cl.data_layer
# def data_layer():
#     print("Setting data layer...", get_data_layer())
#     return get_data_layer()
