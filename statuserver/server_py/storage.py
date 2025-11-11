import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path

from models import (
    Service, InsertService,
    Incident, InsertIncident,
    StatusHistory, InsertStatusHistory,
    ServerMetrics, InsertServerMetrics,
    ServiceStatus
)

class MemStorage:
    def __init__(self):
        self.services: Dict[str, Service] = {}
        self.incidents: Dict[str, Incident] = {}
        self.status_history: Dict[str, StatusHistory] = {}
        self.server_metrics: Dict[str, ServerMetrics] = {}
        
    async def seed_data(self):
        # Тестовые данные отключены - приложение работает только с данными из Metrics API
        pass
    
    def _generate_deterministic_id(self, service: InsertService) -> str:
        key = f"{service.name}-{service.region}-{service.category}-{service.address or ''}-{service.port or ''}"
        hash_val = 0
        for char in key:
            hash_val = ((hash_val << 5) - hash_val) + ord(char)
            hash_val = hash_val & 0xFFFFFFFF
        
        hash_str = format(abs(hash_val), '030x')
        return f"{hash_str[0:8]}-{hash_str[8:12]}-4{hash_str[12:15]}-a{hash_str[15:18]}-{hash_str[18:30]}"
    
    async def get_services(self) -> List[Service]:
        return list(self.services.values())
    
    async def get_service(self, service_id: str) -> Optional[Service]:
        return self.services.get(service_id)
    
    async def create_service(self, insert_service: InsertService) -> Service:
        service_id = self._generate_deterministic_id(insert_service)
        service = Service(
            id=service_id,
            name=insert_service.name,
            description=insert_service.description,
            category=insert_service.category,
            region=insert_service.region,
            status=insert_service.status or "operational",
            type=insert_service.type,
            icon=insert_service.icon,
            address=insert_service.address,
            port=insert_service.port,
            updated_at=datetime.now()
        )
        self.services[service_id] = service
        
        await self.create_status_history(InsertStatusHistory(
            service_id=service_id,
            status=service.status,
            timestamp=datetime.now()
        ))
        
        return service
    
    async def update_service_status(self, service_id: str, status: ServiceStatus) -> Optional[Service]:
        service = self.services.get(service_id)
        if not service:
            return None
        
        updated_service = Service(
            **service.model_dump(),
            status=status,
            updated_at=datetime.now()
        )
        self.services[service_id] = updated_service
        
        await self.create_status_history(InsertStatusHistory(
            service_id=service_id,
            status=status,
            timestamp=datetime.now()
        ))
        
        return updated_service
    
    async def get_incidents(self) -> List[Incident]:
        return list(self.incidents.values())
    
    async def get_incident(self, incident_id: str) -> Optional[Incident]:
        return self.incidents.get(incident_id)
    
    async def create_incident(self, insert_incident: InsertIncident) -> Incident:
        incident_id = str(uuid.uuid4())
        incident = Incident(
            id=incident_id,
            service_id=insert_incident.service_id,
            title=insert_incident.title,
            description=insert_incident.description,
            status=insert_incident.status,
            severity=insert_incident.severity,
            started_at=insert_incident.started_at or datetime.now(),
            resolved_at=insert_incident.resolved_at,
            created_at=datetime.now()
        )
        self.incidents[incident_id] = incident
        return incident
    
    async def get_status_history(self, service_id: str) -> List[StatusHistory]:
        history = [h for h in self.status_history.values() if h.service_id == service_id]
        return sorted(history, key=lambda h: h.timestamp, reverse=True)
    
    async def create_status_history(self, insert_history: InsertStatusHistory) -> StatusHistory:
        history_id = str(uuid.uuid4())
        history = StatusHistory(
            id=history_id,
            service_id=insert_history.service_id,
            status=insert_history.status,
            timestamp=insert_history.timestamp or datetime.now()
        )
        self.status_history[history_id] = history
        return history
    
    async def get_server_metrics(self, service_id: Optional[str] = None) -> List[ServerMetrics]:
        metrics = list(self.server_metrics.values())
        if service_id:
            metrics = [m for m in metrics if m.service_id == service_id]
        return sorted(metrics, key=lambda m: m.timestamp, reverse=True)
    
    async def create_server_metrics(self, insert_metrics: InsertServerMetrics) -> ServerMetrics:
        metrics_id = str(uuid.uuid4())
        metrics = ServerMetrics(
            id=metrics_id,
            service_id=insert_metrics.service_id,
            cpu_usage=insert_metrics.cpu_usage,
            ram_usage=insert_metrics.ram_usage,
            disk_usage=insert_metrics.disk_usage,
            timestamp=datetime.now()
        )
        self.server_metrics[metrics_id] = metrics
        return metrics

import os

# Выбор хранилища
def get_storage():
    """Получить экземпляр хранилища"""
    storage_type = os.getenv("STORAGE_TYPE", "database")
    
    if storage_type == "memory":
        print("📝 In-memory хранилище")
        return MemStorage()
    else:
        try:
            from db_storage import DatabaseStorage
            db_path = os.getenv("DATABASE_PATH", "data/services.db")
            print(f"💾 Постоянное хранилище: {db_path}")
            return DatabaseStorage(db_path)
        except:
            print("⚠️ Fallback to in-memory")
            return MemStorage()

storage = get_storage()
