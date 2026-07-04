import re

with open("app/agent.py", "r") as f:
    content = f.read()

agent_code = """
expand_topic_agent = Agent(
    name="ExpandTopicAgent",
    model=base_model,
    instructions=\"\"\"
You are an expert tutor. Your job is to break down a specific topic into 3-5 smaller, atomic sub-concepts.
The user wants to explore the concept further. Return a KnowledgeGraph containing ONLY the newly created subtopics.
For each new subtopic:
- `topic`: The name of the subtopic
- `description`: A brief description
- `parent_topic`: Must be exactly the topic name provided in the user's prompt.
- `mastery_score`: 0.0
\"\"\",
    output_type=KnowledgeGraph
)
"""

if "expand_topic_agent = Agent" not in content:
    with open("app/agent.py", "a") as f:
        f.write(agent_code)
    print("Added expand_topic_agent to agent.py")
else:
    print("Already added expand_topic_agent")
