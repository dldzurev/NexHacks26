from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse  # <--- ADD THIS IMPORT
from pydantic import BaseModel
from brain import agent_chat

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    print(f"📥 Received: {request.message}")
    
    # CHANGE: Return StreamingResponse immediately. 
    # Do not capture response_text in a variable first.
    return StreamingResponse(agent_chat(request.message), media_type="text/plain")