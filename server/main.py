import os
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, Dict
from dotenv import load_dotenv
import uvicorn

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable not set")

client = None
db = None
collection = None

@app.on_event("startup")
async def startup_db_client():
    global client, db, collection
    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        await client.admin.command("ping")
    except Exception as e:
        raise RuntimeError(f"Unable to connect to MongoDB: {e}")
    db = client["sheets"]
    collection = db["375"]

@app.on_event("shutdown")
async def shutdown_db_client():
    global client
    if client:
        client.close()
        client = None

class ToggleRequest(BaseModel):
    problem_id: int
    status: bool

def update_nested_problem(data: Dict, target_id: int, new_status: bool, date_str: Optional[str]) -> bool:
    for category_key in data:
        if isinstance(data[category_key], list):
            for pattern_obj in data[category_key]:
                if isinstance(pattern_obj, dict) and "problems" in pattern_obj:
                    for problem in pattern_obj["problems"]:
                        if problem.get("id") == target_id:
                            problem["completed"] = new_status
                            if new_status:
                                if not problem.get("completed_at"):
                                    problem["completed_at"] = date_str
                            else:
                                problem["completed_at"] = None
                            return True
    return False
