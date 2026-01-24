import os
import re
from typing import List, Optional

# from dotenv import load_dotenv
# load_dotenv()
from pydantic import BaseModel, Field

############# structured content for multiquery ###############


class MultiQueryRequest(BaseModel):
    """A request for multiple queries to be answered."""

    queries: list[str] = Field(
        ...,
        description="A list of different versions of the given question.",
    )


class ClassifyQuery(BaseModel):
    """Classification of whether a query contains multiple distinct questions."""

    is_complex: bool = Field(
        ...,
        description="True if the query contains TWO OR MORE distinct questions about DIFFERENT topics that require separate searches. False for single-topic queries.",
    )


class DecomposedQueries(BaseModel):
    """Decomposed sub-questions from a complex query."""

    sub_questions: list[str] = Field(
        ...,
        description="List of independent sub-questions extracted from the complex query. Each should be a complete, standalone question in Greek.",
    )


#############################################################

############### structured content for citations ###############


class Citation(BaseModel):
    """A citation for a source used in the answer."""

    full_path_name: str = Field(
        ...,
        description="The full file name including the directory path and file extension.",
    )
    page_number: int = Field(
        ...,
        description="The page number in the document where the cited information can be found.",
    )
    article_title: Optional[str] = Field(
        ...,
        description="The number and title of the specific article being cited from a legal document. Use empty string if not applicable.",
    )
    paragraph_title: Optional[str] = Field(
        ...,
        description="The title of the paragraph being cited, if it exists in the context, otherwise empty string.",
    )


class AnswerWithCitations(BaseModel):
    """An answer to the user question along with citations for the answer."""

    answer: str
    citations: list[Citation]


###############################################################

################ Google Storage utilities #####################


def get_storage_bucket_name() -> str:
    """Retrieves the Google Storage bucket name from environment variables."""
    return os.environ["GOOGLE_STORAGE_BUCKET_NAME"]


def get_storage_assets_path() -> str:
    """Retrieves the Google Storage assets path from environment variables."""
    return os.environ["GOOGLE_STORAGE_ASSETS_PATH"]


def get_storage_url() -> str:
    """Constructs the Google Storage URL based on the bucket name."""
    bucket_name = get_storage_bucket_name()
    assets_path = get_storage_assets_path()
    return f"https://storage.googleapis.com/{bucket_name}/{assets_path}/"


################################################################


def normalize_path(path: str) -> str:
    """normalize path separators for cross-platform consistency.

    On Linux, os.path.basename() doesn't recognize backslashes as path separators,
    so 'dir\\file.pdf' would return the whole string (dir\\file.pdf) instead of 'file.pdf'.
    This function normalizes backslashes to forward slashes first to ensure
    consistent behavior across platforms.
    """
    # Normalize backslashes to forward slashes
    # Also, sometimes the models answer contains the path in double quotes
    return path.replace("\\", "/", -1).replace("//", "/", -1).replace('"', "", -1)


def manipulate_path(file_path: str) -> str:
    """Manipulates the file path to create a full storage URL."""
    # Normalize backslashes to forward slashes
    raw_file_path = normalize_path(file_path)
    # this is greedy: it will remove all '(' instances from the beginning
    raw_file_path = raw_file_path.strip("()[]*{}<>\"'")
    raw_file_path = raw_file_path.replace("assets/", "")
    return raw_file_path


def extract_path(match: re.Match[str]) -> str:
    """Extracts the file path from a regex match object."""
    file_path = match.group(0)
    return manipulate_path(file_path)


def parse_and_replace_links(text: str) -> str:
    """Extracts all PDF links from the text and replaces them with markdown links."""
    # return f'<a href="{file_path}">{os.path.basename(file_path)}</a>'
    return re.sub(r"[\w\\\/]+\.pdf", extract_path, text)


def parse_links_to_markdown(citations: List[dict], docs_metadata: List[dict]) -> str:
    """Extracts PDF links from text and formats them as a markdown list.
    Only includes links that match sources from the provided metadata.
    """
    # Build a lookup: basename -> full manipulated path (O(1) lookups)

    if (
        not docs_metadata
        or len(docs_metadata) == 0
        or not citations
        or len(citations) == 0
    ):
        return ""

    item_fmt = "- {}"
    storage_url = get_storage_url()

    source_bases_lookup = {
        os.path.basename(path): path
        for d in docs_metadata
        if (path := manipulate_path(d.get("source", "")))
    }
    used_artifact_sources = set()
    for citation in citations:
        found_artifact_path = source_bases_lookup.get(
            os.path.basename(normalize_path(citation.get("full_path_name", "")))
        )
        if found_artifact_path is not None:
            page_number = citation.get("page_number")
            article_title = citation.get("article_title")
            paragraph_title = citation.get("paragraph_title")
            page = f", σελ. {page_number}" if page_number else ""
            article = f", αναφερόμενο άρθρο: {article_title}" if article_title else ""
            paragraph = (
                f", παράγραφος κειμένου: {paragraph_title}" if paragraph_title else ""
            )
            used_artifact_sources.add(
                item_fmt.format(
                    f"[{os.path.basename(found_artifact_path)}]({storage_url}{found_artifact_path}) {page}{article}{paragraph}"
                )
            )
    artifact_sources_markup = "\n".join([*used_artifact_sources])
    return "### Πηγές:\n " + artifact_sources_markup


def amendment(m):
    return m.get("trapped", "") if m.get("trapped", "") != "/False" else ""
