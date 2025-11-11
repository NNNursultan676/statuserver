"""
Постоянное хранилище данных с использованием SQLite/PostgreSQL
"""
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path
import sqlite3
import json

from models import (
    Service, InsertService,
    Incident, InsertIncident,
    StatusHistory, InsertStatusHistory,
    ServerMetrics, InsertServerMetrics,
    ServiceStatus
)


class DatabaseStorage:
    """Хранилище с использованием SQLite для персистентности"""
    
    def __init__(self, db_path: str = "data/services.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _get_connection(self):
        """Получить подключение к БД"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_db(self):
        """Инициализация таблиц БД"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Таблица сервисов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS services (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                region TEXT NOT NULL,
                status TEXT NOT NULL,
                type TEXT,
                icon TEXT,
                address TEXT,
                port INTEGER,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Таблица инцидентов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                service_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                severity TEXT NOT NULL,
                started_at TEXT NOT NULL,
                resolved_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (service_id) REFERENCES services(id)
            )
        """)
        
        # Таблица истории статусов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS status_history (
                id TEXT PRIMARY KEY,
                service_id TEXT NOT NULL,
                status TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (service_id) REFERENCES services(id)
            )
        """)
        
        # Таблица метрик
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS server_metrics (
                id TEXT PRIMARY KEY,
                service_id TEXT NOT NULL,
                cpu_usage REAL,
                ram_usage REAL,
                disk_usage REAL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (service_id) REFERENCES services(id)
            )
        """)
        
        # Индексы
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_services_status ON services(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_services_category ON services(category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_service ON status_history(service_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_service ON server_metrics(service_id)")
        
        conn.commit()
        conn.close()
    
    async def seed_data(self):
        """Начальные данные (опционально)"""
        pass
    
    def _generate_deterministic_id(self, service: InsertService) -> str:
        """Генерация детерминированного ID"""
        key = f"{service.name}-{service.region}-{service.category}-{service.address or ''}-{service.port or ''}"
        hash_val = 0
        for char in key:
            hash_val = ((hash_val << 5) - hash_val) + ord(char)
            hash_val = hash_val & 0xFFFFFFFF
        
        hash_str = format(abs(hash_val), '030x')
        return f"{hash_str[0:8]}-{hash_str[8:12]}-4{hash_str[12:15]}-a{hash_str[15:18]}-{hash_str[18:30]}"
    
    async def get_services(self) -> List[Service]:
        """Получить все сервисы"""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM services ORDER BY name")
        rows = cursor.fetchall()
        conn.close()
        
        services = []
        for row in rows:
            services.append(Service(
                id=row["id"],
                name=row["name"],
                description=row["description"],
                category=row["category"],
                region=row["region"],
                status=row["status"],
                type=row["type"],
                icon=row["icon"],
                address=row["address"],
                port=row["port"],
                updated_at=datetime.fromisoformat(row["updated_at"])
            ))
        return services
    
    async def get_service(self, service_id: str) -> Optional[Service]:
        """Получить сервис по ID"""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM services WHERE id = ?", (service_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return Service(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            category=row["category"],
            region=row["region"],
            status=row["status"],
            type=row["type"],
            icon=row["icon"],
            address=row["address"],
            port=row["port"],
            updated_at=datetime.fromisoformat(row["updated_at"])
        )
    
    async def create_service(self, insert_service: InsertService) -> Service:
        """Создать сервис"""
        service_id = self._generate_deterministic_id(insert_service)
        updated_at = datetime.now()
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Проверяем, существует ли сервис
        cursor.execute("SELECT id FROM services WHERE id = ?", (service_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Обновляем существующий
            cursor.execute("""
                UPDATE services SET
                    name = ?, description = ?, category = ?, region = ?,
                    status = ?, type = ?, icon = ?, address = ?, port = ?,
                    updated_at = ?
                WHERE id = ?
            """, (
                insert_service.name, insert_service.description,
                insert_service.category, insert_service.region,
                insert_service.status or "operational",
                insert_service.type, insert_service.icon,
                insert_service.address, insert_service.port,
                updated_at.isoformat(), service_id
            ))
        else:
            # Создаем новый
            cursor.execute("""
                INSERT INTO services (
                    id, name, description, category, region, status,
                    type, icon, address, port, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                service_id, insert_service.name, insert_service.description,
                insert_service.category, insert_service.region,
                insert_service.status or "operational",
                insert_service.type, insert_service.icon,
                insert_service.address, insert_service.port,
                updated_at.isoformat()
            ))
        
        conn.commit()
        conn.close()
        
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
            updated_at=updated_at
        )
        
        await self.create_status_history(InsertStatusHistory(
            service_id=service_id,
            status=service.status,
            timestamp=updated_at
        ))
        
        return service
    
    async def update_service_status(self, service_id: str, status: ServiceStatus) -> Optional[Service]:
        """Обновить статус сервиса"""
        updated_at = datetime.now()
        
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE services SET status = ?, updated_at = ?
            WHERE id = ?
        """, (status, updated_at.isoformat(), service_id))
        
        if cursor.rowcount == 0:
            conn.close()
            return None
        
        conn.commit()
        conn.close()
        
        await self.create_status_history(InsertStatusHistory(
            service_id=service_id,
            status=status,
            timestamp=updated_at
        ))
        
        return await self.get_service(service_id)
    
    async def get_incidents(self) -> List[Incident]:
        """Получить все инциденты"""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        incidents = []
        for row in rows:
            incidents.append(Incident(
                id=row["id"],
                service_id=row["service_id"],
                title=row["title"],
                description=row["description"],
                status=row["status"],
                severity=row["severity"],
                started_at=datetime.fromisoformat(row["started_at"]),
                resolved_at=datetime.fromisoformat(row["resolved_at"]) if row["resolved_at"] else None,
                created_at=datetime.fromisoformat(row["created_at"])
            ))
        return incidents
    
    async def get_incident(self, incident_id: str) -> Optional[Incident]:
        """Получить инцидент по ID"""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return Incident(
            id=row["id"],
            service_id=row["service_id"],
            title=row["title"],
            description=row["description"],
            status=row["status"],
            severity=row["severity"],
            started_at=datetime.fromisoformat(row["started_at"]),
            resolved_at=datetime.fromisoformat(row["resolved_at"]) if row["resolved_at"] else None,
            created_at=datetime.fromisoformat(row["created_at"])
        )
    
    async def create_incident(self, insert_incident: InsertIncident) -> Incident:
        """Создать инцидент"""
        incident_id = str(uuid.uuid4())
        created_at = datetime.now()
        started_at = insert_incident.started_at or created_at
        
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO incidents (
                id, service_id, title, description, status, severity,
                started_at, resolved_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            incident_id, insert_incident.service_id, insert_incident.title,
            insert_incident.description, insert_incident.status,
            insert_incident.severity, started_at.isoformat(),
            insert_incident.resolved_at.isoformat() if insert_incident.resolved_at else None,
            created_at.isoformat()
        ))
        conn.commit()
        conn.close()
        
        return Incident(
            id=incident_id,
            service_id=insert_incident.service_id,
            title=insert_incident.title,
            description=insert_incident.description,
            status=insert_incident.status,
            severity=insert_incident.severity,
            started_at=started_at,
            resolved_at=insert_incident.resolved_at,
            created_at=created_at
        )
    
    async def get_status_history(self, service_id: str) -> List[StatusHistory]:
        """Получить историю статусов"""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM status_history
            WHERE service_id = ?
            ORDER BY timestamp DESC
        """, (service_id,))
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            history.append(StatusHistory(
                id=row["id"],
                service_id=row["service_id"],
                status=row["status"],
                timestamp=datetime.fromisoformat(row["timestamp"])
            ))
        return history
    
    async def create_status_history(self, insert_history: InsertStatusHistory) -> StatusHistory:
        """Создать запись истории статуса"""
        history_id = str(uuid.uuid4())
        timestamp = insert_history.timestamp or datetime.now()
        
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO status_history (id, service_id, status, timestamp)
            VALUES (?, ?, ?, ?)
        """, (history_id, insert_history.service_id, insert_history.status, timestamp.isoformat()))
        conn.commit()
        conn.close()
        
        return StatusHistory(
            id=history_id,
            service_id=insert_history.service_id,
            status=insert_history.status,
            timestamp=timestamp
        )
    
    async def get_server_metrics(self, service_id: Optional[str] = None) -> List[ServerMetrics]:
        """Получить метрики серверов"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        if service_id:
            cursor.execute("""
                SELECT * FROM server_metrics
                WHERE service_id = ?
                ORDER BY timestamp DESC
            """, (service_id,))
        else:
            cursor.execute("SELECT * FROM server_metrics ORDER BY timestamp DESC")
        
        rows = cursor.fetchall()
        conn.close()
        
        metrics = []
        for row in rows:
            metrics.append(ServerMetrics(
                id=row["id"],
                service_id=row["service_id"],
                cpu_usage=row["cpu_usage"],
                ram_usage=row["ram_usage"],
                disk_usage=row["disk_usage"],
                timestamp=datetime.fromisoformat(row["timestamp"])
            ))
        return metrics
    
    async def create_server_metrics(self, insert_metrics: InsertServerMetrics) -> ServerMetrics:
        """Создать запись метрик"""
        metrics_id = str(uuid.uuid4())
        timestamp = datetime.now()
        
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO server_metrics (
                id, service_id, cpu_usage, ram_usage, disk_usage, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            metrics_id, insert_metrics.service_id,
            insert_metrics.cpu_usage, insert_metrics.ram_usage,
            insert_metrics.disk_usage, timestamp.isoformat()
        ))
        conn.commit()
        conn.close()
        
        return ServerMetrics(
            id=metrics_id,
            service_id=insert_metrics.service_id,
            cpu_usage=insert_metrics.cpu_usage,
            ram_usage=insert_metrics.ram_usage,
            disk_usage=insert_metrics.disk_usage,
            timestamp=timestamp
        )


# Выбор хранилища на основе переменной окружения
def get_storage():
    """Получить экземпляр хранилища"""
    storage_type = os.getenv("STORAGE_TYPE", "database")
    
    if storage_type == "memory":
        from storage import MemStorage
        return MemStorage()
    else:
        db_path = os.getenv("DATABASE_PATH", "data/services.db")
        return DatabaseStorage(db_path)


# Глобальный экземпляр хранилища
storage = get_storage()
