#!/usr/bin/env python3
"""
Скрипт для импорта сервисов из текстового файла в базу данных приложения
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent / "server_py"))

from storage import storage
from models import InsertService

SERVICES_DATA = {
    "SSO Server": {
        "category": "Authentication",
        "type": "Keycloak",
        "description": "Single Sign-On Server",
        "icon": "shield"
    },
    "Wazuh Demo": {
        "category": "Security",
        "type": "SIEM",
        "description": "Wazuh Security Monitoring Demo",
        "icon": "shield"
    },
    "Stage Database": {
        "category": "Database",
        "type": "PSQL",
        "description": "Staging Environment Database",
        "icon": "database"
    },
    "Firezone VPN": {
        "category": "Network",
        "type": "VPN",
        "description": "Firezone VPN Gateway",
        "icon": "shield"
    },
    "IPSec Server": {
        "category": "Network",
        "type": "VPN",
        "description": "IPSec VPN Server",
        "icon": "lock"
    },
    "Central Proxy": {
        "category": "Network",
        "type": "Proxy",
        "description": "Central Reverse Proxy",
        "icon": "server"
    },
    "AI Project VM": {
        "category": "Compute",
        "type": "VM",
        "description": "AI Project Virtual Machine",
        "icon": "cpu"
    },
    "Demo DB CreditBroker": {
        "category": "Database",
        "type": "PSQL",
        "description": "CreditBroker Demo Database",
        "icon": "database"
    },
    "Production Database": {
        "category": "Database",
        "type": "PSQL",
        "description": "Production PostgreSQL Database",
        "icon": "database"
    },
    "GitLab VM": {
        "category": "DevTools",
        "type": "GitLab",
        "description": "GitLab Version Control Server",
        "icon": "git-branch"
    },
    "AI Test Environment": {
        "category": "Compute",
        "type": "VM",
        "description": "AI Testing Environment",
        "icon": "cpu"
    },
    "SIEM Server": {
        "category": "Security",
        "type": "SIEM",
        "description": "Security Information and Event Management",
        "icon": "shield"
    },
    "OPS Server": {
        "category": "Operations",
        "type": "Backend",
        "description": "Operations Management Server",
        "icon": "server"
    }
}

async def import_services_from_file(file_path: str):
    """Импорт сервисов из текстового файла"""
    print(f"📁 Читаем файл: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]
    
    # Подсчитываем уникальные сервисы
    unique_services = set(lines)
    print(f"✓ Найдено уникальных сервисов: {len(unique_services)}")
    print(f"✓ Всего записей: {len(lines)}")
    
    imported_count = 0
    
    for service_name in sorted(unique_services):
        service_info = SERVICES_DATA.get(service_name, {
            "category": "Other",
            "type": "Server",
            "description": service_name,
            "icon": "server"
        })
        
        service = InsertService(
            name=service_name,
            description=service_info.get("description", service_name),
            category=service_info.get("category", "Other"),
            region="Production",
            status="operational",
            type=service_info.get("type", "Server"),
            icon=service_info.get("icon", "server"),
            address=None,
            port=None
        )
        
        try:
            created_service = await storage.create_service(service)
            print(f"  ✓ Импортирован: {service_name} (ID: {created_service.id})")
            imported_count += 1
        except Exception as e:
            print(f"  ✗ Ошибка при импорте {service_name}: {e}")
    
    print(f"\n✅ Импорт завершен! Добавлено сервисов: {imported_count}")
    return imported_count

async def main():
    """Главная функция"""
    if len(sys.argv) < 2:
        print("❌ Использование: python import_services.py <путь_к_файлу>")
        print("\nПример:")
        print("  python import_services.py services.txt")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not Path(file_path).exists():
        print(f"❌ Файл не найден: {file_path}")
        sys.exit(1)
    
    print("🚀 Запуск импорта сервисов...")
    print(f"   Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    await storage.seed_data()
    await import_services_from_file(file_path)
    
    # Показываем статистику
    all_services = await storage.get_services()
    print(f"\n📊 Статистика:")
    print(f"   Всего сервисов в базе: {len(all_services)}")
    
    # Группировка по категориям
    categories = {}
    for service in all_services:
        categories[service.category] = categories.get(service.category, 0) + 1
    
    print(f"\n📋 Распределение по категориям:")
    for category, count in sorted(categories.items()):
        print(f"   {category}: {count}")

if __name__ == "__main__":
    asyncio.run(main())
