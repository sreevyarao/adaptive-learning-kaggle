import asyncio
import json
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import uuid

from app.agent import orchestration_agent

async def main():
    app_session_service = InMemorySessionService()
    session_id = str(uuid.uuid4())
    await app_session_service.create_session(app_name="app", user_id="user", session_id=session_id)
    runner = Runner(agent=orchestration_agent, app_name="app", session_service=app_session_service)
    
    final_output = None
    
    print("Running agent...")
    async for event in runner.run_async(
        user_id="user", session_id=session_id,
        new_message=types.Content(role="user", parts=[types.Part.from_text(text="I am a 25 year old software engineer interested in AI.")])
    ):
        if event.is_final_response():
            print("Final response:", event)
            
    session = await app_session_service.get_session(app_name="app", user_id="user", session_id=session_id)
    print("State:", session.state)

if __name__ == "__main__":
    asyncio.run(main())
