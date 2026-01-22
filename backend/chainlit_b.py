# ruff: noqa: RUF001
import asyncio
import json
import logging

# import pandas as pd
# import numpy as np
import os

# sqlite3 imports
# REF: https://reference.langchain.com/python/langgraph/checkpoints/#langgraph.checkpoint.sqlite.SqliteSaver
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

# REF: https://docs.langchain.com/oss/python/langgraph/agentic-rag
# LangChain imports
from langchain.chat_models import init_chat_model

# from langchain_community.cross_encoders import HuggingFaceCrossEncoder
# from langchain.retrievers.document_compressors import CrossEncoderReranker
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.multi_query import MultiQueryRetriever

# from langchain_community.llms import Cohere
from langchain_cohere import CohereRerank

# from langchain_core.prompts import ChatPromptTemplate # Added this line
from langchain_core.callbacks import UsageMetadataCallbackHandler
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
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

# from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode
from qdrant_client import QdrantClient, models

import chainlit as cl
from chainlit import logger
from chainlit.data.sql_alchemy import SQLAlchemyDataLayer
from chainlit.data.storage_clients.gcs import GCSStorageClient
from chainlit.logger import db_logger
from chainlit.user import PersistedUser
from keyword_mapping import keyword_mappings

# custom modules
from override_provider import override_providers
from user_token import db_object
from utils_b import AnswerWithCitations, amendment, parse_links_to_markdown

# Load glossary for selective injection
GLOSSARY_PATH = os.path.join(os.path.dirname(__file__), "glossary.json")
with open(GLOSSARY_PATH, encoding="utf-8") as f:
    glossary = json.load(f)


def get_relevant_glossary_terms(query: str) -> str:
    """
    Find glossary terms relevant to the user's query.
    Returns formatted definitions for injection into context.
    """
    query_lower = query.lower()
    relevant_terms = []

    # Find matching terms based on keywords
    matched_terms = set()
    for keyword, terms in keyword_mappings.items():
        if keyword in query_lower:
            matched_terms.update(terms)

    # Build the glossary context
    if matched_terms:
        for item in glossary:
            if item["term"] in matched_terms:
                entry = f"**{item['term']}**: {item['definition']}"
                if "distinction" in item:
                    entry += f" ΔΙΑΚΡΙΣΗ: {item['distinction']}"
                relevant_terms.append(entry)

    if relevant_terms:
        return (
            "\n\n### ΓΛΩΣΣΑΡΙΟ ΟΡΩΝ ###\n"
            + "\n\n".join(relevant_terms)
            + "\n### ΤΕΛΟΣ ΓΛΩΣΣΑΡΙΟΥ ###\n"
        )
    return ""


# Gemma

embeddings = HuggingFaceEmbeddings(
    model_name="google/embeddinggemma-300m",
    query_encode_kwargs={"prompt_name": "Retrieval-query"},
    encode_kwargs={"prompt_name": "Retrieval-document"},
)

rate_limiter = InMemoryRateLimiter(
    # <-- Super slow! We can only make a request once every 10 seconds!!
    # requests_per_second=0.1,
    requests_per_second=5,
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

qdrant_client = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_API_KEY"],
    # prefer_grpc=True,
)

COLLECTION_NAME = "aade_docs_faiss"
qdrant_vs = QdrantVectorStore(
    client=qdrant_client,
    collection_name=COLLECTION_NAME,
    embedding=embeddings,
    sparse_embedding=sparse_embeddings,
    # https://python.langchain.com/docs/integrations/vectorstores/qdrant/#hybrid-vector-search
    retrieval_mode=RetrievalMode.HYBRID,
    vector_name="dense",
    sparse_vector_name="sparse",
    distance=models.Distance.DOT,
)

##### MULTI QUERY ######
current_date = datetime.now().strftime("%B,%Y")

# Output parser will split the LLM result into a list of queries


class LineListOutputParser(BaseOutputParser[List[str]]):
    """Output parser for a list of lines."""

    def parse(self, text: str) -> List[str]:
        lines = text.strip().split("\n")
        print(f"Parsed lines from output parser.\n {lines}")
        return list(filter(None, lines))  # Remove empty lines


output_parser = LineListOutputParser()

