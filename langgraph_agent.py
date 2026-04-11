"""
Simple LangGraph agent for job search using Neo4j.
"""

import atexit
import os
from neo4j import GraphDatabase
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, trim_messages
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
OPENROUTER_API_KEY = os.environ.get('VITE_OPENROUTER_API_KEY')

# ============ NEO4J DRIVER (with cleanup) ============

_driver = None

def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _driver

def close_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None

atexit.register(close_driver)

# ============ TOOLS ============

@tool
def search_jobs(title: str = None, location: str = None, company: str = None, limit: int = 10) -> str:
    """Search jobs by title, location, or company. Returns results including application URLs."""
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
    RETURN j.title as title, c.company_name as company, l.name as location,
           j.max_salary as salary, j.job_posting_url as url
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
                output += f"{i}. **{job['title']}** at {job['company']}\n"
                output += f"   Location: {job['location']}\n"
                if job.get('salary'):
                    output += f"   Salary: ${job['salary']}/year\n"
                url = job.get('url') or "URL not available"
                output += f"   Apply: {url}\n"
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
    RETURN j.title as title, c.company_name as company, l.name as location,
           j.description as description, j.max_salary as salary, j.job_posting_url as url
    """
    try:
        driver = get_driver()
        with driver.session() as session:
            result = session.run(query, {"job_id": job_id})
            record = result.single()
            if not record:
                return f"Job '{job_id}' not found."
            job = dict(record)
            output = "Job Details:\n"
            output += f"Title: {job['title']}\n"
            output += f"Company: {job['company']}\n"
            output += f"Location: {job['location']}\n"
            if job.get('salary'):
                output += f"Salary: ${job['salary']}/year\n"
            if job.get('description'):
                output += f"\nDescription:\n{job['description'][:500]}...\n"
            url = job.get('url') or "URL not available"
            output += f"\nApply: {url}\n"
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
            output = "Companies with open positions:\n\n"
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
            output = "Locations with job openings:\n\n"
            for loc in locations:
                output += f"- {loc['name']} ({loc['count']} jobs)\n"
            return output
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def get_stats() -> str:
    """Get database statistics."""
    # FIX: Single query instead of 3 round trips
    query = """
    MATCH (j:Job)
    WITH count(j) AS jobCount
    MATCH (c:Company)
    WITH jobCount, count(c) AS companyCount
    MATCH (l:Location)
    RETURN jobCount, companyCount, count(l) AS locationCount
    """
    try:
        driver = get_driver()
        with driver.session() as session:
            result = session.run(query)
            record = result.single()
            output = "Database Statistics:\n"
            output += f"- Jobs: {record['jobCount']}\n"
            output += f"- Companies: {record['companyCount']}\n"
            output += f"- Locations: {record['locationCount']}\n"
            return output
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def skills_for_job(job_title: str) -> str:
    """Get skills required for a job title (not yet available)."""
    return "Skill data is not yet available. To enable this, populate Skill nodes and create REQUIRES_SKILL relationships."


@tool
def recommend_skills(current_skills: str, target_job: str) -> str:
    """Recommend skills to learn (not yet available)."""
    return "Skill recommendations are not yet available. Please add skill relationships to the database."


# ============ FEATURE TOOLS ============

@tool
def match_jobs_by_compatibility(
    user_skills: str = None,
    user_experience: str = None,
    target_role: str = None,
    location: str = None,
    limit: int = 10
) -> str:
    """Match jobs by compatibility based on user's skills and experience.

    Use this tool when the user wants job recommendations based on their resume/skills.
    Required: user_skills (comma-separated list of skills from their resume)
    Optional: target_role, location, user_experience

    Returns top 10 most compatible jobs with match scores.
    """
    if not user_skills:
        return "Please provide your skills from your resume to find compatible jobs."

    # FIX: Use substring matching so multi-word skills like "machine learning" match correctly
    user_skill_list = [s.strip().lower() for s in user_skills.split(',')]
    user_skill_set = set(user_skill_list)

    conditions = []
    params = {"limit": limit}

    if target_role:
        conditions.append("toLower(j.title) CONTAINS toLower($target_role)")
        params["target_role"] = target_role

    if location:
        conditions.append("toLower(l.name) CONTAINS toLower($location)")
        params["location"] = location

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    query = f"""
    MATCH (j:Job)-[:POSTED_BY]->(c:Company)
    MATCH (j)-[:LOCATED_IN]->(l:Location)
    {where}
    RETURN j.title as title, c.company_name as company, l.name as location,
           j.max_salary as salary, j.job_posting_url as url,
           j.description as description
    ORDER BY j.title LIMIT $limit
    """

    try:
        driver = get_driver()
        with driver.session() as session:
            result = session.run(query, params)
            jobs = [dict(record) for record in result]

            if not jobs:
                return "No jobs found matching your criteria."

            # FIX: Use substring matching instead of word-boundary split
            scored_jobs = []
            for job in jobs:
                job_text = (job.get('description') or '').lower()
                matched_skills = [s for s in user_skill_list if s in job_text]
                match_score = len(matched_skills) / max(len(user_skill_list), 1) * 100

                scored_jobs.append({
                    **job,
                    'matched_skills': matched_skills,
                    'match_score': min(round(match_score, 1), 100)
                })

            scored_jobs.sort(key=lambda x: x['match_score'], reverse=True)
            top_jobs = scored_jobs[:limit]

            output = f"🎯 Found {len(top_jobs)} compatible jobs based on your skills:\n\n"
            for i, job in enumerate(top_jobs, 1):
                output += f"{i}. **{job['title']}** at {job['company']}\n"
                output += f"   📊 Compatibility Score: {job['match_score']}%\n"
                output += f"   📍 Location: {job['location']}\n"
                if job.get('salary'):
                    output += f"   💰 Salary: ${job['salary']}/year\n"
                if job.get('matched_skills'):
                    output += f"   ✅ Matching Skills: {', '.join(job['matched_skills'][:5])}\n"
                url = job.get('url') or "URL not available"
                output += f"   🔗 Apply: {url}\n\n"

            output += "\n💡 Tip: Apply to jobs with higher compatibility scores for better match!"
            return output

    except Exception as e:
        return f"Error finding compatible jobs: {str(e)}"


@tool
def recommend_skill_growth(
    current_skills: str = None,
    target_job: str = None,
    timeline_months: int = 6
) -> str:
    """Recommend skills to learn for career growth toward a target role.

    Use this tool when the user asks about what skills to learn, how to prepare for a role,
    or what they need to land their dream job.
    Required: current_skills (comma-separated) and target_job
    Optional: timeline_months (default 6 months)

    Returns prioritized learning recommendations with timeline.
    """
    if not current_skills or not target_job:
        return "Please provide your current skills and target job title for personalized recommendations."

    # FIX: Use substring matching for multi-word skills
    user_skill_list = [s.strip().lower() for s in current_skills.split(',')]

    query = """
    MATCH (j:Job)-[:POSTED_BY]->(c:Company)
    WHERE toLower(j.title) CONTAINS toLower($target_job)
    RETURN j.title as title, j.description as description
    LIMIT 20
    """

    try:
        driver = get_driver()
        with driver.session() as session:
            result = session.run(query, {"target_job": target_job})
            jobs = [dict(record) for record in result]

            if not jobs:
                return f"I couldn't find jobs matching '{target_job}'. Try a different job title."

            all_descriptions = ' '.join([j.get('description', '') for j in jobs]).lower()

            common_skills = [
                'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
                'node.js', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'sql', 'postgresql',
                'mongodb', 'machine learning', 'data analysis', 'project management',
                'agile', 'scrum', 'communication', 'leadership', 'problem-solving',
                'git', 'ci/cd', 'rest api', 'graphql', 'tensorflow', 'pytorch'
            ]

            # FIX: Use substring matching for multi-word skills like "machine learning"
            needed_skills = [
                skill for skill in common_skills
                if skill in all_descriptions and skill not in user_skill_list
            ]

            if not needed_skills:
                return (
                    f"🎉 Great news! Your current skills already match common requirements for "
                    f"{target_job} roles. Consider focusing on:\n"
                    "- Building projects\n- Getting certifications\n- Networking in your target field"
                )

            priority_skills = needed_skills[:10]
            months_per_skill = max(1, timeline_months // len(priority_skills))

            output = f"📈 **Skill Growth Plan for {target_job}**\n"
            output += f"⏰ Timeline: {timeline_months} months\n"
            output += f"Current Skills: {', '.join(sorted(user_skill_list))}\n\n"
            output += "🎯 **Recommended Skills to Learn (Priority Order):**\n\n"

            for i, skill in enumerate(priority_skills):
                month = (i * months_per_skill) + 1
                output += f"**Month {month}:** Learn {skill.upper()}\n"
                output += f"   - Why: Frequently required for {target_job} positions\n"
                output += f"   - Resources: Online courses, documentation, projects\n\n"

            output += "💡 **Additional Recommendations:**\n"
            output += "1. Build real-world projects using these skills\n"
            output += "2. Contribute to open source\n"
            output += "3. Update your LinkedIn with new skills\n"
            output += "4. Network with professionals in your target field\n"

            return output

    except Exception as e:
        return f"Error generating skill recommendations: {str(e)}"


@tool
def enhance_resume(
    experience: str = None,
    skills: str = None,
    projects: str = None,
    education: str = None
) -> str:
    """Enhance resume with AI-powered suggestions for improvements.

    Use this tool when the user wants resume feedback, wants to improve their resume,
    or asks for resume optimization tips.
    Takes resume sections as input and provides:
    - Line-by-line analysis
    - Stronger action verbs suggestions
    - ATS keyword recommendations
    - Impactful rewrites
    """
    if not any([experience, skills, projects, education]):
        return "Please provide at least one resume section (experience, skills, projects, or education) for enhancement suggestions."

    # FIX: Use the LLM via the Anthropic API to generate genuinely tailored feedback
    # instead of returning hardcoded template strings.
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        )

        sections = []
        if experience:
            sections.append(f"EXPERIENCE:\n{experience}")
        if skills:
            sections.append(f"SKILLS:\n{skills}")
        if projects:
            sections.append(f"PROJECTS:\n{projects}")
        if education:
            sections.append(f"EDUCATION:\n{education}")

        resume_text = "\n\n".join(sections)

        prompt = (
            "You are an expert resume coach and ATS optimization specialist. "
            "Analyze the following resume sections and provide:\n"
            "1. Specific, actionable improvements for each section provided\n"
            "2. Stronger action verb replacements with examples\n"
            "3. ATS keyword recommendations relevant to the content\n"
            "4. Concrete rewrite examples for weak bullet points\n"
            "5. Overall formatting and structure tips\n\n"
            "Be specific — reference the actual content the user provided rather than giving generic advice.\n\n"
            f"{resume_text}"
        )

        response = client.chat.completions.create(
            model="nvidia/nemotron-3-super-120b-a12b:free",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            extra_headers={
                "HTTP-Referer": "https://573-project.vercel.app",
                "X-Title": "Job Assistant"
            }
        )

        return "📝 **Resume Enhancement Report**\n\n" + response.choices[0].message.content

    except Exception as e:
        # Fallback to structured static advice if LLM call fails
        output = "📝 **Resume Enhancement Report**\n\n"

        if experience:
            output += "**💼 Experience Section Improvements:**\n"
            output += "- Use strong action verbs: Led, Developed, Implemented, Optimized, Achieved\n"
            output += "- Quantify impact: Include numbers, percentages, metrics\n"
            output += "- Format: [Action Verb] + [Task] + [Result/Impact]\n\n"
            output += "Example improvements:\n"
            output += "  Instead of: 'Responsible for coding'\n"
            output += "  Use: 'Developed REST APIs that reduced response time by 40%'\n\n"

        if skills:
            output += "**🛠️ Skills Section Enhancements:**\n"
            output += "- Group skills by category: Technical, Tools, Soft Skills\n"
            output += "- Add proficiency levels for key skills\n"
            output += "- Include relevant certifications\n"
            output += "- ATS Tip: Use exact keywords from job postings\n\n"
            common_ats_keywords = ['agile', 'scrum', 'ci/cd', 'devops', 'microservices', 'api', 'cloud']
            missing = [k for k in common_ats_keywords if k.lower() not in skills.lower()]
            if missing:
                output += f"📌 **ATS Keywords to consider adding:** {', '.join(missing[:5])}\n\n"

        if projects:
            output += "**🚀 Projects Section Boost:**\n"
            output += "- Describe the problem you solved\n"
            output += "- Explain your specific contribution\n"
            output += "- Highlight technologies used\n"
            output += "- Include GitHub/Live links if available\n\n"

        if education:
            output += "**🎓 Education Section:**\n"
            output += "- Include relevant coursework\n"
            output += "- Add GPA if above 3.5\n"
            output += "- List relevant projects or research\n"
            output += "- Include certifications and online courses\n\n"

        output += f"\n(Note: AI-powered analysis unavailable — {str(e)})\n"
        return output


# ============ TOOLS LIST ============

tools = [
    search_jobs, get_job_details, get_companies, get_locations, get_stats,
    skills_for_job, recommend_skills,
    match_jobs_by_compatibility, recommend_skill_growth, enhance_resume
]

# ============ LLM SETUP ============

# if OPENROUTER_API_KEY:
#     os.environ["OPENAI_API_KEY"] = OPENROUTER_API_KEY
#     os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"

# llm = ChatOpenAI(
#     base_url="https://openrouter.ai/api/v1",
#     api_key=OPENROUTER_API_KEY,
#     model="nvidia/nemotron-3-super-120b-a12b:free",
#     temperature=0.3,
#     max_tokens=1000,
#     default_headers={
#         "HTTP-Referer": "https://573-project.vercel.app",
#         "X-Title": "Job Assistant"
#     }
# )
# llm_with_tools = llm.bind_tools(tools)

if OPENROUTER_API_KEY:
    os.environ["OPENAI_API_KEY"] = OPENROUTER_API_KEY
    os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"

_llm = None
_llm_with_tools = None

def get_llm():
    global _llm, _llm_with_tools
    if _llm is None:
        _llm = ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
            model="nvidia/nemotron-3-super-120b-a12b:free",
            temperature=0.3,
            max_tokens=1000,
            default_headers={
                "HTTP-Referer": "https://573-project.vercel.app",
                "X-Title": "Job Assistant"
            }
        )
        _llm_with_tools = _llm.bind_tools(tools)
    return _llm, _llm_with_tools

# ============ SYSTEM PROMPT ============

system_prompt = """You are a job search assistant. Use the available tools to answer questions about jobs, companies, locations, and statistics.

