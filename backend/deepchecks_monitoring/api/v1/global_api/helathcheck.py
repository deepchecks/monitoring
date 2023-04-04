"""Module representing the endpoints for the health check."""
from fastapi import Response

from .global_router import router


@router.get('/health-check')
async def health_check():
    """Health check endpoint.

    Returns
    -------
        Response: A 200 OK response.
    """
    return Response(content='ok')
