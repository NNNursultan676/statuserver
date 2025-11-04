from typing import Dict, List, Any
from models import InsertService

def get_icon_for_type(service_type: str) -> str:
    type_map = {
        'DevTools': 'wrench',
        'Backend': 'server',
        'Frontend': 'globe',
        'BPMN': 'workflow',
        'PSQL': 'database',
        'Database': 'database',
        'Keycloak': 'shield',
        'Grafana': 'chart',
        'Kafka': 'message-square',
        'Minio': 'database',
        'Redis': 'database',
        'RabbitMQ': 'message-square',
    }
    return type_map.get(service_type, 'server')

async def import_services_from_data(storage, data: Dict[str, Dict[str, List[Dict[str, Any]]]]) -> int:
    services: List[InsertService] = []
    
    for environment in data.keys():
        for category in data[environment].keys():
            items = data[environment][category]
            
            for item in items:
                service = InsertService(
                    name=item.get('Name', ''),
                    description=f"{item.get('Type', '')} service",
                    category=category,
                    region=environment,
                    status="operational",
                    type=item.get('Type'),
                    icon=get_icon_for_type(item.get('Type', '')),
                    address=item.get('Address'),
                    port=item.get('Port')
                )
                services.append(service)
    
    for service in services:
        await storage.create_service(service)
    
    return len(services)