Tools:
- search_jobs: Find jobs by title, location, or company
- get_job_details: Get details for a specific job
- get_companies: List companies with job counts
- get_locations: List locations with job counts
- get_stats: Get database statistics
- skills_for_job: Get skills for a job title (unavailable)
- recommend_skills: Recommend skills to learn (unavailable)

NEW FEATURE TOOLS (use when user asks for these features):
- match_jobs_by_compatibility: Find jobs matching user's resume/skills. Use when user wants "job compatibility", "find jobs based on my resume", "match me with jobs", "what jobs fit my skills", "jobs for me", "best jobs for my background", or similar.
- recommend_skill_growth: Get personalized skill recommendations for target role. Use when user asks "what should I learn", "how to prepare for [role]", "skill recommendations", "career growth", "what skills do I need", or similar.
- enhance_resume: Get resume improvement suggestions. Use when user asks "improve my resume", "resume feedback", "resume tips", "optimize my resume", "fix my resume", or similar.

CRITICAL FORMATTING RULES — you must follow these exactly:
1. Every job listing MUST include its "Apply:" URL exactly as returned by the tool. Never omit, hide, or paraphrase a URL.
2. If the tool returns "URL not available" for a job, write that explicitly — do not invent a URL.
3. Do NOT reformat job results into a table. Present each job as a numbered list so URLs are preserved and visible.
4. Do not summarise or truncate the tool output — reproduce every field the tool returns, especially the Apply URL.

