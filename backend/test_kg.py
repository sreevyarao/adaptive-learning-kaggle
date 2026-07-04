import sqlite3
import json

conn = sqlite3.connect('../backend/app.db')
c = conn.cursor()
c.execute("SELECT knowledge_graph FROM users LIMIT 1")
row = c.fetchone()
if row and row[0]:
    kg = json.loads(row[0])
    print(f"Nodes count: {len(kg.get('nodes', []))}")
    for n in kg.get('nodes', [])[:5]:
        print(n.get('topic'), n.get('parent_topic'))
else:
    print("No KG")
