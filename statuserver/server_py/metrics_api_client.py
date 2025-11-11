import httpx
import os
from typing import List, Optional, Dict, Any
from datetime import datetime
from models import Service, InsertService, ServiceStatus

class MetricsAPIClient:
    """Клиент для работы с внешним API метрик"""
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.getenv('METRICS_API_URL', 'http://localhost:8000')
        self.timeout = 10.0
        self.is_available = False
        
    async def check_availability(self) -> bool:
        """Проверка доступности API"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/metrics/available")
                self.is_available = response.status_code == 200
                return self.is_available
        except Exception as e:
            print(f"Metrics API недоступен: {e}")
            self.is_available = False
            return False
    
    async def get_all_servers(self) -> List[Dict[str, Any]]:
        """Получить список всех серверов из API метрик"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/metrics/servers")
                
                if response.status_code != 200:
                    return []
                    
                return response.json()
        except Exception as e:
            print(f"Ошибка при получении серверов: {e}")
            return []
    
    async def get_server_metrics(self, server_name: str) -> Optional[Dict[str, Any]]:
        """Получить метрики конкретного сервера"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/metrics/servers/{server_name}")
                
                if response.status_code != 200:
                    return None
                    
                return response.json()
        except Exception as e:
            print(f"Ошибка при получении метрик сервера {server_name}: {e}")
            return None
    
    async def get_server_cpu_usage(self, server_name: str) -> Optional[float]:
        """Получить использование CPU сервера"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/metrics/servers/{server_name}/cpu")
                
                if response.status_code != 200:
                    return None
                    
                data = response.json()
                return data.get('usage', 0.0)
        except Exception as e:
            print(f"Ошибка при получении CPU для {server_name}: {e}")
            return None
    
    async def get_server_memory_usage(self, server_name: str) -> Optional[float]:
        """Получить использование памяти сервера"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/metrics/servers/{server_name}/memory")
                
                if response.status_code != 200:
                    return None
                    
                data = response.json()
                return data.get('usage', 0.0)
        except Exception as e:
            print(f"Ошибка при получении памяти для {server_name}: {e}")
            return None
    
    def _convert_to_service_status(self, metric_value: Optional[float]) -> ServiceStatus:
        """Конвертировать значение метрики в статус сервиса"""
        if metric_value is None:
            return "down"
        
        # up{} метрика: 1 = работает, 0 = не работает
        if metric_value == 1.0:
            return "operational"
        elif metric_value == 0.0:
            return "down"
        else:
            return "degraded"
    
    async def convert_servers_to_services(self, servers: List[Dict[str, Any]]) -> List[Service]:
        """Конвертировать данные серверов из API в формат Service"""
        services = []
        
        for server in servers:
            # Получаем метрики сервера для определения статуса
            server_name = server.get('name', server.get('instance', 'unknown'))
            metrics = await self.get_server_metrics(server_name)
            
            # Определяем статус
            status: ServiceStatus = "loading"
            if metrics:
                up_value = metrics.get('up', metrics.get('status'))
                status = self._convert_to_service_status(up_value)
            
            # Парсим address и port
            instance = server.get('instance', '')
            address = instance.split(':')[0] if ':' in instance else instance
            port = None
            if ':' in instance:
                try:
                    port = int(instance.split(':')[1])
                except:
                    pass
            
            service = Service(
                id=server.get('id', f"srv-{server_name}"),
                name=server_name,
                description=server.get('description', f'Сервер {server_name}'),
                category=server.get('job', server.get('category', 'Server')),
                region=server.get('region', server.get('environment', 'Production')),
                status=status,
                type=server.get('type', 'Backend'),
                icon=server.get('icon'),
                address=address or server.get('address'),
                port=port or server.get('port'),
                updated_at=datetime.now()
            )
            services.append(service)
        
        return services

# Создаем глобальный экземпляр клиента
metrics_client = MetricsAPIClient()
