# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import os

import google.auth
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app
from google.cloud import logging as google_cloud_logging

from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback
from app.db import init_db, create_user_if_not_exists, save_user_state, save_user_roadmap, save_user_kg, save_pending_flashcards, get_user

# Initialize database
init_db()

setup_telemetry()
try:
    _, project_id = google.auth.default()
    logging_client = google_cloud_logging.Client()
    logger = logging_client.logger(__name__)
except Exception:
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else ["*"]
)

# Artifact bucket for ADK (created by Terraform, passed via env var)
logs_bucket_name = os.environ.get("LOGS_BUCKET_NAME")

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# In-memory session configuration - no persistent storage
session_service_uri = None

artifact_service_uri = f"gs://{logs_bucket_name}" if logs_bucket_name else None

app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=artifact_service_uri,
    allow_origins=allow_origins,
    session_service_uri=session_service_uri,
    otel_to_cloud=False,
)
app.title = "backend"
app.description = "API for interacting with the Agent backend"


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    logger.log_struct(feedback.model_dump(), severity="INFO")
    return {"status": "success"}

from app.agent import (
    curriculum_agent, diagnosis_agent, parallel_final_agent, final_draft_agent, orchestration_agent,
    kg_extractor_agent, flashcard_generator_agent, flashcard_evaluator_agent, pomodoro_insight_agent,
    update_orchestration_agent, update_roadmap_agent
)
from fastapi import Request
from fastapi.responses import StreamingResponse
import json

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import uuid
import tempfile
import markdown
from pydantic import BaseModel
from typing import Dict, Any

class PDFRequest(BaseModel):
    markdown_text: str

class LoginRequest(BaseModel):
    username: str

class SaveStateRequest(BaseModel):
    username: str
    user_state: Dict[str, Any]
    pre_requisites: Dict[str, Any]

class SaveRoadmapRequest(BaseModel):
    username: str
    roadmap_markdown: str
    learning_assets: Any

class InitKGRequest(BaseModel):
    username: str
    roadmap_markdown: str

class GenerateFlashcardsRequest(BaseModel):
    username: str

class EvaluateFlashcardRequest(BaseModel):
    username: str
    flashcard: dict
    user_answer: str

class SavePendingFlashcardsRequest(BaseModel):
    username: str
    pending_flashcards: list

class PomodoroEvaluateRequest(BaseModel):
    username: str
    recall_text: str

app_session_service = InMemorySessionService()

async def run_agent(agent, prompt: str):
    session_id = str(uuid.uuid4())
    await app_session_service.create_session(app_name="app", user_id="user", session_id=session_id)
    runner = Runner(agent=agent, app_name="app", session_service=app_session_service)
    
    final_output = None
    async for event in runner.run_async(
        user_id="user", session_id=session_id,
        new_message=types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
    ):
        if event.is_final_response():
            final_output = event.content.parts[0].text
            
    if getattr(agent, 'output_schema', None) and final_output:
        text = final_output.strip()
        if text.startswith("```json"): text = text[7:]
        elif text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        text = text.strip()
        try:
            return json.loads(text)
        except Exception:
            pass
    return final_output

