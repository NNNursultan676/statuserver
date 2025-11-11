import os
import csv
import io
import httpx
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, ValidationError

from models import (
    Service, InsertService,
    Incident, InsertIncident,
    InsertServerMetrics,
    ServiceStatus, MetricsReport
)
from storage import storage
from grafana_service import create_grafana_service
from import_data import import_services_from_data
from metrics_api_client import metrics_client
from auth import require_admin
import asyncio

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
            # Получаем данные из Monitoring API
            services, metrics_list = await metrics_client.sync_services_from_api()

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

            # Сохраняем метрики в базу данных
            for metrics_data in metrics_list:
                try:
                    # Разделяем на категории и убираем URL/порты у серверов
                    if service.category == "server":
                        metrics = InsertServerMetrics(
                            serviceId=metrics_data['service_id'],
                            cpuUsage=metrics_data.get('cpu_usage'),
                            ramUsage=metrics_data.get('memory_usage'),
                            diskUsage=metrics_data.get('disk_usage')
                        )
                    else: # Для сервисов можем сохранить URL и порты, если они есть
                        metrics = InsertServerMetrics(
                            serviceId=metrics_data['service_id'],
                            cpuUsage=metrics_data.get('cpu_usage'),
                            ramUsage=metrics_data.get('memory_usage'),
                            diskUsage=metrics_data.get('disk_usage')
                        )
                    await storage.create_server_metrics(metrics)
                except Exception as e:
                    print(f"Error saving metrics for {metrics_data['service_id']}: {e}")

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

@router.post("/api/check-availability")
async def check_availability_endpoint(address: str = Query(...), port: Optional[int] = Query(None)):
    """
    Проверка доступности по введенному адресу.
    Отправка curl-подобного запроса.
    """
    try:
        available = await check_service_availability(address, port)
        return {"address": address, "port": port, "available": available}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check availability: {str(e)}")

@router.post("/api/reports/generate-metrics-report")
async def generate_metrics_report(
    start_time: datetime = Query(...),
    end_time: datetime = Query(...)
):
    """
    Генерация отчета по метрикам за указанный период.
    Поддержка метрик в определенные часы (утро, обед, вечер).
    """
    try:
        # Получаем все сервисы
        services = await storage.get_services()
        service_ids = [s.id for s in services]

        # Получаем метрики за указанный период
        # Здесь предполагается, что storage.get_server_metrics может фильтровать по времени
        # Если нет, то нужно будет реализовать фильтрацию здесь
        all_metrics = await storage.get_server_metrics() # Получаем все метрики
        filtered_metrics = [
            m for m in all_metrics
            if start_time <= m.timestamp <= end_time
        ]

        # Группируем метрики по категориям (серверы, сервисы)
        server_metrics = {s.id: [] for s in services if s.category == "server"}
        service_metrics = {s.id: [] for s in services if s.category != "server"}

        for metrics in filtered_metrics:
            if metrics.serviceId in server_metrics:
                server_metrics[metrics.serviceId].append(metrics)
            elif metrics.serviceId in service_metrics:
                service_metrics[metrics.serviceId].append(metrics)

        # Вычисляем средние метрики за утро, обед, вечер
        report_data = {}

        for category, metrics_dict in [("server", server_metrics), ("service", service_metrics)]:
            for service_id, metrics_list in metrics_dict.items():
                if not metrics_list:
                    continue

                # Разбиваем метрики по времени суток (утро, обед, вечер)
                morning_metrics = [m for m in metrics_list if 6 <= m.timestamp.hour < 12]
                lunch_metrics = [m for m in metrics_list if 12 <= m.timestamp.hour < 18]
                evening_metrics = [m for m in metrics_list if 18 <= m.timestamp.hour < 24 or 0 <= m.timestamp.hour < 6]

                service_name = await storage.get_service(service_id).name if await storage.get_service(service_id) else f"Unknown Service ({service_id})"


                def calculate_average(metrics_subset):
                    if not metrics_subset:
                        return {"cpuUsage": None, "ramUsage": None, "diskUsage": None}
                    count = len(metrics_subset)
                    avg_cpu = sum(m.cpuUsage for m in metrics_subset if m.cpuUsage is not None) / count
                    avg_ram = sum(m.ramUsage for m in metrics_subset if m.ramUsage is not None) / count
                    avg_disk = sum(m.diskUsage for m in metrics_subset if m.diskUsage is not None) / count
                    return {"cpuUsage": avg_cpu, "ramUsage": avg_ram, "diskUsage": avg_disk}

                report_data[f"{category}_{service_id}"] = MetricsReport(
                    service_id=service_id,
                    service_name=service_name,
                    category=category,
                    morning_avg=calculate_average(morning_metrics),
                    lunch_avg=calculate_average(lunch_metrics),
                    evening_avg=calculate_average(evening_metrics)
                )

        return {"report": report_data}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating metrics report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate metrics report")


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