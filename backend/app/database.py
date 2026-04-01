"""
Database setup — Appwrite Configuration.
"""

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.users import Users
from appwrite.id import ID

from app.config import settings

def get_appwrite_client():
    client = Client()
    client.set_endpoint(settings.APPWRITE_ENDPOINT)
    client.set_project(settings.APPWRITE_PROJECT_ID)
    if settings.APPWRITE_API_KEY:
        client.set_key(settings.APPWRITE_API_KEY)
    return client

def get_db():
    """Dependency that provides the Appwrite Databases service."""
    client = get_appwrite_client()
    return Databases(client)

def get_users_service():
    client = get_appwrite_client()
    return Users(client)

def generate_id():
    """Helper to generate unique IDs for Appwrite documents."""
    return ID.unique()