@app.post("/api/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    messages = data.get("messages", [])
    mode = data.get("mode", "onboarding")
    if not messages:
        return {"text": "Please provide messages.", "state": {}}
    
    # Extract the conversation history
    history = "\\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
    
    agent_to_use = update_orchestration_agent if mode == "update" else orchestration_agent
    state = await run_agent(agent_to_use, f"Conversation history:\\n{history}\\n\\nRespond to the last message and extract the user's state.")
    
    if isinstance(state, dict):
        reply = state.get("reply", "Please continue.")
        if state.get("is_complete") and not state.get("reply"):
            reply = "Great, I have enough information! Let's generate your updated roadmap." if mode == "update" else "Great, I have enough information! Let's generate your roadmap."
    else:
        reply = "Please continue."
    
    return {"content": reply, "state": state}

@app.post("/api/curriculum")
async def generate_curriculum(request: Request):
    data = await request.json()
    result = await run_agent(curriculum_agent, json.dumps(data))
    return {"result": result}

@app.post("/api/diagnosis")
async def run_diagnosis(request: Request):
    data = await request.json()
    result = await run_agent(diagnosis_agent, json.dumps(data))
    return {"result": result}

@app.post("/api/final_roadmap")
async def generate_final_roadmap(request: Request):
    data = await request.json()
    draft_res = await run_agent(final_draft_agent, json.dumps(data))
    parallel_res = await run_agent(parallel_final_agent, json.dumps(draft_res))
    
    return {
        "final_roadmap": draft_res,
        "assets": parallel_res
    }

@app.post("/api/login")
async def login_user(req: LoginRequest):
    user = create_user_if_not_exists(req.username)
    return {"status": "success", "user": user}

@app.post("/api/save_state")
async def save_state(req: SaveStateRequest):
    save_user_state(req.username, req.user_state, req.pre_requisites)
    return {"status": "success"}

@app.post("/api/save_roadmap")
async def save_roadmap(req: SaveRoadmapRequest):
    save_user_roadmap(req.username, req.roadmap_markdown, req.learning_assets)
    return {"status": "success"}

class UpdateRoadmapRequest(BaseModel):
    username: str
    new_goals_state: dict

@app.post("/api/update_roadmap")
async def update_roadmap(req: UpdateRoadmapRequest):
    user = get_user(req.username)
    if not user or not user.get("knowledge_graph"):
        return {"status": "error", "message": "Knowledge graph not found. Cannot update roadmap."}
        
    kg = user["knowledge_graph"]
    prompt = f"New Goals:\\n{json.dumps(req.new_goals_state)}\\n\\nCurrent Knowledge Graph:\\n{json.dumps(kg)}"
    
    # Run the update agent
    draft_res = await run_agent(update_roadmap_agent, prompt)
    
    # Optional: We could run the parallel agent here to generate new learning assets.
    # For now, we will clear the old assets or let the UI handle it.
    parallel_res = await run_agent(parallel_final_agent, json.dumps(draft_res))
    
    # Save the new roadmap
    save_user_roadmap(req.username, draft_res.get("roadmap_markdown", draft_res) if isinstance(draft_res, dict) else draft_res, parallel_res)
    
    # Re-initialize the knowledge graph based on the NEW roadmap
    new_kg_data = await run_agent(kg_extractor_agent, draft_res)
    # We should preserve mastery scores from the old KG to the new KG!
    old_mastery = {node["topic"]: node for node in kg.get("nodes", [])}
    for new_node in new_kg_data.get("nodes", []):
        if new_node["topic"] in old_mastery:
            new_node["mastery_score"] = old_mastery[new_node["topic"]].get("mastery_score", 0.0)
            new_node["last_reviewed"] = old_mastery[new_node["topic"]].get("last_reviewed")
            
    save_user_kg(req.username, new_kg_data)
    
    return {"status": "success", "roadmap": draft_res}

@app.post("/api/kg/init")
async def init_kg(req: InitKGRequest):
    user = get_user(req.username)
    if user and user.get("knowledge_graph"):
        return {"status": "success", "knowledge_graph": user["knowledge_graph"]}
    
    kg_data = await run_agent(kg_extractor_agent, req.roadmap_markdown)
    save_user_kg(req.username, kg_data)
    return {"status": "success", "knowledge_graph": kg_data}

@app.post("/api/flashcards/generate")
async def generate_flashcards(req: GenerateFlashcardsRequest):
    user = get_user(req.username)
    if not user or not user.get("knowledge_graph"):
        return {"status": "error", "message": "Knowledge graph not found. Please init first."}
    
    # If there are pending flashcards, return them instead of generating new ones
    if user.get("pending_flashcards") and len(user["pending_flashcards"]) > 0:
        return {"status": "success", "cards": user["pending_flashcards"]}
    
    kg = user["knowledge_graph"]
    flashcard_session = await run_agent(flashcard_generator_agent, json.dumps(kg))
    
    cards = flashcard_session.get("cards", [])
    save_pending_flashcards(req.username, cards)
    return {"status": "success", "cards": cards}

import datetime

@app.post("/api/flashcards/evaluate")
async def evaluate_flashcard(req: EvaluateFlashcardRequest):
    user = get_user(req.username)
    if not user or not user.get("knowledge_graph"):
        return {"status": "error", "message": "Knowledge graph not found."}
    
    # Run evaluation
    prompt = f"Flashcard:\\n{json.dumps(req.flashcard)}\\n\\nUser Answer:\\n{req.user_answer}"
    evaluation = await run_agent(flashcard_evaluator_agent, prompt)
    
    # Update KG
    kg = user["knowledge_graph"]
    topic_name = req.flashcard.get("topic")
    for node in kg.get("nodes", []):
        if node["topic"] == topic_name:
            node["mastery_score"] = max(0.0, min(100.0, node.get("mastery_score", 0.0) + evaluation.get("mastery_change", 0.0)))
            node["last_reviewed"] = datetime.datetime.utcnow().isoformat()
            break
            
    save_user_kg(req.username, kg)
    
    return {"status": "success", "evaluation": evaluation, "knowledge_graph": kg}

@app.post("/api/flashcards/save_pending")
async def save_pending_flashcards_api(req: SavePendingFlashcardsRequest):
    save_pending_flashcards(req.username, req.pending_flashcards)
    return {"status": "success"}

@app.post("/api/pomodoro/evaluate")
async def pomodoro_evaluate(req: PomodoroEvaluateRequest):
    user = get_user(req.username)
    if not user or not user.get("knowledge_graph"):
        return {"status": "error", "message": "Knowledge graph not found."}
        
    kg = user["knowledge_graph"]
    prompt = f"Recall Text:\\n{req.recall_text}\\n\\nCurrent Knowledge Graph:\\n{json.dumps(kg)}"
    
    evaluation = await run_agent(pomodoro_insight_agent, prompt)
    
    # Update KG
    updates = evaluation.get("mastery_updates", {})
    for node in kg.get("nodes", []):
        topic = node["topic"]
        if topic in updates:
            node["mastery_score"] = max(0.0, min(100.0, node.get("mastery_score", 0.0) + updates[topic]))
            node["last_reviewed"] = datetime.datetime.utcnow().isoformat()
            
    # Add new topics from the recall session to the graph
    new_topics = evaluation.get("new_topics", [])
    if new_topics:
        # new_topics is a list of dicts because the run_agent parses the JSON
        # Ensure last_reviewed is set
        for nt in new_topics:
            nt["last_reviewed"] = datetime.datetime.utcnow().isoformat()
        kg["nodes"].extend(new_topics)
            
    save_user_kg(req.username, kg)
    return {"status": "success", "evaluation": evaluation, "knowledge_graph": kg}

@app.post("/api/download_pdf")
async def download_pdf(req: PDFRequest):
    html_content = markdown.markdown(req.markdown_text)
    
    styled_html = f"""
    <html>
    <head>
    <style>
        body {{ font-family: sans-serif; line-height: 1.6; padding: 20px; }}
        h1, h2, h3 {{ color: #1a202c; }}
        code {{ background-color: #f7fafc; padding: 2px 4px; border-radius: 4px; }}
        pre {{ background-color: #f7fafc; padding: 10px; border-radius: 4px; overflow-x: auto; }}
        a {{ color: #3182ce; text-decoration: none; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #e2e8f0; padding: 8px; text-align: left; }}
    </style>
    </head>
    <body>
    {html_content}
    </body>
    </html>
    """
    
    # We use delete=False because FileResponse returns a response that reads the file asynchronously later.
    # The tempfile might be kept around, which is standard for FileResponse without background tasks.
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    try:
        from weasyprint import HTML
        HTML(string=styled_html).write_pdf(tmp.name)
    except (ImportError, OSError) as e:
        return {"status": "error", "message": "PDF generation failed. On Windows, this feature requires GTK3 to be installed."}
    
    from fastapi.responses import FileResponse
    return FileResponse(tmp.name, media_type="application/pdf", filename="My_Learning_Roadmap.pdf")

# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

@app.post("/api/kg/expand")
async def expand_kg(req: dict):
    import json
    username = req.get("username", "testuser")
    topic = req.get("topic")
    if not topic:
        return {"status": "error", "message": "Missing topic"}

    user = get_user(username)
    if not user or not user.get("knowledge_graph"):
        return {"status": "error", "message": "No knowledge graph"}
        
    kg = user["knowledge_graph"]
    
    prompt = f"Break down the topic '{topic}' into 3-5 subtopics. The parent_topic must be exactly '{topic}'."
    from app.agent import expand_topic_agent
    result = await run_agent(expand_topic_agent, prompt)
    
    if result and "nodes" in result:
        # deduplicate and add
        existing_topics = {n['topic'] for n in kg['nodes']}
        for new_node in result["nodes"]:
            if new_node.get("topic") not in existing_topics:
                kg['nodes'].append(new_node)
        
        save_user_kg(username, kg)
        return {"status": "success", "knowledge_graph": kg}
    else:
        return {"status": "error", "message": "Failed to expand topic"}
