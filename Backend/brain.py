import inspect
import json
import os

import requests
from dotenv import load_dotenv

# --- EXPLICIT TOOL IMPORTS ---
# We import functions directly to ensure we have the actual python objects
from tools_confluence import get_confluence_page, search_confluence_pages
from tools_files import list_files, read_all_code_files
from tools_jira import get_jira_ticket, search_jira_issues
from tools_slack import search_slack

load_dotenv()

# 1. CONFIGURATION
# Add OPENROUTER_API_KEY=sk-or-v1-... to your .env file
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
SITE_URL = "http://localhost:8000"
SITE_NAME = "Context Co"

# SELECT YOUR MODEL
# options: "openai/gpt-4o", "google/gemini-2.0-flash-001", "anthropic/claude-3.5-sonnet"
MODEL_NAME = "openai/gpt-4o"

# 2. TOOL REGISTRY
# Map the string name the AI uses to the actual Python function
function_map = {
    "list_files": list_files,
    "read_all_code_files": read_all_code_files,
    "search_jira_issues": search_jira_issues,
    "get_jira_ticket": get_jira_ticket,
    "search_slack": search_slack,
    "search_confluence_pages": search_confluence_pages,
    "get_confluence_page": get_confluence_page,
}

# 3. HELPER: Auto-Generate JSON Schemas for OpenRouter


def get_function_schema(func):
    """
    Scrapes a Python function's signature to build the JSON schema
    that OpenRouter/OpenAI compatible APIs need.
    """
    type_map = {
        str: "string",
        int: "integer",
        float: "number",
        bool: "boolean",
        list: "array",
        dict: "object",
    }

    sig = inspect.signature(func)
    parameters = {"type": "object", "properties": {}, "required": []}

    for name, param in sig.parameters.items():
        # Skip 'self' if it somehow sneaked in
        if name == "self":
            continue

        param_type = type_map.get(param.annotation, "string")

        parameters["properties"][name] = {
            "type": param_type,
            "description": f"The {name} argument",
        }

        # If no default value, it is required
        if param.default == inspect.Parameter.empty:
            parameters["required"].append(name)

    return {
        "type": "function",
        "function": {
            "name": func.__name__,
            "description": func.__doc__ or "No description provided.",
            "parameters": parameters,
        },
    }


# Generate schemas once at startup
tools_schema = [get_function_schema(f) for f in function_map.values()]

# 4. GLOBAL MEMORY
chat_history = []

# 5. SYSTEM PROMPT (Cursor-style Review & Apply protocol)
SYSTEM_PROMPT = """You are NexHacks26, a context-aware coding assistant running inside a VS Code extension.
You can use the provided tools to read project files and gather context from Jira, Slack, and Confluence.

CRITICAL RULES
* Prefer tools over guessing. If you need code or ticket context, call the relevant tool.
* Do NOT break or remove the existing tool integrations.

CURSOR-STYLE REVIEW & APPLY PROTOCOL
When you want to propose a code change to a specific file, you MUST:
1) Read the current file contents first using the tools_files integration (call read_all_code_files on the directory containing the file; use list_files if you need help locating it).
2) Output the complete new file content using the EXACT format below (the frontend relies on this):

### FILE: <relative_path_from_workspace_root>
```<language>
<full_new_file_content>
Formatting requirements:

The header line must start with exactly: ### FILE:

The code block must immediately follow the header on the next line.

Do NOT put explanations inside the code block.

If you propose changes to multiple files, repeat the same pattern for each file.
"""


def agent_chat(user_message):
    """
    Main loop:

    1. Send User Message -> AI
    2. AI says "Call Tool X" -> We run Tool X
    3. We send Tool Output -> AI
    4. AI sends Final Answer -> User
    """
    global chat_history

    # Inject system prompt once per session
    if not chat_history:
        chat_history.append({"role": "system", "content": SYSTEM_PROMPT})

    # Add User Message
    chat_history.append({"role": "user", "content": user_message})

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json",
    }

    # Safety: Max 10 turns to prevent infinite loops
    for _ in range(10):
        payload = {
            "model": MODEL_NAME,
            "messages": chat_history,
            "tools": tools_schema,
        }

        try:
            # We use stream=False here for simplicity in the tool loop logic
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                data=json.dumps(payload),
            )
            response.raise_for_status()
            data = response.json()

            # Extract the choice
            choice = data["choices"][0]
            message = choice["message"]

            # --- CASE 1: AI WANTS TO USE A TOOL ---
            if message.get("tool_calls"):
                # 1. Append the AI's "intent" to history
                chat_history.append(message)

                # 2. Run every tool requested
                for tool_call in message["tool_calls"]:
                    func_name = tool_call["function"]["name"]
                    call_id = tool_call["id"]

                    # Parse arguments safely
                    try:
                        args = json.loads(tool_call["function"]["arguments"])
                    except Exception:
                        args = {}

                    # Notify CLI
                    yield f"🛠️ Calling Tool: {func_name}...\n"

                    # Execute Python Function
                    if func_name in function_map:
                        try:
                            # Run the tool!
                            result_obj = function_map[func_name](**args)
                            result_content = str(result_obj)
                        except Exception as e:
                            result_content = f"Tool Error: {str(e)}"
                    else:
                        result_content = f"Error: Tool '{func_name}' not found."

                    # 3. Append the result to history
                    chat_history.append(
                        {
                            "role": "tool",
                            "tool_call_id": call_id,
                            "name": func_name,
                            "content": result_content,
                        }
                    )

                # Loop continues to send the tool outputs back to the AI
                continue

            # --- CASE 2: AI HAS A FINAL ANSWER ---
            final_content = message["content"]
            chat_history.append({"role": "assistant", "content": final_content})
            yield final_content
            return  # We are done

        except Exception as e:
            error_msg = f"❌ OpenRouter Error: {str(e)}"
            print(error_msg)
            yield error_msg
            return


if __name__ == "_main_":
    print("--- Testing OpenRouter Agent ---")

    for chunk in agent_chat("Find the latest Jira ticket about 'login'"):
        print(chunk)