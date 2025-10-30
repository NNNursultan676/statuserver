import os
import httpx
from typing import Dict, List, Any, Optional
from models import ServiceStatus

class GrafanaService:
    def __init__(self, storage):
        self.grafana_url = os.getenv('GRAFANA_URL', '')
        self.api_token = os.getenv('GRAFANA_API_TOKEN', '')
        self.dashboard_id = os.getenv('GRAFANA_DASHBOARD_ID', '')
        self.storage = storage
        
        if not self.grafana_url or not self.api_token:
            print("Grafana configuration is incomplete. Syncing will be disabled.")
    
    async def fetch_metrics(self, query: str = 'up{job="node_exporter"}') -> List[Dict[str, Any]]:
        if not self.grafana_url or not self.api_token:
            raise Exception("Grafana is not configured")
        
        base_url = f"{self.grafana_url}/api/datasources/proxy/1/api/v1/query"
        url = f"{base_url}?query={query}"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    url,
                    headers={
                        'Authorization': f'Bearer {self.api_token}',
                        'Content-Type': 'application/json',
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"Grafana API error: {response.status_code} {response.text}")
                
                data = response.json()
                
                if data.get('status') != 'success':
                    raise Exception(f"Grafana query failed: {data.get('status')}")
                
                return data.get('data', {}).get('result', [])
        except Exception as error:
            print(f"Failed to fetch Grafana metrics: {error}")
            raise error
    
    async def sync_service_statuses(self) -> Dict[str, Any]:
        updated = 0
        errors = 0
        
        try:
            metrics = await self.fetch_metrics()
            services = await self.storage.get_services()
            
            for metric in metrics:
                instance = metric.get('metric', {}).get('instance', '')
                is_up = metric.get('value', [None, '0'])[1] == '1'
                new_status: ServiceStatus = 'operational' if is_up else 'down'
                
                matching_services = []
                for service in services:
                    if not service.address:
                        continue
                    
                    service_address = f"{service.address}:{service.port}" if service.port else service.address
                    
                    if (instance and service.address and service.address in instance) or \
                       instance == service_address or \
                       (service.name and instance and service.name.lower() in instance.lower()) or \
                       (instance and service.name and instance.lower() in service.name.lower()):
                        matching_services.append(service)
                
                for service in matching_services:
                    if service.status != new_status:
                        try:
                            await self.storage.update_service_status(service.id, new_status)
                            updated += 1
                            print(f"Updated {service.name}: {service.status} -> {new_status}")
                        except Exception as err:
                            print(f"Failed to update service {service.id}: {err}")
                            errors += 1
            
            print(f"Grafana sync completed: {updated} updated, {errors} errors")
            return {'updated': updated, 'errors': errors}
        except Exception as error:
            print(f"Grafana sync failed - setting all services to loading state: {error}")
            
            services = await self.storage.get_services()
            loading_count = 0
            
            for service in services:
                if service.status != 'loading':
                    try:
                        await self.storage.update_service_status(service.id, 'loading')
                        loading_count += 1
                    except Exception as err:
                        print(f"Failed to set loading status for {service.id}: {err}")
            
            print(f"Set {loading_count} services to loading state due to Grafana unavailability")
            return {'updated': loading_count, 'errors': 0, 'skipped': True}
    
    def is_configured(self) -> bool:
        return bool(self.grafana_url and self.api_token)

def create_grafana_service(storage):
    return GrafanaService(storage)
