# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from brain import agent_chat

app = FastAPI()

# --- CORS SETUP ---
# This is crucial. It allows your VS Code Extension (which runs in a weird local browser environment)
# to talk to this Python server. Without this, the connection will be blocked.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_methods=["*"],  # Allows alsl methods
    allow_headers=["*"],  # Allows all headers
)

# --- DATA MODEL ---
# This defines the shape of the JSON we expect to receive
class ChatRequest(BaseModel):
    message: str

# --- THE ENDPOINT ---
@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    print(f"📥 Received: {request.message}") # Log to terminal for debugging
    
    # 1. Ask the Brain
    response_text = agent_chat(request.message)
    
    print(f"out 📤 Sending: {response_text[:50]}...") # Log first 50 chars of reply
    
    # 2. Return the answer
    return {"reply": response_text}

# --- HOW TO RUN ---
# Terminal command: uvicorn main:app --reload