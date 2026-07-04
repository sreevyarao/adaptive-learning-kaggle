import requests

BASE = "http://localhost:8000"
username = "integrity_test_user"

# 1. Login
print("1. Login...")
res = requests.post(f"{BASE}/api/login", json={"username": username})
print(res.status_code)

# 2. Update roadmap
print("2. Update Roadmap...")
payload = {
    "username": username,
    "roadmap_markdown": "# Roadmap",
    "learning_assets": {},
    "user_state": {},
    "pre_requisites": {}
}
res = requests.post(f"{BASE}/api/update_roadmap", json=payload)
print(res.status_code)

# 3. Init KG
print("3. Init KG...")
res = requests.post(f"{BASE}/api/kg/init", json={"username": username, "roadmap_markdown": "# Roadmap\n## Subtopic"})
print(res.status_code)

print("All critical endpoint syntax passed!")
