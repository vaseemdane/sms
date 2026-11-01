path = r'school-ms/src/app/(app)/users/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update loadActivePrincipal to use apiClient
old_load = '''  const loadActivePrincipal = React.useCallback(async () => {
    try {
      const session = authService.getSession();
      const headers: Record<string, string> = {};
      if (session?.token) {
        headers["Authorization"] = `Bearer ${session.token}`;
      }
      const res = await fetch("/api/v1/admin/principal", { headers });
      if (res.ok) {
        const json = await res.json();
        setActivePrincipal(json.data);
      } else {
        setActivePrincipal(null);
      }
    } catch {
      setActivePrincipal(null);
    }
  }, []);'''

new_load = '''  const loadActivePrincipal = React.useCallback(async () => {
    try {
      const res = await apiClient<{ success: boolean; data: any }>("/admin/principal");
      if (res && res.data) {
        setActivePrincipal(res.data);
      } else {
        setActivePrincipal(null);
      }
    } catch {
      setActivePrincipal(null);
    }
  }, []);'''

if old_load in content:
    content = content.replace(old_load, new_load)
    print("Replaced loadActivePrincipal")
else:
    print("old_load not found, checking...")

# 2. Add effectivePrincipal definition right after combinedUsers
after_combined = '''    return list;
  }, [users, activePrincipal, apiTeachers]);'''

new_effective = '''    return list;
  }, [users, activePrincipal, apiTeachers]);

  const effectivePrincipal = React.useMemo(() => {
    return activePrincipal || combinedUsers.find((u) => u.userType === "principal" && u.active !== false) || null;
  }, [activePrincipal, combinedUsers]);'''

if after_combined in content:
    content = content.replace(after_combined, new_effective)
    print("Added effectivePrincipal definition")
else:
    print("after_combined not found")

# 3. Replace activePrincipal in the Institutional Principal & Leadership Desk Card
card_start = '{/* INSTITUTIONAL PRINCIPAL & LEADERSHIP DESK CARD */}'
card_end = '{/* Main Table Card */}'

idx1 = content.find(card_start)
idx2 = content.find(card_end)

if idx1 != -1 and idx2 != -1:
    card_segment = content[idx1:idx2]
    # Replace all activePrincipal with effectivePrincipal in this segment
    updated_card_segment = card_segment.replace('activePrincipal', 'effectivePrincipal')
    content = content[:idx1] + updated_card_segment + content[idx2:]
    print("Updated card segment with effectivePrincipal")
else:
    print("Card segment boundaries not found")

# 4. In modals: replace activePrincipal with effectivePrincipal
content = content.replace(
    'disabled={provisionRole === "principal" && Boolean(activePrincipal)}',
    'disabled={provisionRole === "principal" && Boolean(effectivePrincipal)}'
)
content = content.replace(
    '{provisionRole === "principal" && (\n              <div className="space-y-3">\n                {activePrincipal ? (',
    '{provisionRole === "principal" && (\n              <div className="space-y-3">\n                {effectivePrincipal ? ('
)
content = content.replace(
    '<strong>{activePrincipal.name}</strong> ({activePrincipal.email}) is currently the sole active Principal',
    '<strong>{effectivePrincipal?.name}</strong> ({effectivePrincipal?.email}) is currently the sole active Principal'
)
content = content.replace(
    '{activePrincipal && (\n              <p className="text-text-secondary">{activePrincipal.name} ({activePrincipal.email})</p>\n            )}',
    '{effectivePrincipal && (\n              <p className="text-text-secondary">{effectivePrincipal.name} ({effectivePrincipal.email})</p>\n            )}'
)

# 5. Fix Teaching Faculty tab count
content = content.replace(
    'Teaching Faculty ({teachers.length})',
    'Teaching Faculty ({combinedUsers.filter(u => u.userType === "teacher").length})'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated users/page.tsx for active principal resolution.")

