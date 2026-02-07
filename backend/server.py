from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import pyotp
import qrcode
import io
import base64
import hashlib
from cryptography.fernet import Fernet
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'gridlock-super-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_encryption_key(user_id: str, lock_code: str) -> bytes:
    combined = f"{user_id}:{lock_code}".encode()
    key = hashlib.sha256(combined).digest()
    return base64.urlsafe_b64encode(key)

def encrypt_data(data: str, key: bytes) -> str:
    f = Fernet(key)
    return f.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str, key: bytes) -> str:
    f = Fernet(key)
    return f.decrypt(encrypted_data.encode()).decode()

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class LockCodeSetup(BaseModel):
    lock_type: str  # "pin4", "pin6", "password"
    lock_code: str

class LockCodeVerify(BaseModel):
    lock_code: str

class TOTPAccountCreate(BaseModel):
    name: str
    secret: str
    issuer: Optional[str] = None

class TOTPAccountUpdate(BaseModel):
    name: Optional[str] = None
    issuer: Optional[str] = None

class PasswordEntryCreate(BaseModel):
    name: str
    username: str
    password: str
    url: Optional[str] = None
    notes: Optional[str] = None

class PasswordEntryUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    has_lock_code: bool
    lock_type: Optional[str] = None

class TOTPAccountResponse(BaseModel):
    id: str
    name: str
    issuer: str
    current_code: str
    next_code: str
    time_remaining: int
    created_at: str

class PasswordEntryResponse(BaseModel):
    id: str
    name: str
    username: str
    password: str
    url: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    
    user = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password": hashed_password,
        "has_lock_code": False,
        "lock_type": None,
        "lock_code_hash": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": UserResponse(
            id=user_id,
            email=data.email,
            name=data.name,
            has_lock_code=False,
            lock_type=None
        )
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    
    return {
        "token": token,
        "user": UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            has_lock_code=user.get("has_lock_code", False),
            lock_type=user.get("lock_type")
        )
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        has_lock_code=user.get("has_lock_code", False),
        lock_type=user.get("lock_type")
    )

@api_router.post("/lock/setup")
async def setup_lock_code(data: LockCodeSetup, user: dict = Depends(get_current_user)):
    if data.lock_type == "pin4" and (len(data.lock_code) != 4 or not data.lock_code.isdigit()):
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits")
    elif data.lock_type == "pin6" and (len(data.lock_code) != 6 or not data.lock_code.isdigit()):
        raise HTTPException(status_code=400, detail="PIN must be exactly 6 digits")
    elif data.lock_type == "password" and len(data.lock_code) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    lock_code_hash = bcrypt.hashpw(data.lock_code.encode(), bcrypt.gensalt()).decode()
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "has_lock_code": True,
            "lock_type": data.lock_type,
            "lock_code_hash": lock_code_hash
        }}
    )
    
    return {"message": "Lock code set successfully", "lock_type": data.lock_type}

