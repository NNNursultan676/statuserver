import os
import csv
import io
import httpx
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, ValidationError

from models import (
    Service, InsertService,
    Incident, InsertIncident,
    InsertServerMetrics,
    ServiceStatus
)
from storage import storage
from grafana_service import create_grafana_service
from import_data import import_services_from_data
from metrics_api_client import metrics_client
from auth import require_admin

router = APIRouter()
grafana_service = create_grafana_service(storage)

class StatusUpdate(BaseModel):
    status: ServiceStatus

class ImportData(BaseModel):
    data: dict

async def check_service_availability(address: str, port: Optional[int] = None) -> bool:
    try:
        url = f"http://{address}:{port}" if port else address
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.head(url)
            return response.status_code < 400
    except:
        return False

def convert_to_csv(services: list) -> str:
    if not services:
        return ""
    
    output = io.StringIO()
    if services:
        fieldnames = services[0].keys() if isinstance(services[0], dict) else list(vars(services[0]).keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for service in services:
            if isinstance(service, dict):
                writer.writerow(service)
            else:
                writer.writerow(vars(service))
    
    return output.getvalue()

@router.get("/api/services")
async def get_services():
    try:
        # Проверяем доступность Metrics API
        api_available = await metrics_client.check_availability()
        
        if api_available:
            # Получаем данные из внешнего API метрик
            servers = await metrics_client.get_all_servers()
            services = await metrics_client.convert_servers_to_services(servers)
            
            # Синхронизируем с локальным хранилищем
            for service in services:
                existing = await storage.get_service(service.id)
                if not existing:
                    # Создаем новый сервис
                    insert_data = InsertService(
                        name=service.name,
                        description=service.description,
                        category=service.category,
                        region=service.region,
                        status=service.status,
                        type=service.type,
                        icon=service.icon,
                        address=service.address,
                        port=service.port
                    )
                    await storage.create_service(insert_data)
                else:
                    # Обновляем статус существующего
                    await storage.update_service_status(service.id, service.status)
            
            return [s.model_dump(by_alias=True) for s in services]
        else:
            # API недоступен - возвращаем данные из локального хранилища
            services = await storage.get_services()
            # Возвращаем пустой массив если нет данных
            return [s.model_dump(by_alias=True) for s in services]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching services: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch services")

@router.get("/api/services/{service_id}")
async def get_service(service_id: str):
    try:
        service = await storage.get_service(service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        return service.model_dump(by_alias=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch service")

@router.post("/api/services", status_code=201)
async def create_service(service: InsertService, admin: str = Depends(require_admin)):
    try:
        created_service = await storage.create_service(service)
        return created_service.model_dump(by_alias=True)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail={"error": "Invalid service data", "details": e.errors()})
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create service")

@router.patch("/api/services/{service_id}/status")
async def update_service_status(service_id: str, status_update: StatusUpdate, admin: str = Depends(require_admin)):
    try:
        status = status_update.status
        if status not in ["operational", "degraded", "down", "maintenance", "loading"]:
            raise HTTPException(status_code=400, detail="Invalid status value")
        
        service = await storage.update_service_status(service_id, status)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        return service.model_dump(by_alias=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update service status")

@router.get("/api/incidents")
async def get_incidents():
    try:
        incidents = await storage.get_incidents()
        return [i.model_dump(by_alias=True) for i in incidents]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch incidents")

@router.get("/api/incidents/{incident_id}")
async def get_incident(incident_id: str):
    try:
        incident = await storage.get_incident(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        return incident.model_dump(by_alias=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch incident")

@router.post("/api/incidents", status_code=201)
async def create_incident(incident: InsertIncident, admin: str = Depends(require_admin)):
    try:
        created_incident = await storage.create_incident(incident)
        return created_incident.model_dump(by_alias=True)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail={"error": "Invalid incident data", "details": e.errors()})
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create incident")

@router.get("/api/status-history/{service_id}")
async def get_status_history(service_id: str):
    try:
        history = await storage.get_status_history(service_id)
        return [h.model_dump(by_alias=True) for h in history]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch status history")

@router.get("/api/server-metrics")
async def get_server_metrics(serviceId: Optional[str] = Query(None)):
    try:
        metrics = await storage.get_server_metrics(serviceId)
        return [m.model_dump(by_alias=True) for m in metrics]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch server metrics")

@router.post("/api/server-metrics", status_code=201)
async def create_server_metrics(metrics: InsertServerMetrics):
    try:
        created_metrics = await storage.create_server_metrics(metrics)
        return created_metrics.model_dump(by_alias=True)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail={"error": "Invalid metrics data", "details": e.errors()})
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create server metrics")

@router.post("/api/import-services")
async def import_services(import_data: ImportData, admin: str = Depends(require_admin)):
    try:
        data = import_data.data
        if not data:
            raise HTTPException(status_code=400, detail="No data provided")
        
        count = await import_services_from_data(storage, data)
        return {"success": True, "imported": count}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Import error: {e}")
        raise HTTPException(status_code=500, detail="Failed to import services")

@router.get("/api/export-services")
async def export_services(format: str = Query("json")):
    try:
        services = await storage.get_services()
        services_dict = [s.model_dump(by_alias=True) for s in services]
        
        if format == "json":
            return JSONResponse(
                content=services_dict,
                headers={
                    "Content-Disposition": "attachment; filename=services.json"
                }
            )
        elif format == "csv":
            csv_content = convert_to_csv(services_dict)
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={
                    "Content-Disposition": "attachment; filename=services.csv"
                }
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to export services")

@router.post("/api/check-availability/{service_id}")
async def check_availability(service_id: str):
    try:
        service = await storage.get_service(service_id)
        if not service or not service.address:
            raise HTTPException(status_code=404, detail="Service not found or no address")
        
        available = await check_service_availability(service.address, service.port)
        return {"available": available, "serviceId": service.id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to check availability")

@router.get("/api/grafana/status")
async def grafana_status():
    try:
        configured = grafana_service.is_configured()
        return {
            "configured": configured,
            "url": os.getenv('GRAFANA_URL') if configured else None,
            "message": "Grafana is configured" if configured else "Grafana is not configured"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to check Grafana status")

@router.post("/api/grafana/sync")
async def grafana_sync(admin: str = Depends(require_admin)):
    try:
        if not grafana_service.is_configured():
            raise HTTPException(status_code=400, detail="Grafana is not configured")
        
        result = await grafana_service.sync_service_statuses()
        return {
            "success": True,
            **result,
            "message": f"Synced {result['updated']} services from Grafana"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Grafana sync error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to sync with Grafana",
                "details": str(e)
            }
        )

@router.get("/api/grafana/metrics")
async def grafana_metrics(query: str = Query('up{job="node_exporter"}')):
    try:
        if not grafana_service.is_configured():
            raise HTTPException(status_code=400, detail="Grafana is not configured")
        
        metrics = await grafana_service.fetch_metrics(query)
        return {"success": True, "metrics": metrics, "count": len(metrics)}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Grafana metrics error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to fetch Grafana metrics",
                "details": str(e)
            }
        )

@router.get("/api/metrics-api/status")
async def get_metrics_api_status():
    """Проверка доступности внешнего Metrics API"""
    try:
        available = await metrics_client.check_availability()
        return {
            "available": available,
            "url": metrics_client.base_url,
            "message": "Metrics API доступен" if available else "Metrics API недоступен"
        }
    except Exception as e:
        return {
            "available": False,
            "url": metrics_client.base_url,
            "message": f"Ошибка проверки Metrics API: {str(e)}"
        }

@router.get("/api/auth/verify")
async def verify_auth(admin: str = Depends(require_admin)):
    """Проверка учетных данных администратора"""
    return {"authenticated": True, "username": admin}
