import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-super-secret-jwt-key-for-testing")
    JWT_ACCESS_TOKEN_EXPIRES = 3600 * 8  # 8 hours
    JWT_REFRESH_TOKEN_EXPIRES = 3600 * 24 * 30  # 30 days
    
    # Redis Configuration
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
    REDIS_DB = int(os.getenv("REDIS_DB", 0))
    
    # Tesla Fleet API Configuration
    TESLA_CLIENT_ID = os.getenv("TESLA_CLIENT_ID", "your_tesla_client_id")
    TESLA_CLIENT_SECRET = os.getenv("TESLA_CLIENT_SECRET", "your_tesla_client_secret")
    
    # Tesla Vehicle Command Configuration
    TESLA_KEY_NAME = os.getenv("TESLA_KEY_NAME", "rentesla_dev")
    TESLA_TOKEN_NAME = os.getenv("TESLA_TOKEN_NAME", "rentesla_dev")
    TESLA_CACHE_FILE = os.getenv("TESLA_CACHE_FILE", "/tmp/tesla_cache.json")
    
    # API Configuration
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", 5000))
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    
    # Test Mode Configuration
    TEST_MODE = os.getenv("TEST_MODE", "True").lower() == "true"
    MOCK_TESLA_API = os.getenv("MOCK_TESLA_API", "True").lower() == "true"
    
    # Fleet API URLs
    TESLA_AUTH_URL = "https://auth.tesla.com/oauth2/v3/token"
    TESLA_FLEET_API_BASE = "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1"
    
    @staticmethod
    def validate_config():
        """Validate required configuration variables"""
        required_vars = []
        
        if not Config.TEST_MODE:
            required_vars.extend([
                ("TESLA_CLIENT_ID", Config.TESLA_CLIENT_ID),
                ("TESLA_CLIENT_SECRET", Config.TESLA_CLIENT_SECRET)
            ])
        
        missing_vars = [var_name for var_name, var_value in required_vars 
                       if not var_value or var_value.startswith("your_")]
        
        if missing_vars:
            raise ValueError(f"Missing required configuration: {', '.join(missing_vars)}")
        
        return True 