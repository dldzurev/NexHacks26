import requests
import sys
import time
import os

# Try to import colorama for cross-platform colors
try:
    from colorama import init, Fore, Back, Style
    init(autoreset=True)
    COLORS_AVAILABLE = True
except ImportError:
    COLORS_AVAILABLE = False
    # Fallback ANSI codes for basic terminals
    class Fore:
        RED = '\033[91m'
        GREEN = '\033[92m'
        YELLOW = '\033[93m'
        BLUE = '\033[94m'
        MAGENTA = '\033[95m'
        CYAN = '\033[96m'
        WHITE = '\033[97m'
        RESET = '\033[0m'
    class Style:
        BRIGHT = '\033[1m'
        DIM = '\033[2m'
        RESET_ALL = '\033[0m'

# Configuration
API_URL = "http://127.0.0.1:8000/chat"

def print_banner():
    """Print the CONTEXT CO banner"""
    print(f"{Fore.CYAN}{Style.BRIGHT}")
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║                                                           ║")
    print(f"║   {Fore.CYAN} ██████╗ ██████╗ ███╗   ██╗████████╗███████╗██╗  ██╗{Fore.CYAN}   ║")
    print(f"║   {Fore.CYAN}██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔════╝╚██╗██╔╝{Fore.CYAN}   ║")
    print(f"║   {Fore.CYAN}██║     ██║   ██║██╔██╗ ██║   ██║   █████╗   ╚███╔╝ {Fore.CYAN}   ║")
    print(f"║   {Fore.CYAN}██║     ██║   ██║██║╚██╗██║   ██║   ██╔══╝   ██╔██╗ {Fore.CYAN}   ║")
    print(f"║   {Fore.CYAN}╚██████╗╚██████╔╝██║ ╚████║   ██║   ███████╗██╔╝ ██╗{Fore.CYAN}   ║")
    print(f"║   {Fore.CYAN} ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝{Fore.CYAN}   ║")
    print("║                                                           ║")
    print(f"║   {Fore.CYAN}     ██████╗  █████ {Fore.CYAN}                                    ║")
    print(f"║   {Fore.CYAN}    ██╔═══   ██╔══██╗{Fore.CYAN}                                   ║")
    print(f"║   {Fore.CYAN}    ██║      ██║  ██║{Fore.CYAN}                                   ║")
    print(f"║   {Fore.CYAN}    ██║      ██║  ██║{Fore.CYAN}                                   ║")
    print(f"║   {Fore.CYAN}    ╚██████   ██████{Fore.CYAN}                                   ║")
    print(f"║   {Fore.CYAN}     ╚═════╝  ╚════╝ {Fore.CYAN}                                    ║")
    print("║                                                           ║")
    print(f"║   {Fore.CYAN}╔═══════════════════════════════════════════╗{Fore.CYAN}   ║")
    print(f"║   {Fore.CYAN}║  {Fore.CYAN}🧠 AI-Powered Context Assistant{Fore.CYAN}  ║{Fore.CYAN}   ║")
    print(f"║   {Fore.CYAN}║  {Fore.CYAN}🔗 Connect | Search | Understand{Fore.CYAN} ║{Fore.CYAN}   ║")
    print(f"║   {Fore.CYAN}╚═══════════════════════════════════════════╝{Fore.CYAN}   ║")
    print("║                                                           ║")
    print("╚═══════════════════════════════════════════════════════════╝")
    print(f"{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{Style.BRIGHT}💡 Tip:{Style.RESET_ALL} {Fore.CYAN}Type 'exit' or 'quit' to stop, or press Ctrl+C{Style.RESET_ALL}\n")

def print_thinking():
    """Show animated thinking indicator"""
    dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    for i in range(2):
        for dot in dots:
            sys.stdout.write(f'\r{Fore.CYAN}{dot} {Fore.CYAN}Thinking{Style.RESET_ALL}')
            sys.stdout.flush()
            time.sleep(0.08)
    sys.stdout.write('\r' + ' ' * 50 + '\r')  # Clear line properly

def type_effect(text, color=Fore.CYAN):
    """Makes the text look like it's being typed with color"""
    sys.stdout.write(f"{color}{Style.BRIGHT}🤖 CONTEXT CO:{Style.RESET_ALL} {color}")
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(0.01)  # Speed of typing
    print(f"{Style.RESET_ALL}")

def print_separator():
    """Print a colorful separator"""
    print(f"{Fore.CYAN}{'─' * 60}{Style.RESET_ALL}")

def print_error(message):
    """Print error message in light blue"""
    print(f"{Fore.CYAN}{Style.BRIGHT}❌ Error:{Style.RESET_ALL} {Fore.CYAN}{message}{Style.RESET_ALL}")

def print_success(message):
    """Print success message in light blue"""
    print(f"{Fore.CYAN}{Style.BRIGHT}✅{Style.RESET_ALL} {Fore.CYAN}{message}{Style.RESET_ALL}")

def print_warning(message):
    """Print warning message in light blue"""
    print(f"{Fore.CYAN}{Style.BRIGHT}⚠️{Style.RESET_ALL} {Fore.CYAN}{message}{Style.RESET_ALL}")

def main():
    # Clear screen and show banner
    os.system('clear' if os.name != 'nt' else 'cls')
    print_banner()

    while True:
        # 1. Get User Input with colorful prompt
        try:
            user_input = input(f"{Fore.CYAN}{Style.BRIGHT}👉 YOU:{Style.RESET_ALL} {Fore.CYAN}")
            print(Style.RESET_ALL, end='')
        except KeyboardInterrupt:
            print(f"\n{Fore.CYAN}👋 Shutting down CONTEXT CO...{Style.RESET_ALL}\n")
            break
            
        if user_input.lower() in ["exit", "quit"]:
            print(f"\n{Fore.CYAN}{Style.BRIGHT}👋 Thanks for using CONTEXT CO! Goodbye!{Style.RESET_ALL}\n")
            break
        
        if not user_input.strip():
            continue

        # 2. Send to Backend
        try:
            print_thinking()
            
            # CHANGE 1: Add stream=True
            response = requests.post(API_URL, json={"message": user_input}, stream=True)
            
            if response.status_code == 200:
                print(f"\n{Fore.CYAN}{Style.BRIGHT}🤖 CONTEXT CO:{Style.RESET_ALL} {Fore.CYAN}", end="")
                
                # CHANGE 2: Iterate over content instead of waiting for .json()
                for chunk in response.iter_content(chunk_size=None):
                    if chunk:
                        text = chunk.decode("utf-8")
                        print(text, end="", flush=True) # Print immediately
                
                print(f"{Style.RESET_ALL}") # Reset color at end
            else:
                print_error(f"Server returned status {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print_error("Could not connect to server. Is 'uvicorn main:app' running?")
        except requests.exceptions.ConnectionError:
            print_error("Could not connect to server. Is 'uvicorn main:app' running?")
            print_warning("Make sure the backend server is started with: uvicorn main:app --reload")
        except Exception as e:
            print_error(f"Unexpected error: {str(e)}")
            
        print_separator()
        print()  # Extra line for spacing

if __name__ == "__main__":
    main()
