from fastapi import FastAPI

from deepchecks_api.api.v1 import router as v1_router

app = FastAPI(
    title="Deepchecks Monitoring", openapi_url="/api/v1/openapi.json"
)

app.include_router(v1_router)
