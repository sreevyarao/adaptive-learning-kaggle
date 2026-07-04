import requests
res = requests.post("http://localhost:8000/api/login", json={"username": "testuser"})
print(res.status_code)
print(res.json())
