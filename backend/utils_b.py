import os
import re
from typing import List

# from dotenv import load_dotenv
# load_dotenv()


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


def manipulate_path(file_path: str) -> str:
    """Manipulates the file path to create a full storage URL."""
    # Normalize backslashes to forward slashes
    raw_file_path = (
        file_path.replace("\\", "/", -1).replace("//", "/", -1).replace('"', "", -1)
    )
    # this is greedy: it will remove all '(' instances from the beginning
    raw_file_path = raw_file_path.strip("()[]*{}<>\"'")
    raw_file_path = raw_file_path.replace("assets/", "")
    return raw_file_path


def extract_path(match: re.Match[str]) -> str:
    """Extracts the file path from a regex match object."""
    file_path = match.group(0)
    # Replace with link markdown format
    # Normalize backslashes to forward slashes
    # Also, sometimes the models answer contains the path in double quotes
    # the regex to extract the path does not account for that, so we remove them here
    # raw_file_path = (
    #     file_path.replace("\\", "/", -1).replace("//",
    #                                             "/", -1).replace('"', "", -1)
    # )
    # # this is greedy: it will remove all '(' instances from the beginning
    # raw_file_path = raw_file_path.strip('()[]*{}<>"\'')
    # raw_file_path = raw_file_path.replace("assets/", "")
    # rf"{file_path}"
    # return f"{get_storage_url()}{raw_file_path}"
    return manipulate_path(file_path)


def parse_and_replace_links(text: str) -> str:
    """Extracts all PDF links from the text and replaces them with markdown links."""
    # return f'<a href="{file_path}">{os.path.basename(file_path)}</a>'
    return re.sub(r"[\w\\\/]+\.pdf", extract_path, text)


def parse_links_to_markdown(text: str, docs_metadata: List[dict]) -> str:
    """Extracts PDF links from text and formats them as a markdown list.
    Only includes links that match sources from the provided metadata.
    """
    # Build a lookup: basename -> full manipulated path (O(1) lookups)

    if not docs_metadata or len(docs_metadata) == 0 or not text:
        return ""

    item_fmt = "- {}"
    storage_url = get_storage_url()

    matches = re.finditer(r"[^\s,]+\.pdf", text)
    unique_matches: set[str] = {extract_path(m) for m in matches}
    # artifact_sources = [
    #     manipulate_path(d.get("source", "")) for d in docs_metadata]
    # source_bases_lookup: dict[str, int] = {os.path.basename(
    #     source): i for i, source in enumerate(artifact_sources)}
    source_bases_lookup = {
        os.path.basename(path): path
        for d in docs_metadata
        if (path := manipulate_path(d.get("source", "")))
    }
    used_artifact_sources = []
    for path in unique_matches:
        found_artifact_path = source_bases_lookup.get(os.path.basename(path))
        if found_artifact_path is not None:
            used_artifact_sources.append(
                item_fmt.format(
                    f"[{os.path.basename(found_artifact_path)}]({storage_url}{found_artifact_path})"
                )
            )
    return "\n".join(used_artifact_sources)


def amendment(m):
    return m.get("trapped", "") if m.get("trapped", "") != "/False" else ""