@api_router.post("/lock/verify")
async def verify_lock_code(data: LockCodeVerify, user: dict = Depends(get_current_user)):
    if not user.get("has_lock_code"):
        raise HTTPException(status_code=400, detail="No lock code set")
    
    if not bcrypt.checkpw(data.lock_code.encode(), user["lock_code_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid lock code")
    
    return {"verified": True, "lock_type": user["lock_type"]}

@api_router.post("/totp/accounts")
async def create_totp_account(data: TOTPAccountCreate, user: dict = Depends(get_current_user)):
    # Validate the secret is valid base32
    secret = data.secret.upper().replace(" ", "")
    try:
        # Test if secret is valid by creating TOTP
        totp = pyotp.TOTP(secret)
        _ = totp.now()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid secret key. Must be a valid Base32 string.")
    
    account_id = str(uuid.uuid4())
    issuer = data.issuer if data.issuer else data.name.split("@")[0] if "@" in data.name else "GridLock"
    
    account = {
        "id": account_id,
        "user_id": user["id"],
        "name": data.name,
        "issuer": issuer,
        "secret": secret,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.totp_accounts.insert_one(account)
    
    time_remaining = 30 - (int(datetime.now(timezone.utc).timestamp()) % 30)
    
    return {
        "id": account_id,
        "name": data.name,
        "issuer": issuer,
        "secret": secret,
        "current_code": totp.now(),
        "next_code": totp.at(datetime.now(timezone.utc) + timedelta(seconds=30)),
        "time_remaining": time_remaining,
        "created_at": account["created_at"]
    }

@api_router.get("/totp/accounts")
async def get_totp_accounts(user: dict = Depends(get_current_user)):
    accounts = await db.totp_accounts.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    result = []
    for account in accounts:
        totp = pyotp.TOTP(account["secret"])
        time_remaining = 30 - (int(datetime.now(timezone.utc).timestamp()) % 30)
        result.append({
            "id": account["id"],
            "name": account["name"],
            "issuer": account["issuer"],
            "current_code": totp.now(),
            "next_code": totp.at(datetime.now(timezone.utc) + timedelta(seconds=30)),
            "time_remaining": time_remaining,
            "created_at": account["created_at"]
        })
    
    return result

@api_router.get("/totp/accounts/{account_id}")
async def get_totp_account(account_id: str, user: dict = Depends(get_current_user)):
    account = await db.totp_accounts.find_one(
        {"id": account_id, "user_id": user["id"]}, {"_id": 0}
    )
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    totp = pyotp.TOTP(account["secret"])
    time_remaining = 30 - (int(datetime.now(timezone.utc).timestamp()) % 30)
    
    return {
        "id": account["id"],
        "name": account["name"],
        "issuer": account["issuer"],
        "current_code": totp.now(),
        "next_code": totp.at(datetime.now(timezone.utc) + timedelta(seconds=30)),
        "time_remaining": time_remaining,
        "created_at": account["created_at"]
    }

@api_router.put("/totp/accounts/{account_id}")
async def update_totp_account(account_id: str, data: TOTPAccountUpdate, user: dict = Depends(get_current_user)):
    account = await db.totp_accounts.find_one({"id": account_id, "user_id": user["id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.totp_accounts.update_one({"id": account_id}, {"$set": update_data})
    
    return {"message": "Account updated successfully"}

@api_router.delete("/totp/accounts/{account_id}")
async def delete_totp_account(account_id: str, user: dict = Depends(get_current_user)):
    result = await db.totp_accounts.delete_one({"id": account_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted successfully"}

@api_router.get("/totp/accounts/{account_id}/qr")
async def get_totp_qr(account_id: str, user: dict = Depends(get_current_user)):
    account = await db.totp_accounts.find_one(
        {"id": account_id, "user_id": user["id"]}, {"_id": 0}
    )
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    totp = pyotp.TOTP(account["secret"])
    uri = totp.provisioning_uri(name=account["name"], issuer_name=account["issuer"])
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="image/png")

@api_router.post("/totp/parse-qr")
async def parse_totp_qr(data: dict, user: dict = Depends(get_current_user)):
    uri = data.get("uri", "")
    
    if not uri.startswith("otpauth://totp/"):
        raise HTTPException(status_code=400, detail="Invalid TOTP URI")
    
    try:
        parts = uri.replace("otpauth://totp/", "").split("?")
        name_part = parts[0]
        params = dict(p.split("=") for p in parts[1].split("&")) if len(parts) > 1 else {}
        
        if ":" in name_part:
            issuer, name = name_part.split(":", 1)
        else:
            name = name_part
            issuer = params.get("issuer", "Unknown")
        
        from urllib.parse import unquote
        name = unquote(name)
        issuer = unquote(issuer)
        secret = params.get("secret", "")
        
        if not secret:
            raise HTTPException(status_code=400, detail="No secret found in URI")
        
        return {"name": name, "issuer": issuer, "secret": secret}
    except Exception as e:
        logger.error(f"Error parsing TOTP URI: {e}")
        raise HTTPException(status_code=400, detail="Failed to parse TOTP URI")

@api_router.post("/vault/entries")
async def create_password_entry(data: PasswordEntryCreate, user: dict = Depends(get_current_user)):
    entry_id = str(uuid.uuid4())
    
    entry = {
        "id": entry_id,
        "user_id": user["id"],
        "name": data.name,
        "username": data.username,
        "password": data.password,
        "url": data.url,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.password_vault.insert_one(entry)
    
    return PasswordEntryResponse(
        id=entry_id,
        name=data.name,
        username=data.username,
        password=data.password,
        url=data.url,
        notes=data.notes,
        created_at=entry["created_at"]
    )

@api_router.get("/vault/entries")
async def get_password_entries(user: dict = Depends(get_current_user)):
    entries = await db.password_vault.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return [PasswordEntryResponse(**{k: v for k, v in entry.items() if k != "user_id"}) for entry in entries]

@api_router.get("/vault/entries/{entry_id}")
async def get_password_entry(entry_id: str, user: dict = Depends(get_current_user)):
    entry = await db.password_vault.find_one({"id": entry_id, "user_id": user["id"]}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return PasswordEntryResponse(**{k: v for k, v in entry.items() if k != "user_id"})

@api_router.put("/vault/entries/{entry_id}")
async def update_password_entry(entry_id: str, data: PasswordEntryUpdate, user: dict = Depends(get_current_user)):
    entry = await db.password_vault.find_one({"id": entry_id, "user_id": user["id"]})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.password_vault.update_one({"id": entry_id}, {"$set": update_data})
    
    return {"message": "Entry updated successfully"}

@api_router.delete("/vault/entries/{entry_id}")
async def delete_password_entry(entry_id: str, user: dict = Depends(get_current_user)):
    result = await db.password_vault.delete_one({"id": entry_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted successfully"}

@api_router.get("/export/all")
async def export_all_data(user: dict = Depends(get_current_user)):
    totp_accounts = await db.totp_accounts.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).to_list(1000)
    password_entries = await db.password_vault.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).to_list(1000)
    
    export_data = {
        "totp_accounts": totp_accounts,
        "password_entries": password_entries,
        "exported_at": datetime.now(timezone.utc).isoformat()
    }
    
    return export_data

@api_router.get("/")
async def root():
    return {"message": "GridLock API - Secure Your Digital Soul"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
