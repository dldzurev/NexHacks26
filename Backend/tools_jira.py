import os
from jira import JIRA
from dotenv import load_dotenv

load_dotenv()

def search_jira_issues(query: str = "") -> str:
    """
    Searches Jira for issues. If query is empty, returns tickets from the last 30 days.
    
    Args:
        query: Keywords to search for (e.g., 'login error'). Leave empty to see recent activity.
    """
    try:
        jira = JIRA(
            server=os.getenv("JIRA_SERVER"),
            basic_auth=(os.getenv("JIRA_EMAIL"), os.getenv("JIRA_API_TOKEN"))
        )

        if not query or query.strip() == "":
            # FIX: Add 'created >= -30d' to make the query BOUNDED for Jira Cloud
            jql_query = 'created >= -30d ORDER BY created DESC'
            print(f"🔎 Executing JQL (Last 30 Days): {jql_query}")
        else:
            # FIX: Search for text
            jql_query = f'text ~ "{query}" ORDER BY created DESC'
            print(f"🔎 Executing JQL (Search): {jql_query}")
        
        # Limit to 10 to avoid token limit issues
        issues = jira.search_issues(jql_query, maxResults=10)
        
        if not issues:
            return "No Jira tickets found matching your query."
            
        results = []
        for issue in issues:
            results.append(
                f"Ticket: {issue.key} | Status: {issue.fields.status.name} | "
                f"Summary: {issue.fields.summary} | Link: {issue.permalink()}"
            )
        return "\n".join(results)

    except Exception as e:
        return f"Error searching Jira: {str(e)}"

def get_jira_ticket(ticket_key: str) -> str:
    """
    Gets detailed information about a specific Jira ticket by its key (e.g., "PROJ-123").
    Use this when you need full details about a specific ticket that was mentioned or found.
    """
    try:
        jira = JIRA(
            server=os.getenv("JIRA_SERVER"),
            basic_auth=(os.getenv("JIRA_EMAIL"), os.getenv("JIRA_API_TOKEN"))
        )
        
        print(f"🔌 Fetching details for {ticket_key}...")
        issue = jira.issue(ticket_key)
        
        # Format detailed information
        details = f"""
Ticket: {issue.key}
Status: {issue.fields.status.name}
Priority: {issue.fields.priority.name if hasattr(issue.fields, 'priority') and issue.fields.priority else 'N/A'}
Assignee: {issue.fields.assignee.displayName if issue.fields.assignee else 'Unassigned'}
Reporter: {issue.fields.reporter.displayName if issue.fields.reporter else 'N/A'}
Created: {issue.fields.created}
Updated: {issue.fields.updated}
Summary: {issue.fields.summary}
Description: {issue.fields.description if issue.fields.description else 'No description'}
Link: {issue.permalink()}
"""
        return details.strip()
        
    except Exception as e:
        return f"Error getting Jira ticket {ticket_key}: {str(e)}"

# Export tools
jira_tools = [get_jira_ticket, search_jira_issues]

# TEST BLOCK (Only runs when you explicitly run 'python tools_jira.py')
if __name__ == "__main__":
    print("--- Testing Jira Tools ---")
    print(search_jira_issues(""))