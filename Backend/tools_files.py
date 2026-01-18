import os

# CONFIG: Files to ignore so we don't crash the memory
IGNORE_DIRS = {'.git', '__pycache__', 'venv', 'env', '.idea', '.vscode', 'node_modules'}
IGNORE_FILES = {'.DS_Store', '.env', 'package-lock.json', 'poetry.lock'}
MAX_FILE_SIZE = 20000 # Skip huge files to save context

def list_files(directory: str = r"C:\Users\priya\NexHacks26\\Backend") -> dict:
    """
    Lists files in the directory so the agent knows the structure.
    """
    print(f"📂 [TOOL] Scanning directory: {directory}")
    try:
        if not os.path.exists(directory):
            return {"error": "Directory not found"}
            
        files = []
        for f in os.listdir(directory):
            if f not in IGNORE_FILES and not f.startswith('.'):
                files.append(f)
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}

def read_all_code_files(directory: str = r"C:\Users\priya\NexHacks26\\Backend") -> dict:
    """
    POWER TOOL: Reads the content of ALL text-based files in the directory at once.
    Use this when you need to understand the codebase, find where a feature is implemented,
    or search for specific logic across multiple files.
    """
    print(f"🚀 [TOOL] Bulk reading ALL files in: {directory}")
    combined_content = ""
    files_read = 0

    try:
        if directory == "" or directory == ".":
            directory = os.getcwd()

        for root, dirs, files in os.walk(directory):
            # Remove ignored directories from traversal
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]
            
            for file in files:
                if file in IGNORE_FILES or file.startswith('.'):
                    continue
                
                filepath = os.path.join(root, file)
                
                # Skip massive files or non-text files
                if os.path.getsize(filepath) > MAX_FILE_SIZE:
                    continue
                    
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        # Add file header so AI knows which file is which
                        combined_content += f"\n\n--- FILE: {file} ---\n{content}"
                        files_read += 1
                except Exception:
                    continue # Skip binary files (images, etc)

        return {
            "status": "success",
            "files_read": files_read,
            "full_codebase_context": combined_content[:100000] # Safety limit
        }
    except Exception as e:
        return {"error": str(e)}

# Export the tools
file_tools = [list_files, read_all_code_files]