import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            user_state TEXT,
            pre_requisites TEXT,
            roadmap_markdown TEXT,
            learning_assets TEXT,
            knowledge_graph TEXT,
            pending_flashcards TEXT
        )
    """)
    # Safely add columns if they don't exist (for existing tables)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN knowledge_graph TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN pending_flashcards TEXT")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()

def get_user(username: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "username": row["username"],
            "user_state": json.loads(row["user_state"]) if row["user_state"] else None,
            "pre_requisites": json.loads(row["pre_requisites"]) if row["pre_requisites"] else None,
            "roadmap_markdown": row["roadmap_markdown"],
            "learning_assets": json.loads(row["learning_assets"]) if row["learning_assets"] else None,
            "knowledge_graph": json.loads(row["knowledge_graph"]) if row["knowledge_graph"] else None,
            "pending_flashcards": json.loads(row["pending_flashcards"]) if row["pending_flashcards"] else None,
        }
    return None

def create_user_if_not_exists(username: str):
    user = get_user(username)
    if not user:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username) VALUES (?)", (username,))
        conn.commit()
        conn.close()
        return {"username": username, "user_state": None, "pre_requisites": None, "roadmap_markdown": None, "learning_assets": None, "knowledge_graph": None, "pending_flashcards": None}
    return user

def save_user_state(username: str, user_state: dict, pre_requisites: dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users 
        SET user_state = ?, pre_requisites = ?
        WHERE username = ?
    """, (json.dumps(user_state), json.dumps(pre_requisites), username))
    conn.commit()
    conn.close()

def save_user_roadmap(username: str, roadmap_markdown: str, learning_assets: dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users 
        SET roadmap_markdown = ?, learning_assets = ?
        WHERE username = ?
    """, (roadmap_markdown, json.dumps(learning_assets), username))
    conn.commit()
    conn.close()

def save_user_kg(username: str, knowledge_graph: dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users 
        SET knowledge_graph = ?
        WHERE username = ?
    """, (json.dumps(knowledge_graph), username))
    conn.commit()
    conn.close()

def save_pending_flashcards(username: str, pending_flashcards: list):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users 
        SET pending_flashcards = ?
        WHERE username = ?
    """, (json.dumps(pending_flashcards), username))
    conn.commit()
    conn.close()

