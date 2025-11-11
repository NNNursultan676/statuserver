from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets
from config import config

security = HTTPBasic()

def verify_admin_credentials(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    """Проверка учетных данных администратора"""
    is_correct_username = secrets.compare_digest(credentials.username, config.ADMIN_USERNAME)
    is_correct_password = secrets.compare_digest(credentials.password, config.ADMIN_PASSWORD)
    
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    return credentials.username

# Middleware для защиты админских endpoints
def require_admin(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    """Декоратор для защиты админских роутов"""
    return verify_admin_credentials(credentials)
