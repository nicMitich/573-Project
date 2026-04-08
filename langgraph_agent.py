"""
Simple LangGraph agent for job search using Neo4j.
"""

import os
from neo4j import GraphDatabase
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

# Neo4j connection
NEO4J_URI = os.environ.get('NEO4J_URI')
NEO4J_USER = os.environ.get('NEO4J_USER')
NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD')
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY') or os.environ.get('VITE_OPENROUTER_API_KEY')

_driver = None
def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _driver

# ============ TOOLS ============

@tool
def search_jobs(title: str = None, location: str = None, company: str = None, limit: int = 5) -> str:
    """Search jobs by title, location, or company."""
    if not any([title, location, company]):
        return "Please provide a title, location, or company to search."
    
    conditions = []
    params = {"limit": limit}
    if title:
        conditions.append("toLower(j.title) CONTAINS toLower($title)")
        params["title"] = title
    if location:
        conditions.append("toLower(l.name) CONTAINS toLower($location)")
        params["location"] = location
    if company:
        conditions.append("toLower(c.company_name) CONTAINS toLower($company)")
        params["company"] = company
    
    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    query = f"""
    MATCH (j:Job)-[:POSTED_BY]->(c:Company)
    MATCH (j)-[:LOCATED_IN]->(l:Location)
    {where}
    RETURN j.title as title, c.company_name as company, l.name as location, j.max_salary as salary, j.job_posting_url as url
    ORDER BY j.title LIMIT $limit
    """
    
    try:
        driver = get_driver()
        with driver.session() as session:
            result = session.run(query, params)
            jobs = [dict(record) for record in result]
            if not jobs:
                return "No jobs found."
            output = f"Found {len(jobs)} job(s):\n\n"
            for i, job in enumerate(jobs, 1):
                output += f"{i}. {job['title']} at {job['company']}\n"
                output += f"   Location: {job['location']}\n"
                if job.get('salary'):
                    output += f"   Salary: ${job['salary']}/year\n"
                if job.get('url'):
                    output += f"   URL: {job['url']}\n"
                output += "\n"
            return output
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def get_job_details(job_id: str) -> str:
    """Get details for a specific job by ID or title."""
    query = """
    MATCH (j:Job {job_id: $job_id})-[:POSTED_BY]->(c:Company)
    MATCH (j)-[:LOCATED_IN]->(l:Location)
    RETURN j.title as title, c.company_name as company, l.name as location, j.description as description, j.max_salary as salary, j.job_posting_url as url
    """
    try:
        driver = get_driver()
        with driver.session() as session:
            result = session.run(query, {"job_id": job_id})
            record = result.single()
            if not record:
                return f"Job '{job_id}' not found."
            job = dict(record)
            output = f"Job Details:\n"
            output += f"Title: {job['title']}\n"
            output += f"Company: {job['company']}\n"
            output += f"Location: {job['location']}\n"
            if job.get('salary'):
                output += f"Salary: ${job['salary']}/year\n"
            if job.get('description'):
                output += f"\nDescription:\n{job['description'][:500]}...\n"
            if job.get('url'):
                output += f"\nURL: {job['url']}\n"
            return output
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def get_companies() -> str:
    """List all companies with job counts."""
    query = """
    MATCH (c:Company)<-[:POSTED_BY]-(j:Job)
    RETURN c.company_name as name, count(j) as count
    ORDER BY count DESC LIMIT 20
    """
    try:
        driver = get_driver()
        with driver.session() as session:
            result = session.run(query)
            companies = [dict(record) for record in result]
            output = f"Companies with open positions:\n\n"
            for comp in companies:
                output += f"- {comp['name']} ({comp['count']} jobs)\n"
            return output
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def get_locations() -> str:
    """List all locations with job counts."""
    query = """
    MATCH (l:Location)<-[:LOCATED_IN]-(j:Job)
    RETURN l.name as name, count(j) as count
    ORDER BY count DESC LIMIT 20
    """
    try:
        driver = get_driver()
        with driver.session() as session:
            result = session.run(query)
            locations = [dict(record) for record in result]
            output = f"Locations with job openings:\n\n"
            for loc in locations:
                output += f"- {loc['name']} ({loc['count']} jobs)\n"
            return output
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def get_stats() -> str:
    """Get database statistics."""
    try:
        driver = get_driver()
        with driver.session() as session:
            result = session.run("MATCH (j:Job) RETURN count(j) as count")
            jobs = result.single()["count"]
            result = session.run("MATCH (c:Company) RETURN count(c) as count")
            companies = result.single()["count"]
            result = session.run("MATCH (l:Location) RETURN count(l) as count")
            locations = result.single()["count"]
            
            output = f"Database Statistics:\n"
            output += f"- Jobs: {jobs}\n"
            output += f"- Companies: {companies}\n"
            output += f"- Locations: {locations}\n"
            return output
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def skills_for_job(job_title: str) -> str:
    """Get skills required for a job title (not yet available)."""
    return f"Skill data is not yet available. To enable this, populate Skill nodes and create REQUIRES_SKILL relationships."

@tool
def recommend_skills(current_skills: str, target_job: str) -> str:
    """Recommend skills to learn (not yet available)."""
    return f"Skill recommendations are not yet available. Please add skill relationships to the database."

# ============ LANGGRAPH SETUP ============

tools = [search_jobs, get_job_details, get_companies, get_locations, get_stats, skills_for_job, recommend_skills]

# Initialize LLM
llm = ChatOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
    model="openai/gpt-4o-mini",
    temperature=0.7,
    max_tokens=1000
)
llm_with_tools = llm.bind_tools(tools)

system_prompt = """You are a job search assistant. Use the available tools to answer questions about jobs, companies, locations, and statistics.

Tools:
- search_jobs: Find jobs by title, location, or company
- get_job_details: Get details for a specific job
- get_companies: List companies with job counts
- get_locations: List locations with job counts
- get_stats: Get database statistics
- skills_for_job: Get skills for a job title (unavailable)
- recommend_skills: Recommend skills to learn (unavailable)

Always call a tool when the user asks for information. Be concise and helpful."""

def create_workflow():
    from langgraph.graph import MessagesState
    
    class State(MessagesState):
        pass
    
    def agent_node(state):
        messages = state["messages"]
        if not any(isinstance(msg, SystemMessage) for msg in messages):
            messages = [SystemMessage(content=system_prompt)] + messages
        
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}
    
    workflow = StateGraph(State)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", ToolNode(tools))
    workflow.set_entry_point("agent")
    
    def should_continue(state):
        last = state["messages"][-1] if state["messages"] else None
        if last and hasattr(last, 'tool_calls') and last.tool_calls:
            return "tools"
        return END
    
    workflow.add_conditional_edges("agent", should_continue)
    workflow.add_edge("tools", "agent")
    return workflow.compile()

# Global compiled graph
_graph = None
def get_graph():
    global _graph
    if _graph is None:
        _graph = create_workflow()
    return _graph

def run_agent(user_message: str, conversation_history: list = None) -> str:
    """Run the agent and return response."""
    messages = []
    if conversation_history:
        for msg in conversation_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
    messages.append(HumanMessage(content=user_message))
    
    state = {"messages": messages}
    graph = get_graph()
    
    try:
        final_state = graph.invoke(state)
        all_messages = final_state.get("messages", [])
        
        # Find last AI message without tool calls
        for msg in reversed(all_messages):
            if isinstance(msg, AIMessage) and not getattr(msg, 'tool_calls', None):
                return msg.content
        return "No response generated."
    except Exception as e:
        return f"Error: {str(e)}"
