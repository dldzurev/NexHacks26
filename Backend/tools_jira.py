# TOOL 3: Get Ticket Info
def get_jira_ticket(ticket_id: str) -> dict:
    """
    Fetches the summary and status of a Jira ticket.
    """
    # FAKE DATABASE FOR TESTING
    mock_db = {
        "JIRA-123": {
            "title": "Fix Auth Bug in Login",
            "status": "In Progress",
            "description": "The login button throws a 500 error. Check the auth.py file.",
            "reporter": "Sarah"
        },
        "JIRA-101": {
            "title": "Add Dark Mode",
            "status": "To Do",
            "description": "Update the CSS to support dark theme."
        }
    }

    # Return the ticket or an error
    result = mock_db.get(ticket_id)
    if result:
        return result
    else:
        return {"error": f"Ticket {ticket_id} not found."}

# Export the list
jira_tools = [get_jira_ticket]