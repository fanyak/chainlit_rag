import httpx

from chainlit.oauth_providers import (
    Auth0OAuthProvider as BaseAuth0OAuthProvider,
    providers,
)
from chainlit.user import User

# import json


class Auth0OAuthProvider(BaseAuth0OAuthProvider):
    def __init__(self):
        super().__init__()
        # self.domain = f"https://{os.environ.get('OAUTH_OKTA_DOMAIN', '').rstrip('/')}"
        # self.authorize_url = (
        #     f"{self.domain}/authorize"
        # )

    # async def get_token(self, code: str, url: str):
    #     payload = {
    #         "client_id": self.client_id,
    #         "client_secret": self.client_secret,
    #         "code": code,
    #         "grant_type": "authorization_code",
    #         "redirect_uri": url,
    #     }
    #     async with httpx.AsyncClient() as client:
    #         response = await client.post(
    #             f"{self.domain}/oauth/token",
    #             data=payload,
    #         )
    #         response.raise_for_status()
    #         json_data = response.json()

    #         token = json_data.get("access_token")
    #         if not token:
    #             raise httpx.HTTPStatusError(
    #                 "Failed to get the access token",
    #                 request=response.request,
    #                 response=response,
    #             )
    #         return token

    async def get_user_info(self, token: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.original_domain}/userinfo",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            auth0_user = response.json()
            user = User(
                identifier=auth0_user.get("email") or auth0_user.get("sub"),
                metadata={
                    "image": auth0_user.get("picture", ""),
                    "provider": "auth0",
                },
            )
            return (auth0_user, user)


def override_providers():
    for key, value in enumerate(providers):
        if isinstance(value, BaseAuth0OAuthProvider):
            providers[key] = Auth0OAuthProvider()
            print("OAuth0 provider replaced")
