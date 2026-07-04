import os
import google.auth
from google.adk.agents import Agent, LoopAgent, ParallelAgent, SequentialAgent
from google.adk.models import Gemini
from google.genai import types

from app.schemas import UserState, CurriculumOutput, QuizState, FinalRoadmap, CurriculumDraft, KnowledgeGraph, FlashcardSession, FlashcardEvaluation, PomodoroEvaluation

try:
    _, project_id = google.auth.default()
    if project_id:
        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project_id)
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
        if "GEMINI_API_KEY" not in os.environ:
            os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")
except Exception:
    pass


base_model = Gemini(
    model="gemini-flash-latest",
    retry_options=types.HttpRetryOptions(attempts=3),
)

orchestration_agent = Agent(
    name="orchestration_agent",
    model=base_model,
    instruction="""You are ONLY an onboarding data-collection agent. Your SOLE purpose is to converse with the user to gather 5 specific pieces of information: their age, persona, interests, goals, and previous knowledge base. 
    CRITICAL RULES:
    1. DO NOT attempt to teach, tutor, or guide the user through their learning journey.
    2. DO NOT ask them to install software or set up environments.
    3. Once you have a basic understanding of their 5 traits, you MUST IMMEDIATELY set `is_complete` to true. Do not drag out the conversation.
    Return a JSON structure representing the gathered state. Provide your conversational response in the 'reply' field.""",
    output_schema=UserState,
)

update_orchestration_agent = Agent(
    name="update_orchestration_agent",
    model=base_model,
    instruction="""You are an agent responsible for finding out the user's NEW learning goal to update their roadmap.
    They already have an existing roadmap and knowledge graph. Just ask them what they want to learn next or how they want to update their goals.
    Once they clearly state their new goal, IMMEDIATELY set `is_complete` to true.
    Return a JSON structure. You can map their new goal into the 'goals' field. Provide your conversational response in the 'reply' field.""",
    output_schema=UserState,
)

draft_agent = Agent(
    name="draft_agent",
    model=base_model,
    instruction="Draft an initial curriculum roadmap based on the user's state. Also identify pre-requisite topics they might need.",
    output_schema=CurriculumOutput,
)

evaluate_agent = Agent(
    name="evaluate_agent",
    model=base_model,
    instruction="Evaluate the curriculum draft. Refine it if necessary.",
    output_schema=CurriculumOutput,
)

curriculum_agent = LoopAgent(
    name="curriculum_agent",
    sub_agents=[draft_agent, evaluate_agent],
    max_iterations=5,
)

diagnosis_agent = Agent(
    name="diagnosis_agent",
    model=Gemini(model="gemini-2.5-pro", retry_options=types.HttpRetryOptions(attempts=3)),
    instruction="""You are an expert technical diagnostician. Based on the user's pre-requisites, state, and past quiz answers, generate a highly rigorous, thought-provoking quiz (Max 35 questions total over iterations).
    CRITICAL RULE: You MUST analyze their 'pastAnswers' to adapt the difficulty. If they struggle with previous questions, ask easier foundational questions to find their baseline. If they ace them, rapidly escalate the difficulty to evaluate their true peak strength. Do NOT ask random questions.
    Rules for Questions:
    1. Conceptual Depth: Avoid trivia. Ask scenario-based, problem-solving, or deep conceptual questions.
    2. Format Variety: Mix short-answer and multiple-choice questions. 
    3. Multiple-Choice: Provide extremely tricky, plausible distractors that test common misconceptions.
    Once satisfied that you have accurately gauged their proficiency, set is_satisfied to true and provide a detailed, critical diagnosis report highlighting their exact weaknesses and strengths.""",
    output_schema=QuizState,
)

pdf_agent = Agent(
    name="pdf_agent",
    model=base_model,
    instruction="Generate a markdown representation of the final roadmap that can be converted to PDF.",
)

learning_agent = Agent(
    name="learning_agent",
    model=base_model,
    instruction="Generate a structured JSON of learning modules for the learning webpage.",
)

parallel_final_agent = ParallelAgent(
    name="parallel_final_agent",
    sub_agents=[pdf_agent, learning_agent],
)

final_draft_agent = Agent(
    name="final_draft_agent",
    model=Gemini(model="gemini-2.5-pro", retry_options=types.HttpRetryOptions(attempts=3)),
    instruction="""You are a master curriculum architect. You have the user's initial draft, their exact quiz answers, and a critical diagnosis report.
    CRITICAL SYNCHRONIZATION REQUIREMENT:
    You MUST completely adapt the roadmap based on their quiz performance. 
    - If they struggled with specific questions (check their pastAnswers and the report), inject intense remedial modules and beginner resources for those topics.
    - If they answered questions flawlessly, aggressively accelerate the roadmap and skip the basics, replacing them with advanced architectural challenges.
    
    You MUST include for EVERY single module:
    - A deep-dive explanation of the concepts
    - Specific, actionable milestones
    - Estimated timeframes (e.g., hours/weeks)
    - Practical project ideas with step-by-step implementation guides
    - Extremely detailed resource recommendations (links, books, courses)
    
    CRITICAL PEDAGOGICAL RULES:
    1. Check Prerequisites: If the user lacks programming fluency (e.g. basic Python functions, lists, file I/O), you MUST explicitly slot in a "Module 0" for pure programming practice before any ML modules. Do not assume fluency if they are beginners.
    2. Pacing and Density: Do NOT stack too many new library concepts (e.g. vectorization, train/test split, fitting, evaluation) into a single module. Break dense topics into smaller, digestible ramps.
    3. Conceptual Anchors: New jargon must always be paired with concrete examples. Use analogies before code.
    4. Black-Boxing: For advanced concepts (like Transformers/Self-Attention), it is perfectly fine to teach the user how to *use* them via libraries (like HuggingFace) as black boxes, rather than forcing them to understand the internal math.
    
    Write thousands of words of high-quality Markdown formatting (using #, ##, ###, bullet points, bolding). Do NOT be concise. Be as detailed as a full textbook syllabus.""",
    output_schema=FinalRoadmap,
)

