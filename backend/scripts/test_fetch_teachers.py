import urllib.request
import json

req = urllib.request.Request(
    'http://localhost:3000/api/v1/auth/login',
    data=json.dumps({'identifier': 'admin', 'password': 'SuperAdmin@123'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode('utf-8'))['data']['token']

req2 = urllib.request.Request(
    'http://localhost:3000/api/v1/admin/users?role=teacher&page_size=100',
    headers={'Authorization': f'Bearer {token}'}
)
with urllib.request.urlopen(req2) as resp2:
    data = json.loads(resp2.read().decode('utf-8'))
    items = data['data']['items']
    print(f'Total teachers with role=teacher: {len(items)}')
    for t in items:
        print(f"  - {t['name']} ({t['email']}) [id: {t['id']}]")

