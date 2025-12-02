import json
import os
import re
from typing import Literal, NamedTuple, Optional, TypedDict, cast

from fastapi import Request, Response
from fastapi.exceptions import HTTPException
from fastapi.security.base import SecurityBase
from fastapi.security.utils import get_authorization_scheme_param
from starlette.status import HTTP_401_UNAUTHORIZED

from chainlit.config import config


def parse_to_cookie_key(input_str: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]", "_", input_str).lower()


""" Module level cookie settings. """
_cookie_samesite = cast(
    Literal["lax", "strict", "none"],
    os.environ.get("CHAINLIT_COOKIE_SAMESITE", "lax"),
)

assert _cookie_samesite in [
    "lax",
    "strict",
    "none",
], (
    "Invalid value for CHAINLIT_COOKIE_SAMESITE. Must be one of 'lax', 'strict' or 'none'."
)
_cookie_secure = _cookie_samesite == "none"
if _cookie_root_path := os.environ.get("CHAINLIT_ROOT_PATH", None):
    _cookie_path = os.environ.get(_cookie_root_path, "/")
else:
    _cookie_path = os.environ.get("CHAINLIT_AUTH_COOKIE_PATH", "/")
_state_cookie_lifetime = 3 * 60  # 3m
_auth_cookie_name = os.environ.get("CHAINLIT_AUTH_COOKIE_NAME", "access_token")
_state_cookie_name = "oauth_state"


class RefererData(TypedDict):
    referer_path: str
    referer_query: str
    name: str | None


class OAuth2PasswordBearerWithCookie(SecurityBase):
    """
    OAuth2 password flow with cookie support with fallback to bearer token.
    """

    def __init__(
        self,
        tokenUrl: str,
        scheme_name: Optional[str] = None,
        auto_error: bool = True,
    ):
        self.tokenUrl = tokenUrl
        self.scheme_name = scheme_name or self.__class__.__name__
        self.auto_error = auto_error

    async def __call__(self, request: Request) -> Optional[str]:
        # First try to get the token from the cookie
        token = get_token_from_cookies(request.cookies)

        # If no cookie, try the Authorization header as fallback
        if not token:
            # TODO: Only bother to check if cookie auth is explicitly disabled.
            authorization = request.headers.get("Authorization")
            if authorization:
                scheme, token = get_authorization_scheme_param(authorization)
                if scheme.lower() != "bearer":
                    if self.auto_error:
                        raise HTTPException(
                            status_code=HTTP_401_UNAUTHORIZED,
                            detail="Invalid authentication credentials",
                            headers={"WWW-Authenticate": "Bearer"},
                        )
                    else:
                        return None
            else:
                if self.auto_error:
                    raise HTTPException(
                        status_code=HTTP_401_UNAUTHORIZED,
                        detail="Not authenticated",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                else:
                    return None

        return token


def _get_chunked_cookie(cookies: dict[str, str], name: str) -> Optional[str]:
    # Gather all auth_chunk_i cookies, sorted by their index
    chunk_parts = []

    i = 0
    while True:
        cookie_key = f"{_auth_cookie_name}_{i}"
        if cookie_key not in cookies:
            break

        chunk_parts.append(cookies[cookie_key])
        i += 1

    joined = "".join(chunk_parts)

    return joined if joined != "" else None


def get_token_from_cookies(cookies: dict[str, str]) -> Optional[str]:
    """
    Read all chunk cookies and reconstruct the token
    """

    # Default/unchunked cookies
    if value := cookies.get(_auth_cookie_name):
        return value

    return _get_chunked_cookie(cookies, _auth_cookie_name)


def set_auth_cookie(request: Request, response: Response, token: str):
    """
    Helper function to set the authentication cookie with secure parameters
    and remove any leftover chunks from a previously larger token.
    """

    _chunk_size = 3000

    existing_cookies = {
        k for k in request.cookies.keys() if k.startswith(_auth_cookie_name)
    }

    if len(token) > _chunk_size:
        chunks = [token[i : i + _chunk_size] for i in range(0, len(token), _chunk_size)]

        for i, chunk in enumerate(chunks):
            k = f"{_auth_cookie_name}_{i}"

            response.set_cookie(
                key=k,
                value=chunk,
                httponly=True,
                secure=_cookie_secure,
                samesite=_cookie_samesite,
                max_age=config.project.user_session_timeout,
            )

            existing_cookies.discard(k)
    else:
        # Default (shorter cookies)
        response.set_cookie(
            key=_auth_cookie_name,
            value=token,
            httponly=True,
            secure=_cookie_secure,
            samesite=_cookie_samesite,
            max_age=config.project.user_session_timeout,
        )

        existing_cookies.discard(_auth_cookie_name)

    # Delete remaining prior cookies/cookie chunks
    for k in existing_cookies:
        response.delete_cookie(
            key=k, path=_cookie_path, secure=_cookie_secure, samesite=_cookie_samesite
        )


def clear_auth_cookie(request: Request, response: Response):
    """
    Helper function to clear the authentication cookie
    """

    existing_cookies = {
        k for k in request.cookies.keys() if k.startswith(_auth_cookie_name)
    }

    for k in existing_cookies:
        response.delete_cookie(
            key=k, path=_cookie_path, secure=_cookie_secure, samesite=_cookie_samesite
        )


def set_oauth_state_cookie(response: Response, token: str):
    response.set_cookie(
        _state_cookie_name,
        token,
        httponly=True,
        samesite=_cookie_samesite,
        secure=_cookie_secure,
        max_age=_state_cookie_lifetime,
    )


def validate_oauth_state_cookie(request: Request, state: str):
    """Check the state from the oauth provider against the browser cookie."""

    oauth_state = request.cookies.get(_state_cookie_name)

    if oauth_state != state:
        raise Exception("oauth state does not correspond")


def clear_oauth_state_cookie(response: Response):
    """Oauth complete, delete state token."""
    response.delete_cookie(_state_cookie_name)  # Do we set path here?


def set_redirect_path_cookie(response: Response, random: str, referer: NamedTuple):
    """set redirect state in cookie."""
    """ REF: https://auth0.com/docs/secure/attack-protection/state-parameters#redirect-users"""
    if not random:
        return
    state_param_name = parse_to_cookie_key(random)
    response.set_cookie(
        key=state_param_name,
        value=json.dumps(
            {
                "referer_path": referer.path,
                "referer_query": referer.query,
                "name": state_param_name,
            }
        ),
        httponly=True,
        secure=_cookie_secure,
        samesite=_cookie_samesite,
        max_age=_state_cookie_lifetime,
    )


def get_redirect_path_cookie(request: Request) -> Optional[RefererData]:
    """get redirect state from cookie."""
    random = request.cookies.get(_state_cookie_name)
    if not random:
        return None
    state_param_name = parse_to_cookie_key(random)
    print(f"state_param_name: {state_param_name}", request.cookies)
    redirect_data = request.cookies.get(state_param_name) if state_param_name else None
    if redirect_data is None:
        return None
    return json.loads(redirect_data)


def clear_redirect_path_cookie(response: Response, name: str):
    """Delete redirect path cookie."""
    try:
        print(f"Deleting redirect path cookie: {name}")
        response.delete_cookie(name)
    except Exception as e:
        print(f"Could not delete redirect path cookie!!!!!!!!: {e}")
        pass