update_roadmap_agent = Agent(
    name="update_roadmap_agent",
    model=Gemini(model="gemini-2.5-pro", retry_options=types.HttpRetryOptions(attempts=3)),
    instruction="""You are a master curriculum architect updating an existing student's roadmap. 
    You are given the user's NEW learning goal and their CURRENT Knowledge Graph (which shows what they already know and their mastery levels).
    
    CRITICAL REQUIREMENTS:
    1. Do NOT reteach topics they already have high mastery in. You can briefly review them or jump straight into advanced applications.
    2. Focus heavily on charting the path to their NEW goal.
    3. Use the same detailed format as the original roadmap (deep-dive explanations, milestones, projects, resources).
    4. Write thousands of words of high-quality Markdown formatting. Be extremely detailed.
    """,
    output_schema=FinalRoadmap,
)

kg_extractor_agent = Agent(
    name="kg_extractor_agent",
    model=Gemini(model="gemini-2.5-pro", retry_options=types.HttpRetryOptions(attempts=3)),
    instruction="""You are a Knowledge Graph extraction expert. Analyze the provided learning roadmap and extract a list of atomic 'KnowledgeNodes'.
    CRITICAL RULE: You MUST extract topics hierarchically. 
    1. Identify broad modules (e.g. 'Machine Learning Basics') and set their `parent_topic` to null/None.
    2. Identify specific atomic concepts (e.g. 'Supervised Learning', 'Features', 'Labels') and set their `parent_topic` to the exact string name of their parent module (e.g. 'Machine Learning Basics').
    3. You can go multiple levels deep if needed.
    Set the initial mastery_score for all nodes to 0.0.""",
    output_schema=KnowledgeGraph,
)

flashcard_generator_agent = Agent(
    name="flashcard_generator_agent",
    model=Gemini(model="gemini-2.5-pro", retry_options=types.HttpRetryOptions(attempts=3)),
    instruction="""You are an expert Spaced Repetition Flashcard generator. You will be provided with the user's KnowledgeGraph containing topics and mastery scores.
    Generate a session of up to 50 flashcards.
    PRIORITIZATION RULES: Focus EXCLUSIVELY on topics that the user has actually started learning or already learned (e.g. `last_reviewed` is not null, or `mastery_score` > 0). 
    Do NOT randomly pick topics they haven't touched yet, unless they have zero learned topics, in which case introduce exactly 1-2 foundational topics to get them started.
    Among the learned topics, prioritize those with the LOWEST mastery scores and oldest review dates.
    The questions should be conceptual, testing actual understanding rather than rote memorization.
    Provide an expected_answer that captures the core essence of what a correct user response should contain.""",
    output_schema=FlashcardSession,
)

flashcard_evaluator_agent = Agent(
    name="flashcard_evaluator_agent",
    model=Gemini(model="gemini-2.5-flash", retry_options=types.HttpRetryOptions(attempts=3)),
    instruction="""You are an empathetic but rigorous flashcard evaluator. You will be given the original Flashcard and the User's Answer.
    1. Determine if the user is broadly correct (is_correct). They don't need the exact wording, just the right concept.
    2. Provide constructive, encouraging feedback. If they are wrong, explain why simply.
    3. Determine mastery_change. If correct, +10.0. If mostly correct, +5.0. If completely wrong, -10.0 (but floor the total at 0).""",
    output_schema=FlashcardEvaluation,
)

pomodoro_insight_agent = Agent(
    name="pomodoro_insight_agent",
    model=Gemini(model="gemini-2.5-pro", retry_options=types.HttpRetryOptions(attempts=3)),
    instruction="""You are a learning coach evaluating a 3-minute post-Pomodoro recall session. You will be given the user's recall text and their current KnowledgeGraph.
    Analyze what they wrote to see which topics they actually remembered and understood.
    1. Write a feedback_markdown summarizing their strengths, pointing out gaps, and giving actionable advice for the next session.
    2. Provide a dictionary of mastery_updates, increasing mastery for concepts they correctly recalled, and decreasing for concepts they misunderstood.
    3. EVER-GROWING GRAPH: If they mention new concepts that are NOT currently in the KnowledgeGraph, construct them as `KnowledgeNode`s and add them to `new_topics`. Set a fair initial `mastery_score` (e.g. 10.0-30.0 based on how well they described it). Always link new nodes to the most relevant existing topic via `parent_topic` if possible, otherwise leave it as None.""",
    output_schema=PomodoroEvaluation,
)

# Root agent doesn't actually run everything automatically here because we have an interactive UI.
# We will expose these agents via FastAPI custom endpoints.
root_agent = orchestration_agent

from google.adk.apps import App
app = App(
    root_agent=root_agent,
    name="app",
)

expand_topic_agent = Agent(
    name="ExpandTopicAgent",
    model=base_model,
    instruction="""
You are an expert tutor. Your job is to break down a specific topic into 3-5 smaller, atomic sub-concepts.
The user wants to explore the concept further. Return a KnowledgeGraph containing ONLY the newly created subtopics.
For each new subtopic:
- `topic`: The name of the subtopic
- `description`: A brief description
- `parent_topic`: Must be exactly the topic name provided in the user's prompt.
- `mastery_score`: 0.0
""",
    output_schema=KnowledgeGraph
)
