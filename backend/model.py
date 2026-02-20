"""
Database models for WiseBite
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

Base = declarative_base()


# SQLAlchemy ORM Models
class PantryItemDB(Base):
    __tablename__ = "pantry_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    expiry_date = Column(String, nullable=False)
    added_date = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProduceAnalysisDB(Base):
    __tablename__ = "produce_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String, nullable=False)
    produce_name = Column(String, nullable=False)
    ripeness = Column(String, nullable=False)
    estimated_days_left = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    analyzed_date = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# Pydantic Models for API
class PantryItemCreate(BaseModel):
    name: str
    category: str
    expiry_date: str
    added_date: str
    quantity: float
    unit: str
    image_url: Optional[str] = None
    barcode: Optional[str] = None


class PantryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None


class PantryItemResponse(BaseModel):
    id: int
    name: str
    category: str
    expiry_date: str
    added_date: str
    quantity: float
    unit: str
    image_url: Optional[str] = None
    barcode: Optional[str] = None

    class Config:
        from_attributes = True


class RecipeIngredient(BaseModel):
    name: str
    amount: str
    available: bool


class RecipeResponse(BaseModel):
    id: str
    title: str
    ingredients: List[RecipeIngredient]
    steps: List[str]
    prep_time: int
    cook_time: int
    servings: int
    priority_ingredients: List[str]
    missing_ingredients: List[str]


class RecipeRequest(BaseModel):
    dietary_preference: Optional[str] = "any"
    cuisine_type: Optional[str] = "any"
    max_recipes: Optional[int] = 3


class ProduceAnalysisResponse(BaseModel):
    id: int
    image_url: str
    produce_name: str
    ripeness: str
    estimated_days_left: int
    confidence: float
    analyzed_date: str

    class Config:
        from_attributes = True


class BarcodeResponse(BaseModel):
    barcode: str
    name: str
    category: str
    quantity: float
    unit: str
    found: bool
