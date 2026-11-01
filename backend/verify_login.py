import urllib.request, json, time

test_creds = [
    ("admin", "SuperAdmin@123", "SUPER_ADMIN"),
    ("principal", "Principal@123", "PRINCIPAL"),
    ("prin_alpha", "Principal@123", "PRINCIPAL"),
    ("accountant", "Accountant@123", "ACCOUNTANT"),
    ("finance", "Finance@123", "FINANCE"),
    ("staff", "Staff@123", "STAFF"),
    ("warden", "Warden@123", "HOSTEL_WARDEN"),
    ("librarian", "Librarian@123", "LIBRARIAN"),
]

for u, p, role in test_creds:
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/v1/auth/login",
            data=json.dumps({"identifier": u, "password": p}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        res = urllib.request.urlopen(req)
        body = json.loads(res.read().decode("utf-8"))
        print("[OK] " + role + ": " + u + " -> " + body["data"]["user"]["name"])
    except Exception as e:
        print("[FAIL] " + role + ": " + u + " -> " + str(e))
