from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum

ServiceStatus = Literal["operational", "degraded", "down", "maintenance", "loading"]
IncidentSeverity = Literal["minor", "major", "critical"]
IncidentStatus = Literal["investigating", "identified", "monitoring", "resolved"]

class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    region: str
    status: ServiceStatus = "operational"
    type: Optional[str] = None
    icon: Optional[str] = None
    address: Optional[str] = None
    port: Optional[int] = None

class Service(ServiceBase):
    id: str
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class InsertService(ServiceBase):
    pass

class IncidentBase(BaseModel):
    service_id: str = Field(alias="serviceId")
    title: str
    description: Optional[str] = None
    status: IncidentStatus
    severity: IncidentSeverity
    started_at: Optional[datetime] = Field(default=None, alias="startedAt")
    resolved_at: Optional[datetime] = Field(default=None, alias="resolvedAt")

    class Config:
        populate_by_name = True

class Incident(IncidentBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.now, alias="createdAt")

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class InsertIncident(IncidentBase):
    pass

class StatusHistoryBase(BaseModel):
    service_id: str = Field(alias="serviceId")
    status: ServiceStatus
    timestamp: Optional[datetime] = None

    class Config:
        populate_by_name = True

class StatusHistory(StatusHistoryBase):
    id: str

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class InsertStatusHistory(StatusHistoryBase):
    pass

class ServerMetricsBase(BaseModel):
    service_id: str = Field(alias="serviceId")
    cpu_usage: float = Field(alias="cpuUsage")
    ram_usage: float = Field(alias="ramUsage")
    disk_usage: float = Field(alias="diskUsage")

    class Config:
        populate_by_name = True

class ServerMetrics(ServerMetricsBase):
    id: str
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class InsertServerMetrics(ServerMetricsBase):
    pass
