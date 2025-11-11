import os
import sys
import asyncio
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import httpx
import time

from config import config
from routes import router
from storage import storage
from grafana_service import create_grafana_service
from metrics_api_client import metrics_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    await storage.seed_data()
    print("Storage initialized and data seeded")
    
    # Проверяем доступность Metrics API
    metrics_available = await metrics_client.check_availability()
    if metrics_available:
        print(f"✓ Metrics API доступен: {metrics_client.base_url}")
    else:
        print(f"✗ Metrics API недоступен: {metrics_client.base_url}")
        print("  Приложение будет использовать локальное хранилище")
    
    grafana_service = create_grafana_service(storage)
    
    if grafana_service.is_configured():
        print("Grafana integration is configured. Starting automatic sync...")
        
        async def grafana_sync_task():
            await asyncio.sleep(5)
            try:
                await grafana_service.sync_service_statuses()
                print("Initial Grafana sync completed")
            except Exception as error:
                print(f"Initial Grafana sync failed: {error}")
            
            while True:
                await asyncio.sleep(30)
                try:
                    await grafana_service.sync_service_statuses()
                except Exception as error:
                    print(f"Periodic Grafana sync failed: {error}")
        
        asyncio.create_task(grafana_sync_task())
    else:
        print("Grafana integration is not configured. Skipping automatic sync.")
    
    yield
    
    print("Application shutting down")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    
    response = await call_next(request)
    
    duration = int((time.time() - start_time) * 1000)
    
    if path.startswith("/api"):
        log_line = f"{request.method} {path} {response.status_code} in {duration}ms"
        if len(log_line) > 80:
            log_line = log_line[:79] + "…"
        print(log_line)
    
    return response

app.include_router(router)

if config.is_development():
    vite_dev_server_url = "http://localhost:5173"
    
    @app.api_route("/{path:path}", methods=["GET", "HEAD"])
    async def proxy_to_vite(path: str, request: Request):
        url = f"{vite_dev_server_url}/{path}"
        
        async with httpx.AsyncClient() as client:
            try:
                if request.method == "GET":
                    response = await client.get(
                        url,
                        headers=dict(request.headers),
                        follow_redirects=True
                    )
                else:
                    response = await client.head(
                        url,
                        headers=dict(request.headers),
                        follow_redirects=True
                    )
                
                return Response(
                    content=response.content,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.headers.get("content-type")
                )
            except httpx.ConnectError:
                return Response(
                    content="Vite dev server is not running. Please start it with 'npm run dev' in the client directory.",
                    status_code=503
                )
else:
    static_dir = Path(__file__).parent.parent / "dist" / "public"
    
    if static_dir.exists():
        app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")
        
        @app.get("/{path:path}")
        async def serve_static(path: str):
            file_path = static_dir / path
            if file_path.is_file():
                return FileResponse(file_path)
            else:
                index_path = static_dir / "index.html"
                if index_path.is_file():
                    return FileResponse(index_path)
                else:
                    return Response(content="Not Found", status_code=404)
    else:
        print(f"Warning: Static directory not found at {static_dir}")

if __name__ == "__main__":
    import uvicorn
    
    print(f"🚀 Status Server запускается...")
    print(f"   Режим: {config.ENV}")
    print(f"   Порт: {config.PORT}")
    print(f"   Админ: {config.ADMIN_USERNAME}")
    print(f"serving on port {config.PORT}")
    
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.is_development(),
        log_level="info"
    )
