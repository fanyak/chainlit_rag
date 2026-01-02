"""
Contact form handling for Foros Chat.
Provides schema validation and email sending functionality.
"""

from pydantic import BaseModel, Field


class ContactFormRequest(BaseModel):
    """Schema for contact form submission."""

    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    email: str = Field(
        ...,
        min_length=5,
        max_length=100,
        pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        description="Email address",
    )
    subject: str = Field(
        ..., min_length=5, max_length=200, description="Message subject"
    )
    message: str = Field(
        ..., min_length=10, max_length=5000, description="Message content"
    )


class ContactFormResponse(BaseModel):
    """Response schema for contact form submission."""

    success: bool
    message: str