MANDATORY RULES:
- If the user asks about jobs, openings, positions, hiring, roles, or vacancies — you MUST call the search_jobs tool.
- If the user asks about job compatibility based on their resume/skills, call match_jobs_by_compatibility. Pass their skills from their resume context if available.
- If the user asks about skill recommendations or career growth, call recommend_skill_growth. Pass their current skills from resume context if available.
- If the user asks about resume improvements or feedback, call enhance_resume. Pass the relevant resume sections from their resume context.
- Do NOT answer from your own knowledge for job listings.
- Do NOT fabricate or infer job listings.

RESUME CONTEXT USAGE:
If the user's resume data is provided in this prompt, extract the relevant fields and pass them directly to the appropriate tool arguments. Do not ask the user to re-enter information that is already in their resume context."""

# ============ LANGGRAPH WORKFLOW ============

# Maximum number of messages to keep in context to avoid unbounded token growth
MAX_HISTORY_MESSAGES = 20


def create_workflow():
    from langgraph.graph import MessagesState

    class State(MessagesState):
        pass

    def agent_node(state):
        messages = state["messages"]

        # FIX: Trim conversation history to the last N messages (plus the system prompt)
        # to prevent unbounded token growth over long conversations.
        system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
        non_system_msgs = [m for m in messages if not isinstance(m, SystemMessage)]
        trimmed = non_system_msgs[-MAX_HISTORY_MESSAGES:]
        messages = system_msgs + trimmed

        #response = llm_with_tools.invoke(messages)
        _, llm_with_tools = get_llm()
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}

    workflow = StateGraph(State)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", ToolNode(tools))
    workflow.set_entry_point("agent")

    def should_continue(state):
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return END

    workflow.add_conditional_edges("agent", should_continue)

    # FIX: Add the missing edge from tools back to agent so the LLM can
    # process tool results and produce a final response.
    workflow.add_edge("tools", "agent")

    return workflow.compile()


