from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from .models.database import engine, mapper_registry

from .api.v1 import router

app = FastAPI(
    title="Deepchecks Monitoring", openapi_url="/api/v1/openapi.json"
)
mapper_registry.metadata.create_all(bind=engine)


# Set all CORS enabled origins
# if settings.BACKEND_CORS_ORIGINS:
#     app.add_middleware(
#         CORSMiddleware,
#         allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
#         allow_credentials=True,
#         allow_methods=["*"],
#         allow_headers=["*"],
#     )

app.include_router(router, prefix="/api/v1")
print(router.routes)