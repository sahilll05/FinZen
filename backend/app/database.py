"""
Database setup — Appwrite Configuration.
"""

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.users import Users
from sqlalchemy.ext.declarative import declarative_base

from app.config import settings

Base = declarative_base()

def get_appwrite_client():
    client = Client()
    client.set_endpoint(settings.APPWRITE_ENDPOINT)
    client.set_project(settings.APPWRITE_PROJECT_ID)
    if settings.APPWRITE_API_KEY:
        client.set_key(settings.APPWRITE_API_KEY)
    return client

def get_db():
    client = get_appwrite_client()
    db = Databases(client)
    try:
        yield db
    finally:
        pass

def get_users_service():
    client = get_appwrite_client()
    return Users(client)