RETRIEVAL_PROMPT = PromptTemplate(
    input_variables=["question"],
    template="""You are a highly specialized Greek AI assistant for Greek tax law,
    an expert in generating effective search queries for a vector database that contains legal documents.
    Your task is to generate five different versions *in Greek* of the given user question,
    in order to retrieve the most relevant and up-to-date documents from the vector database.
    By generating multiple perspectives on the user question, your goal is to help the user overcome some of the limitations
      of the distance-based similarity search."""
    """ Today's date is """
    + current_date
    + """ You must identify all relevant dates in the user's query and the provided context, including the current date.
    For a query about a specific effective period or expiration date, compare it against the current date."""
    """If there are multiple distinct queries in the question or if the user's question can be broken-down to two or more distinct sub-queries, you must generate three different versions in Greek for each of these sub-queries."""
    """ Otherwise, if the user asked one specific question and if the question cannot be broken-down to more than one sub-query, you must generate five different versions in Greek for the original query."""
    """ When you generate each alternative question you must take into consideration today's date so that the most recent information from the vector datatabase is retrieved."""
    """ You *must provide these alternative questions separated by newlines*.
    Original question: {question}""",
)
# print(RETRIEVAL_PROMPT.format(question="Ποιο είναι το όριο για αφορολόγητο με μερίσματα το 2024;"))

# Chain
retrieval_chain = RETRIEVAL_PROMPT | chat_model | output_parser

logging.basicConfig()
logging.getLogger("langchain.retrievers.multi_query").setLevel(logging.INFO)

### Build the Graph ####
graph_builder = StateGraph(MessagesState)


