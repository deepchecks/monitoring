"""Module defining the Router for V1 API."""
from fastapi import APIRouter

__all__ = ['router']


router = APIRouter(prefix="/api/v1")


@router.get("/say-hello")
async def hello_world() -> str:
    return 'Hello world'
