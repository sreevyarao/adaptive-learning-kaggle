import sqlite3
conn = sqlite3.connect('app.db')
c = conn.cursor()
c.execute("SELECT username FROM users LIMIT 1")
print(c.fetchone()[0])
