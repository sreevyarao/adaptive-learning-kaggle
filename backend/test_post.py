import requests
import json

data = {"username": "jeevan", "topic": "Python 3"}
try:
    res = requests.post("http://localhost:8000/api/kg/expand", json=data)
    print(res.status_code)
    data = res.json()
    if data.get("status") == "success":
        print(f"Success! Now has {len(data['knowledge_graph']['nodes'])} nodes")
    else:
        print(data)
except Exception as e:
    print(e)
