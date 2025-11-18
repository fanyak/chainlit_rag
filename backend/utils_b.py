import os
import re

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


def extract_path(match: re.Match[str]) -> str:
    """Extracts the file path from a regex match object."""
    file_path = match.group(0)
    # Replace with link markdown format
    # Normalize backslashes to forward slashes
    raw_file_path = file_path.replace("\\", "/", -1).replace("//", "/", -1)
    raw_file_path = raw_file_path.replace("assets/", "")
    # rf"{file_path}"
    return f"{get_storage_url()}{raw_file_path}"
    # return pathlib.Path(f"{get_storage_url()}{raw_file_path}").as_uri()


def parse_and_replace_links(text: str) -> str:
    """Extracts all PDF links from the text and replaces them with markdown links."""
    # return f'<a href="{file_path}">{os.path.basename(file_path)}</a>'
    return re.sub(r"[\w\\\/]+\.pdf", extract_path, text)


def parse_links_to_markdown(text: str) -> str:
    """Extracts all PDF links from the text and formats them as a markdown list."""
    item_fmt = "- {}"
    # re.finditer(r"[\w\\\/]+\.pdf", text)
    matches = re.finditer(r"[^\s,]+\.pdf", text)
    unique_matches = {extract_path(m) for m in matches}
    return "\n".join(
        item_fmt.format(f"[{os.path.basename(path)}]({path})")
        for path in unique_matches
    )


def amendment(m):
    return m.get("trapped", "") if m.get("trapped", "") != "/False" else ""