@tool(response_format="content_and_artifact")
def retrieve(query: str):
    """Retrieve information related to a query."""
    # Chohere Reranker
    # https://dashboard.cohere.com/api-keys
    # https://docs.cohere.com/docs/rerank-overview#multilingual-reranking
    compressor = CohereRerank(model="rerank-v3.5", top_n=10)
    retriever = MultiQueryRetriever(
        # retriever = qdrant_vs.as_retriever(search_type="mmr", k=15, fetch_k=20, lambda_mult=0.7),
        # retriever = vector_store.as_retriever(search_type="similarity", k=15)
        retriever=qdrant_vs.as_retriever(search_type="similarity", k=25),
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


# *Step 1*: Generate an AIMessage that may include a tool-call to be sent.
def query_or_respond(state: MessagesState):
    """
    Generate tool call for retrieval or respond.
    We force tool calling by using tool_choice="retrieve"!!!!
    """
    # The LLM generates an AIMessage with tool_calls metadata,
    # but does not execute the tool here!! !

    # we’re giving the model access to the retriever_tool via .bind_tools
    llm_with_tools = chat_model.bind_tools([retrieve], tool_choice="retrieve")

    # create an AI message with a tool call!
    response = llm_with_tools.invoke(state["messages"])

    # MessagesState appends messages to state instead of overwriting!
    return {"messages": [response]}


# *Step 2*: Actually execute the retrieval tool!.
# Takes the AIMessage with tool_calls from step 1 as input
# Runs the retrieve() function with the extracted arguments
# Returns a ToolMessage with the results
tools = ToolNode([retrieve])


# *Step 3*: Generate a response using the retrieved content.
def generate(state: MessagesState):
    """Generate answer."""
    # Get generated ToolMessages
    recent_tool_messages = []
    for message in reversed(state["messages"]):
        if message.type == "tool":
            recent_tool_messages.append(message)
        else:
            break
    # organize chronologically
    tool_messages: list[ToolMessage] = recent_tool_messages[::-1]
    # Format into prompt
    docs_content = "\n\n".join(str(doc.content) for doc in tool_messages)

    # Get the latest user question for glossary lookup
    user_question = ""
    for message in reversed(state["messages"]):
        if message.type == "human":
            user_question = message.content
            break

    # Selective glossary injection based on query
    glossary_context = get_relevant_glossary_terms(user_question)

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
            * When citing an article, you must also include the full title of the law or order.
        4.  **Language:** All responses must be in Greek.
        5. **Multiple Queries Handling:** If the user has asked multiple distinct questions, provide your answer in a numbered list for each topic.
        6.  **Citations:** At the end of your response, list all sources from the provided context that were used.
            For each source, you must include the specific page and file name. Always use the complete file name, including the extension and the directory path.
        """
        ### Critical Legal Distinctions ###
        """IMPORTANT: Pay careful attention to the legal terminology used in the query and to specific legal distinctions.
        For example:
        - "Ατομική επιχείρηση" (sole proprietorship): A business owned and operated by ONE natural person without separate legal entity. The owner is personally liable.
        - "Προσωπική εταιρία" (personal company/partnership): A company with TWO OR MORE partners (e.g., Ο.Ε., Ε.Ε.). It has a separate legal identity from its partners.
        These are DIFFERENT legal forms with DIFFERENT tax obligations. Never confuse or interchange such terms.
        """
        ### Context ###
        """
        Today's date is """
        + current_date
        + """. """
        + glossary_context
        + """The retrieved documents are the following: """
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
    response: AnswerWithCitations = chat_model.with_structured_output(
        AnswerWithCitations
    ).invoke(prompt)

    # TOKEN USAGE
    # print("\nUsage Metadata:")
    # print(response.usage_metadata)
    ############

    # again, this appends to MessagesState instead of overwriting
    return {
        "messages": [
            AIMessage(
                content=response.answer,
                citations=[citation.model_dump() for citation in response.citations],
            )
        ]
    }


graph_builder.add_node(query_or_respond)
graph_builder.add_node(tools)
graph_builder.add_node(generate)

graph_builder.set_entry_point("query_or_respond")

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

####################### Checkpointing #########################

# IN DEVELOPMENT ONLY: use in-memory checkpointing
# memory = MemorySaver()

# IN PRODUCTION: use sqlite checkpointing
# Note: check_same_thread=False is OK as the implementation uses a lock
# to ensure thread safety.
conn = sqlite3.connect("checkpoints.sqlite", check_same_thread=False)


memory = SqliteSaver(conn)

##################################################################

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


async def set_user_balance_in_session(balance):
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
    cl.user_session.set("balance", balance)


async def print_insufficient_balance_message():
    user_id = cl.user_session.get("user_id")
    balance = cl.user_session.get("balance")
    balance = max(balance, 0)
    print(f"User {user_id} has insufficient balance: {balance}.")
    # elements = [
    #     # type: ignore
    #     cl.Text(
    #         name="",
    #         content="[συνδρομή εδώ](/order)",
    #         display="inline",
    #     )
    # ]
    balance_message = cl.Message(
        content=f"Το υπόλοιπο σας είναι {balance:.2f}€. Παρακαλώ ανανεώστε τον λογαριασμό σας για να συνεχίσετε να χρησιμοποιείτε την υπηρεσία."
        "\n [Ανανεώστε τα tokens σας εδώ](/order)",
        # elements=elements,
        author="System",
    )
    cl.user_session.set("balance_message", True)  # stop any ongoing processing
    await balance_message.send()


############  DATA LAYER ###########################

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
    await set_user_balance_in_session(balance)
    if balance is None:
        return  # error already handled in handle_user_balance_in_session
    if balance <= 0:
        await print_insufficient_balance_message()
        return

    print(
        f"User {user_id} has started or resumed a chat. Displaying initial token usage."
    )
    # usage = db_object.get_all_chats_tokens()
    # usage = (0, 0, 0)  # dummy usage
    # elements = [
    #     # type: ignore
    #     cl.Text(
    #         name="",
    #         content="[Δείτε το ιστορικό κατανάλωσης tokens και χρεώσεων εδώ](/account)",
    #         display="inline",
    #     )
    # ]
    # if cl.user_session.get("greeting_message") is None:
    #     usage_msg = f"Χαίρετε, {user_id}! Το υπόλοιπο σας είναι: **{balance:.2f}€**."
    #     greeting = cl.Message(
    #         content=usage_msg
    #         + "\n[Δείτε το ιστορικό κατανάλωσης tokens και χρεώσεων εδώ](/account)",
    #         # elements=elements,
    #         author="System",
    #     )
    #     cl.user_session.set("greeting_message", greeting)
    #     await greeting.send()


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

    # message user that search is in progress
    progress = cl.Message(  # type: ignore
        content="Ψάχνω στα έγγραφα της ΑΑΔΕ...", author="AI")
    # await asyncio.sleep(1)  # allow greeting message to render
    await progress.send()
    async def runner(event):
        citations = []
        #buffer = ""
        retrieved_artifacts = []  # Store artifacts from tool calls
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
                 # Save artifacts from tool call (the retrieved documents)
                if hasattr(msg, "artifact") and msg.artifact:
                    retrieved_artifacts.extend(msg.artifact)
                progress.content ="Συγκεντρώνω τις πληροφορίες..."  # type: ignore
                await progress.update()
            if (
                msg.content  # type: ignore[union-attr]
                and isinstance(msg, AIMessage)
                and metadata["langgraph_node"] == "generate"  # type: ignore[index]
            ):
                # fmt: off
                await progress.remove()
                # Note: python name binding: assignments create a new local variable by default. 
                #buffer += msg.content  # type: ignore[union-attr]
                citations = msg.citations  # type: ignore[union-attr]
                await final_answer.stream_token(msg.content) # type: ignore[union-attr]
        return citations, retrieved_artifacts
    try:
        task = asyncio.create_task(runner(
            cl.user_session.get("stop_event"))# type: ignore
            )
        citations, retrieved_artifacts = await task
    except Exception as e:
        print(f"user cancelled: {e}")
        #buffer = ""
        citations = []
        retrieved_artifacts = []
    finally:
        await final_answer.send()

    # fmt: off
    # print(retrieved_artifacts)
    # print('citations: !!!!!!!!!!!!!!', citations)
    parsed_content = parse_links_to_markdown(citations, [doc.metadata for doc in retrieved_artifacts])
    if parsed_content:
        elements = [
            cl.Text(content=parsed_content, display="inline")  # type: ignore
        ]
        # await cl.Message( # type: ignore
        #     content="Δείτε τα έγγραφα που χρησιμοποιήθηκαν για την απάντηση:",
        #     elements=elements
        # ).send()
        final_answer.elements = elements
        await final_answer.update()

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

    # Explicitly persist to database (update() uses create_task which doesn't wait)
    try:
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

    # ===================== PRICING CONFIGURATION =====================
    # Pricing strategy: Cost markup + per-query overhead for profitability
    # 
    # Base costs (Gemini 2.5 Flash as of Jan 2025):
    #   - Input tokens: $0.30 per 1M tokens
    #   - Output tokens: $2.50 per 1M tokens
    #
    # Markup: 3x to cover infrastructure + profit margin
    # Per-query overhead: €0.01 to cover Cohere reranking (~€0.001/search)
    #   + Qdrant hosting + GCS storage + compute overhead
    # VAT: 24% (Greek standard rate) - applied to total charge
    # ================================================================
    units = 1000000  # tokens per million

    # Profit margin multiplier (3x = 200% gross margin)
    PROFIT_MARGIN = float(os.environ.get("PROFIT_MARGIN", 3.0))

    # Per-query overhead for retrieval services (Cohere, Qdrant, GCS, etc.)
    PER_QUERY_OVERHEAD = float(os.environ.get("PER_QUERY_OVERHEAD", 0.01))  # €0.01 per query

    # VAT rate (Greek standard rate: 24%)
    VAT_RATE = float(os.environ.get("VAT_RATE", 0.24))  # 24% VAT

    # Base token costs (at-cost from Google)
    base_input_rate = 0.30 / units   # $0.30 per 1M input tokens
    base_output_rate = 2.50 / units  # $2.50 per 1M output tokens

    # Apply markup for pricing to users
    charge_per_input_token: float = float(os.environ.get("CHARGE_PER_INPUT_TOKEN", base_input_rate * PROFIT_MARGIN))
    charge_per_output_token: float = float(os.environ.get("CHARGE_PER_OUTPUT_TOKEN", base_output_rate * PROFIT_MARGIN))

    # Total charge = (token costs + per-query overhead) * (1 + VAT)
    # Note: User-facing prices include VAT (gross prices)
    token_charge = charge_per_input_token * input_tokens + charge_per_output_token * output_tokens
    net_charge = token_charge + PER_QUERY_OVERHEAD
    vat_amount = net_charge * VAT_RATE
    balance_to_deduct = net_charge + vat_amount  # Total including VAT

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
