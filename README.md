# Adaptive AI Learning Platform

An intelligent, dynamically generated adaptive learning platform built to tailor education precisely to the user's goals, prior knowledge, and learning style. Built with Next.js (React), FastAPI, and Google's Agent Development Kit (ADK) using Gemini.

## 🎯 Aim
To revolutionize self-paced learning by replacing static courses with an ever-growing, AI-driven learning roadmap. The platform acts as a personal tutor that understands your persona, diagnoses your current knowledge gaps, builds a custom curriculum, and continuously adapts based on your real-time performance and study sessions.

## ✨ Features

* **Conversational AI Onboarding:** A chatbot agent interviews you to understand your age, persona, interests, and end-goals before generating a curriculum.
* **Dynamic Roadmap Generation:** Generates a highly personalized markdown curriculum with prerequisite checks and recommended learning assets.
* **Interactive Knowledge Graph (Visual Web):** A physics-based, force-directed 2D graph of your entire curriculum.
  * **Infinite Expansion:** Click on any node in the graph to invoke an AI agent that breaks the topic down into 3-5 subtopics on the fly, making the knowledge web ever-growing until you master your goal.
* **Smart Flashcards:** Concept-first spaced repetition sessions based strictly on the topics you are currently learning in your Knowledge Graph.
* **Pomodoro & "Feynman" Brain Dump:** A built-in study timer. When a session ends, you write a "brain dump" of what you learned. An AI evaluator analyzes your recall, provides personalized feedback, automatically updates your mastery scores on the graph, and discovers new topics you stumbled upon.
* **Premium Glassmorphic UI:** A stunning, modern dark-mode interface with dynamic gradient orbs, backdrop blurs, and smooth transitions.

## 🚀 Future Goals

1. **Integrated Coding Workspace:** A browser-based interactive coding environment (like Monaco or a Jupyter sandbox) directly embedded in the roadmap for hands-on programming practice.
2. **Multi-modal Inputs:** Allow users to upload photos of handwritten notes or use voice-to-text to explain concepts during the Pomodoro Brain Dump.
3. **Peer-to-Peer Learning:** Shared knowledge graphs, leaderboards, and collaborative flashcard decks.
4. **Automated Resource Fetching:** Automatically querying YouTube, ArXiv, or documentation APIs to embed relevant videos and articles directly into the newly generated subtopics.

---

## 🛠️ How to Run

### Using Docker (Recommended, especially on Windows)

The easiest way to run the entire stack—and avoid any cross-platform dependency issues (like `weasyprint` requiring GTK3 on Windows)—is using Docker.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

1. Create a `.env` file inside the `backend/` directory and paste your Gemini API key:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
2. Open a terminal in the root project directory and run:
   ```bash
   docker compose up --build
   ```
3. Open your browser and navigate to `http://localhost:3000`.

---

### Manual Setup

The backend handles the SQLite database, AI agent orchestration (Gemini), and API endpoints.

**Prerequisites:** Python 3.10+

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install `uv` (if not already installed):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   # or on Windows: powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```
3. Create a virtual environment and install dependencies:
   ```bash
   uv sync
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
   *(Alternatively, if you prefer standard `pip`, you can create a virtual environment manually and run `pip install -r requirements.txt`)*
4. Environment Variables:
   Create a `.env` file in the `backend/` directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
   *(Note: The app will also attempt to use Google Cloud Default Credentials / Vertex AI if no API key is provided).*
5. Run the server:
   ```bash
   uvicorn app.fast_api_app:app --reload --port 8000
   ```

### 2. Frontend Setup (Next.js)

The frontend is a modern React application utilizing Tailwind CSS and Framer Motion.

**Prerequisites:** Node.js 20+

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`. 
   
*(Note: Log in with any username (e.g., "testuser") to start a fresh onboarding flow!)*
