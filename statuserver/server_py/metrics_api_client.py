import httpx
import os
from typing import List, Optional, Dict, Any
from datetime import datetime
from models import Service, InsertService, ServiceStatus

class MetricsAPIClient:
    """Клиент для работы с Monitoring API (Prometheus + Loki)"""
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.getenv('METRICS_API_URL', 'http://10.183.45.198:8000')
        self.timeout = 30.0
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
    
    async def get_all_servers_metrics(self) -> List[Dict[str, Any]]:
        """Получить метрики для всех серверов из /metrics/servers/all"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/metrics/servers/all")
                
                if response.status_code != 200:
                    print(f"Ошибка получения метрик: HTTP {response.status_code}")
                    return []
                    
                data = response.json()
                print(f"✓ Получено метрик для {len(data)} серверов")
                return data
        except Exception as e:
            print(f"Ошибка при получении метрик серверов: {e}")
            return []
    
    async def get_servers_status(self) -> Dict[str, Any]:
        """Получить статус всех серверов из /metrics/servers"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/metrics/servers")
                
                if response.status_code != 200:
                    print(f"Ошибка получения статуса серверов: HTTP {response.status_code}")
                    return {"servers": [], "total_count": 0}
                    
                return response.json()
        except Exception as e:
            print(f"Ошибка при получении статуса серверов: {e}")
            return {"servers": [], "total_count": 0}
    
    async def get_cpu_usage(self) -> List[Dict[str, Any]]:
        """Получить использование CPU всех серверов"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/metrics/cpu/usage")
                
                if response.status_code != 200:
                    return []
                    
                data = response.json()
                return data.get('data', []) if isinstance(data, dict) else []
        except Exception as e:
            print(f"Ошибка при получении CPU метрик: {e}")
            return []
    
    async def get_memory_usage(self) -> List[Dict[str, Any]]:
        """Получить использование памяти всех серверов"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/metrics/memory/usage")
                
                if response.status_code != 200:
                    return []
                    
                data = response.json()
                return data.get('data', []) if isinstance(data, dict) else []
        except Exception as e:
            print(f"Ошибка при получении Memory метрик: {e}")
            return []
    
    def _determine_service_status(self, metrics: Dict[str, Any]) -> ServiceStatus:
        """Определить статус сервиса на основе метрик"""
        cpu_usage = metrics.get('cpu_usage', 0)
        memory_usage = metrics.get('memory_usage', 0)
        disk_usage = metrics.get('disk_usage', 0)
        
        # Если метрики недоступны (все нули), сервис не отвечает
        if cpu_usage == 0 and memory_usage == 0:
            return "down"
        
        # Критические значения - деградация
        if cpu_usage > 90 or memory_usage > 90 or disk_usage > 90:
            return "degraded"
        
        # Предупреждения
        if cpu_usage > 80 or memory_usage > 80 or disk_usage > 85:
            return "maintenance"
        
        # Все хорошо
        return "operational"
    
    def _map_server_name_to_category(self, server_name: str) -> str:
        """Определить категорию сервиса по имени"""
        name_lower = server_name.lower()
        
        if 'database' in name_lower or 'db' in name_lower:
            return "Database"
        elif 'sso' in name_lower or 'auth' in name_lower:
            return "Authentication"
        elif 'vpn' in name_lower or 'ipsec' in name_lower or 'firezone' in name_lower:
            return "Network"
        elif 'gitlab' in name_lower or 'git' in name_lower:
            return "DevTools"
        elif 'siem' in name_lower or 'wazuh' in name_lower:
            return "Security"
        elif 'ai' in name_lower:
            return "Compute"
        elif 'ops' in name_lower:
            return "Operations"
        elif 'proxy' in name_lower:
            return "Network"
        else:
            return "Infrastructure"
    
    def _get_icon_for_category(self, category: str) -> str:
        """Получить иконку для категории"""
        icons = {
            "Database": "database",
            "Authentication": "shield",
            "Network": "globe",
            "DevTools": "git-branch",
            "Security": "shield",
            "Compute": "cpu",
            "Operations": "server",
            "Infrastructure": "server"
        }
        return icons.get(category, "server")
    
    async def convert_metrics_to_services(self, metrics_data: List[Dict[str, Any]]) -> tuple[List[Service], List[Dict[str, Any]]]:
        """Конвертировать метрики серверов в формат Service"""
        services = []
        metrics_list = []
        
        for metrics in metrics_data:
            server_name = metrics.get('server_name', 'Unknown Server')
            service_id = f"srv-{server_name.lower().replace(' ', '-')}"
            
            # Определяем статус на основе метрик
            status = self._determine_service_status(metrics)
            
            # Определяем категорию
            category = self._map_server_name_to_category(server_name)
            
            # Создаем сервис
            service = Service(
                id=service_id,
                name=server_name,
                description=f"{server_name} - CPU: {metrics.get('cpu_usage', 0):.1f}%, RAM: {metrics.get('memory_usage', 0):.1f}%, Disk: {metrics.get('disk_usage', 0):.1f}%",
                category=category,
                region="Production",
                status=status,
                type="Server",
                icon=self._get_icon_for_category(category),
                address=None,
                port=None,
                updated_at=datetime.fromisoformat(metrics['timestamp']) if 'timestamp' in metrics else datetime.now()
            )
            services.append(service)
            
            # Сохраняем метрики отдельно
            metrics_list.append({
                'service_id': service_id,
                'cpu_usage': metrics.get('cpu_usage', 0),
                'memory_usage': metrics.get('memory_usage', 0),
                'disk_usage': metrics.get('disk_usage', 0),
                'timestamp': metrics.get('timestamp', datetime.now().isoformat())
            })
        
        return services, metrics_list
    
    async def sync_services_from_api(self) -> tuple[List[Service], List[Dict[str, Any]]]:
        """Синхронизация сервисов из Monitoring API"""
        print("🔄 Синхронизация с Monitoring API...")
        
        # Получаем метрики всех серверов
        metrics_data = await self.get_all_servers_metrics()
        
        if not metrics_data:
            print("⚠️  Нет данных от Monitoring API")
            return [], []
        
        # Конвертируем в формат Service
        services, metrics_list = await self.convert_metrics_to_services(metrics_data)
        
        print(f"✓ Синхронизировано {len(services)} сервисов и {len(metrics_list)} метрик")
        return services, metrics_list


# Создаем глобальный экземпляр клиента
metrics_client = MetricsAPIClient()
