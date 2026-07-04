import re

with open("app/fast_api_app.py", "r") as f:
    content = f.read()

api_code = """
@app.post("/api/kg/expand")
def expand_kg(req: dict):
    username = req.get("username", "testuser")
    topic = req.get("topic")
    if not topic:
        return {"status": "error", "message": "Missing topic"}

    with SessionLocal() as db:
        user = db.query(User).filter(User.username == username).first()
        if not user or not user.knowledge_graph:
            return {"status": "error", "message": "No knowledge graph"}
            
        kg = json.loads(user.knowledge_graph)
        
        prompt = f"Break down the topic '{topic}' into 3-5 subtopics. The parent_topic must be exactly '{topic}'."
        from app.agent import expand_topic_agent
        result = expand_topic_agent(prompt)
        
        if result and result.nodes:
            # deduplicate and add
            existing_topics = {n['topic'] for n in kg['nodes']}
            for new_node in result.nodes:
                if new_node.topic not in existing_topics:
                    kg['nodes'].append(new_node.model_dump())
            
            user.knowledge_graph = json.dumps(kg)
            db.commit()
            return {"status": "success", "knowledge_graph": kg}
        else:
            return {"status": "error", "message": "Failed to expand topic"}
"""

if "@app.post(\"/api/kg/expand\")" not in content:
    with open("app/fast_api_app.py", "a") as f:
        f.write(api_code)
    print("Added /api/kg/expand")
else:
    print("Already added /api/kg/expand")
