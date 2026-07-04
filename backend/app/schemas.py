from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class UserState(BaseModel):
    age: Optional[int] = None
    persona: Optional[str] = None
    interests: List[str] = Field(default_factory=list)
    goals: List[str] = Field(default_factory=list)
    previous_knowledge: str = ""
    is_complete: bool = False
    reply: str = Field(description="The conversational reply to send to the user asking for more details or acknowledging their input.")

class CurriculumDraft(BaseModel):
    modules: List[str] = Field(description="List of learning modules")
    description: str = Field(description="Description of the draft")

class PreRequisites(BaseModel):
    topics: List[str] = Field(description="List of prerequisite topics to check")

class CurriculumOutput(BaseModel):
    draft: CurriculumDraft
    pre_requisites: PreRequisites

class Question(BaseModel):
    question_text: str
    question_type: Literal["mcq", "short_form"]
    options: Optional[List[str]] = None

class QuizState(BaseModel):
    questions: List[Question] = Field(default_factory=list)
    is_satisfied: bool = False
    diagnosis_report: str = ""

class FinalRoadmap(BaseModel):
    roadmap_markdown: str
    learning_content_json: str

class KnowledgeNode(BaseModel):
    topic: str = Field(description="The atomic topic or concept")
    description: str = Field(description="A brief description of this concept")
    mastery_score: float = Field(default=0.0, description="Mastery score from 0 to 100")
    last_reviewed: Optional[str] = Field(default=None, description="ISO timestamp of last review")
    parent_topic: Optional[str] = Field(default=None, description="The parent topic this concept belongs to, or None if it is a top-level module.")

class KnowledgeGraph(BaseModel):
    nodes: List[KnowledgeNode] = Field(default_factory=list)

class Flashcard(BaseModel):
    id: str = Field(description="A unique ID for this flashcard")
    question: str = Field(description="The question to ask the user")
    expected_answer: str = Field(description="The ideal correct answer for the evaluator to compare against")
    topic: str = Field(description="The specific KnowledgeNode topic this tests")

class FlashcardSession(BaseModel):
    cards: List[Flashcard] = Field(default_factory=list, description="A batch of up to 50 flashcards")

class FlashcardEvaluation(BaseModel):
    is_correct: bool = Field(description="Whether the user was broadly correct")
    feedback: str = Field(description="Feedback to show the user")
    mastery_change: float = Field(description="How much to change the mastery score for this topic (e.g. +10, -5)")

class PomodoroEvaluation(BaseModel):
    feedback_markdown: str = Field(description="Detailed insights, strengths, and weaknesses from the recall session")
    mastery_updates: dict[str, float] = Field(description="Dictionary mapping topic strings to mastery score changes (e.g. {'Linear Regression': +15.0})")
    new_topics: List[KnowledgeNode] = Field(default_factory=list, description="New topics the user has learned that should be added to the Knowledge Graph")
