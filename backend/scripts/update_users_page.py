with open(r'school-ms/src/app/(app)/users/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_tab = 'Principal & Leadership ({combinedUsers.filter'
new_tab = 'Leadership & Admins ({combinedUsers.filter'

if old_tab in content:
    content = content.replace(old_tab, new_tab)
    with open(r'school-ms/src/app/(app)/users/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated leadership tab successfully")
else:
    print("Tab target not found")
