import os
import warnings
import google.generativeai as genai
from dotenv import load_dotenv

# --- NEW IMPORTS ---
from tools_files import file_tools
from tools_jira import jira_tools

warnings.filterwarnings("ignore", category=FutureWarning)
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file.")
genai.configure(api_key=api_key)

# 1. COMBINE TOOLS
# We merge the lists so the model sees all capabilities
all_tools = file_tools + jira_tools

# 2. INITIALIZE WITH TOOLS
# We pass the 'tools' list to the model
model = genai.GenerativeModel(
    model_name='gemini-flash-latest', # switched to stable flash version
    tools=all_tools
)

def agent_chat(user_message):
    """
    Starts a chat session that can use tools.
    """
    # enable_automatic_function_calling=True makes Gemini run the Python functions for you!
    chat = model.start_chat(enable_automatic_function_calling=True)
    
    try:
        response = chat.send_message(user_message)
        return response.text
    except Exception as e:
        return f"Agent Error: {e}"

# TEST BLOCK
if __name__ == "__main__":
    print("--- Testing ContextLink Agent ---")
    
    # This query tests BOTH tools:
    # 1. It has to look up JIRA-123 (Jira Tool)
    # 2. It sees the ticket mentions 'auth.py', so it has to look for that file (File Tool)
    query = "Check JIRA-123 and tell me if the file mentioned in the description exists in my folder."
    
    #print(f"User: {query}")
    #print("Agent thinking...")
    print(f"Agent: {agent_chat(query)}")