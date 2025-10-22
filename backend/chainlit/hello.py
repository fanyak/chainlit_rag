# This is a simple example of a chainlit app.
from typing import Dict, Optional

from chainlit import (
    AskUserMessage,
    Message,
    User,
    oauth_callback as oAuth_callback,
    on_chat_start,
)


@oAuth_callback  # type: ignore
def oauth_callback(  # type: ignore
    provider_id: str,  # type: ignore
    token: str,  # type: ignore
    raw_user_data: Dict[str, str],  # type: ignore
    default_user: User,  # type: ignore
) -> Optional[User]:
    return default_user


@on_chat_start
async def main():
    res = await AskUserMessage(content="What is your name?", timeout=30).send()
    if res:
        await Message(
            content=f"Your name is: {res['output']}.\nChainlit installation is working!\nYou can now start building your own chainlit apps!",
        ).send()