# Global compiled graph
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = create_workflow()
    return _graph


def run_agent(user_message: str, conversation_history: list = None, resume_context: str = None) -> str:
    """Run the agent and return response.

    Args:
        user_message: The user's current message/query
        conversation_history: List of previous messages with 'role' and 'content' keys
        resume_context: JSON string with parsed resume data
                        (name, email, skills, experience, projects, education)
    """
    messages = []

    # FIX: Build the system prompt once, injecting resume context if present.
    # Tools now receive resume fields as explicit arguments from the LLM,
    # rather than relying on indirect extraction from the system prompt.
    enhanced_system_prompt = system_prompt

    if resume_context:
        enhanced_system_prompt += (
            "\n\nUSER RESUME DATA — extract and pass these fields directly as tool arguments:\n"
            f"{resume_context}\n\n"
            "For match_jobs_by_compatibility: pass the 'skills' field as user_skills.\n"
            "For recommend_skill_growth: pass the 'skills' field as current_skills.\n"
            "For enhance_resume: pass the 'experience', 'skills', 'projects', and 'education' fields.\n"
            "Do not ask the user to repeat any information already present above."
        )

    if conversation_history:
        for msg in conversation_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_message))
    messages = [SystemMessage(content=enhanced_system_prompt)] + messages

    state = {"messages": messages}
    graph = get_graph()

    try:
        final_state = graph.invoke(state)
        all_messages = final_state.get("messages", [])

        # Return the last AI message that is not a tool-call dispatch
        for msg in reversed(all_messages):
            if isinstance(msg, AIMessage) and not getattr(msg, 'tool_calls', None):
                return msg.content
        return "No response generated."
    except Exception as e:
        return f"Error: {str(e)}"
