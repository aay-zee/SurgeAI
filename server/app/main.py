# backend/app/main.py
from fastapi import FastAPI

# create the FastAPI instance
app = FastAPI(title="SurgeAI Backend")

# simple root route
@app.get("/")
def read_root():
    return {"message": "Hello from SurgeAI Backend!"}
