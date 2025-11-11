"""
Конфигурация приложения
Централизованное управление настройками и переменными окружения
"""
import os
from typing import Optional


class Config:
    """Класс для управления конфигурацией приложения"""
    
    # Настройки сервера
    PORT: int = int(os.getenv("PORT", "5000"))
    HOST: str = os.getenv("HOST", "127.0.0.1")
    ENV: str = os.getenv("NODE_ENV", "production")
    
    # Аутентификация админки
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "root")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "72416810")
    
    # Интеграции
    METRICS_API_URL: Optional[str] = os.getenv("METRICS_API_URL")
    GRAFANA_URL: Optional[str] = os.getenv("GRAFANA_URL")
    GRAFANA_API_TOKEN: Optional[str] = os.getenv("GRAFANA_API_TOKEN")
    
    @classmethod
    def is_development(cls) -> bool:
        """Проверка режима разработки"""
        return cls.ENV == "development"
    
    @classmethod
    def is_production(cls) -> bool:
        """Проверка продакшн режима"""
        return cls.ENV == "production"


config = Config()
