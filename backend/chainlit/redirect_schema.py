import urllib.parse
from dataclasses import asdict
from typing import Literal, Optional

from pydantic import field_validator
from pydantic.dataclasses import dataclass


class RedirectSchemaError(Exception):
    """Custom exception for redirect schema validation errors."""

    pass


@dataclass
class RedirectSchema:
    """Schema for OAuth/login redirect validation and handling."""

    hostname: str
    path: str
    query: Optional[str] = ""
    params: Optional[str] = None
    scheme: Optional[Literal["http", "https"]] = "https"
    netloc: Optional[str] = None
    fragment: Optional[str] = None
    port: Optional[int] = None

    @field_validator("hostname")
    @classmethod
    def validate_hostname(cls, v: str) -> str:
        """Validate that hostname is in allowed list."""
        print("Validating hostname:", v)
        HOSTS: list[str] = ["localhost", "shamefully-nonsudsing-edmond.ngrok-free.dev"]
        HOSTS.extend(list(map(lambda host: f"www.{host}", HOSTS)))
        if v not in HOSTS:
            raise RedirectSchemaError(f"Invalid referer hostname: {v}")
        return v

    @field_validator("path")
    @classmethod
    def validate_redirect_path(cls, v: str) -> str:
        """Validate that redirect path is in allowed list."""
        ALLOWED_LOGIN_REDIRECT_URLS: list[str] = ["/order"]
        print(v)
        if v not in ALLOWED_LOGIN_REDIRECT_URLS:
            raise RedirectSchemaError(
                f"Invalid redirect path: {v}. Allowed: {ALLOWED_LOGIN_REDIRECT_URLS}"
            )
        return v

    @field_validator("query")
    @classmethod
    def validate_query_params(cls, v: Optional[str]) -> Optional[dict[str, list[str]]]:
        """Validate that query parameters only contain allowed keys."""
        if not v:
            return {}

        ALLOWED_LOGIN_REDIRECT_PARAMS: list[str] = [
            "amount",
            "createdAt",
            "orderFailed",
            "eventId",
            "eci",
            "s",
            "t",
        ]
        try:
            parsed: dict[str, list[str]] = urllib.parse.parse_qs(v)
            invalid_keys = [
                k for k in parsed.keys() if k not in ALLOWED_LOGIN_REDIRECT_PARAMS
            ]

            if invalid_keys:
                return {
                    k: v
                    for k, v in parsed.items()
                    if k in ALLOWED_LOGIN_REDIRECT_PARAMS
                }
                # TODO: Decide whether to raise an error or just filter out invalid keys
                # raise ValueError(f"Invalid query parameters: {invalid_keys}. Allowed: {ALLOWED_LOGIN_REDIRECT_PARAMS}")

            return parsed
        except Exception as e:
            raise RedirectSchemaError(f"Error parsing query parameters: {e}")

    def to_dict(self) -> dict:
        """Convert the dataclass to a dictionary."""
        return asdict(self)
