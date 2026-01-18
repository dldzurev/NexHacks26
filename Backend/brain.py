'''
import os
import warnings
import google.generativeai as genai
from dotenv import load_dotenv

# --- TOOL IMPORTS ---
from tools_files import file_tools
from tools_jira import jira_tools
# from tools_slack import slack_tools 

warnings.filterwarnings("ignore", category=FutureWarning)
load_dotenv()

# 1. CONFIGURE API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file.")
genai.configure(api_key=api_key)

# 2. COMBINE TOOLS
all_tools = file_tools + jira_tools 

# 3. INITIALIZE MODEL
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash-001", # switched to stable flash version
    tools=all_tools
)
# 4. INITIALIZE CHAT SESSION (GLOBAL MEMORY)
# We start it here so it persists across requestsList
chat_session = model.start_chat(enable_automatic_function_calling=True)

def agent_chat(user_message):
    """
    Sends a message to the existing chat session.
    """
    # FIX IS HERE: Declare global at the very top!
    global chat_session 
    
    try:
        # Now we can use it safely
        response = chat_session.send_message(user_message)
        return response.text
    except Exception as e:
        # If the chat session crashes (e.g. token limit or timeout), restart it
        print(f"⚠️ Chat Error: {e}. Restarting memory...")
        chat_session = model.start_chat(enable_automatic_function_calling=True)
        
        # Try one more time with the new session
        try:
            response = chat_session.send_message(user_message)
            return response.text
        except Exception as e2:
            return f"Agent Error: {e2}"

# TEST BLOCK
if __name__ == "__main__":
    print("--- Testing ContextLink Agent ---")
    query = "Do I have any Jira tickets regarding a 'loan'? If so, give me the details of the most relevant one."
    print(f"User: {query}")
    print(f"Agent: {agent_chat(query)}")
'''
import os
import warnings
import google.generativeai as genai
from dotenv import load_dotenv

# --- TOOL IMPORTS ---
from tools_files import file_tools
from tools_jira import jira_tools
# from tools_slack import slack_tools 

warnings.filterwarnings("ignore", category=FutureWarning)
load_dotenv()

# 1. CONFIGURE API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file.")
genai.configure(api_key=api_key)

# 2. COMBINE TOOLS
all_tools = file_tools + jira_tools 

# --- SELF-HEALING MODEL SELECTOR ---
def get_working_model_name():
    """
    Dynamically finds a model that YOUR api key is allowed to use.
    """
    print("🔍 Scanning for available Gemini models...")
    try:
        for m in genai.list_models():
            # We need a model that supports 'generateContent'
            if 'generateContent' in m.supported_generation_methods:
                # Prefer Flash if available (it's faster)
                if 'flash' in m.name:
                    return m.name
                # Fallback to Pro
                if 'pro' in m.name:
                    return m.name
        
        # If we didn't find a specific preference, just take the first valid one
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                return m.name
                
    except Exception as e:
        print(f"❌ Error listing models: {e}")
        return 'models/gemini-1.5-flash' # Last resort fallback

# 3. INITIALIZE MODEL
valid_model_name = get_working_model_name()
print(f"✅ CONNECTED TO MODEL: {valid_model_name}")

model = genai.GenerativeModel(
    model_name=valid_model_name,
    tools=all_tools
)

# 4. INITIALIZE CHAT SESSION (GLOBAL MEMORY)
try:
    chat_session = model.start_chat(enable_automatic_function_calling=True)
except Exception as e:
    print(f"⚠️ Initial Chat Error: {e}")
    chat_session = None

def agent_chat(user_message):
    """
    Sends a message to the existing chat session.
    """
    global chat_session
    
    # If the session crashed or wasn't made, try to recreate it
    if chat_session is None:
        chat_session = model.start_chat(enable_automatic_function_calling=True)

    try:
        response = chat_session.send_message(user_message)
        for chunk in response:
                    if chunk.text:
                        yield chunk.text  # Send pieces as they arrive
    except Exception as e:
        print(f"⚠️ Chat Error: {e}. Restarting memory...")
        chat_session = model.start_chat(enable_automatic_function_calling=True)
        try:
            response = chat_session.send_message(user_message)
            for chunk in response:
                            if chunk.text:
                                yield chunk.text
        except Exception as e2:
            yield f"Agent Error: {e2}"

# TEST BLOCK
if __name__ == "__main__":
    print("--- Testing ContextLink Agent ---")
    print(f"Agent: {agent_chat('Hello, are you working?')}")