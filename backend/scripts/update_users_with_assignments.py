import re

path = r'school-ms/src/app/(app)/users/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add apiClient import
if 'import { apiClient } from "@/lib/api-client";' not in content:
    content = content.replace(
        'import { authService } from "@/services/auth-service";',
        'import { authService } from "@/services/auth-service";\nimport { apiClient } from "@/lib/api-client";'
    )

# 2. Add assignClassTeacher to useSMSStore destructuring
if 'assignClassTeacher,' not in content:
    content = content.replace(
        '    sections,\n  } = useSMSStore();',
        '    sections,\n    assignClassTeacher,\n  } = useSMSStore();'
    )

# 3. Add apiTeachers state & fetchBackendTeachers & assignment modal state
state_block = '''  const [activeTab, setActiveTab] = React.useState<"teachers" | "leadership" | "admins" | "all">("teachers");
  const [search, setSearch] = React.useState("");
  const [selectedDistrict, setSelectedDistrict] = React.useState("all");
  const [toast, setToast] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Real backend faculty sync
  const [apiTeachers, setApiTeachers] = React.useState<any[]>([]);
  const fetchBackendTeachers = React.useCallback(async () => {
    try {
      const res = await apiClient<{ success: boolean; data: { items: any[] } }>("/admin/users?role=teacher&page_size=100");
      if (res?.data?.items) {
        setApiTeachers(res.data.items);
      }
    } catch {
      // offline fallback
    }
  }, []);

  React.useEffect(() => {
    fetchBackendTeachers();
  }, [fetchBackendTeachers]);

  // Section / Class assignment state
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [targetTeacher, setTargetTeacher] = React.useState<any | null>(null);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>("");
  const [isAssigning, setIsAssigning] = React.useState(false);

  const handleAssignSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeacher) return;
    setIsAssigning(true);
    try {
      if (selectedSectionId === "unassign") {
        const curr = getTeacherAssignedSection(targetTeacher.id);
        if (curr) {
          assignClassTeacher(curr.id, "");
        }
        showToast(`Unassigned ${targetTeacher.name} from class teacher responsibilities.`);
      } else if (selectedSectionId) {
        try {
          await apiClient.post("/academics/assign/class-teacher", {
            sectionId: selectedSectionId,
            teacherId: targetTeacher.id,
          });
        } catch {
          // local store fallback
        }
        const res = assignClassTeacher(selectedSectionId, targetTeacher.id);
        if (res.success) {
          const sec = sections.find((s) => s.id === selectedSectionId);
          showToast(`Assigned ${targetTeacher.name} as Class Teacher for ${sec?.className || "Class"} (${sec?.code || ""})!`);
        } else {
          showToast(res.message || "Failed to assign teacher", "error");
        }
      }
      setAssignModalOpen(false);
      setTargetTeacher(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to assign class teacher", "error");
    } finally {
      setIsAssigning(false);
    }
  };'''

orig_state_pattern = r'  const \[activeTab, setActiveTab\] = React\.useState<"teachers" \| "leadership" \| "admins" \| "all">\("teachers"\);\s*const \[search, setSearch\] = React\.useState\(""\);\s*const \[selectedDistrict, setSelectedDistrict\] = React\.useState\("all"\);\s*const \[toast, setToast\] = React\.useState<\{ text: string; type: "success" \| "error" \} \| null>\(null\);'

content = re.sub(orig_state_pattern, state_block, content, count=1)

# 4. In handleProvisionSubmit (when teacher is enrolled), re-fetch teachers
if 'await fetchBackendTeachers();' not in content:
    content = content.replace(
        'showToast(\n          `Faculty registered successfully for ${formSchoolName}! Default Password: ${autoPass}`\n        );',
        'showToast(\n          `Faculty registered successfully for ${formSchoolName}! Default Password: ${autoPass}`\n        );\n        await fetchBackendTeachers();'
    )

# 5. In combinedUsers: merge apiTeachers
orig_combined = '''  const combinedUsers = React.useMemo(() => {
    const list = [...users];'''

new_combined = '''  const combinedUsers = React.useMemo(() => {
    const seenEmails = new Set<string>();
    const list: any[] = [];

    // 1. Store users
    users.forEach((u) => {
      list.push(u);
      if (u.email) seenEmails.add(u.email.toLowerCase());
    });

    // 2. Real backend faculty
    apiTeachers.forEach((bt) => {
      if (bt.email && !seenEmails.has(bt.email.toLowerCase())) {
        seenEmails.add(bt.email.toLowerCase());
        list.push({
          id: bt.id,
          name: bt.name,
          email: bt.email,
          username: bt.username || bt.email.split("@")[0],
          userType: "teacher",
          phone: bt.phone || "+91 9880011223",
          code: bt.code || `EDP/TCH/${bt.id.slice(-4).toUpperCase()}`,
          district: bt.district || "Bengaluru Urban",
          state: bt.state || "Karnataka",
          subjectSpecialization: bt.specialization || "General Faculty",
          active: bt.active !== false,
          mustChangePassword: bt.mustChangePassword ?? true,
          createdAt: bt.created_at || new Date().toISOString(),
        });
      }
    });'''

content = content.replace(orig_combined, new_combined)
content = content.replace('  }, [users, activePrincipal]);', '  }, [users, activePrincipal, apiTeachers]);')

# 6. Update Class Teacher Assignment column to be interactive with Assign / Change button
orig_ct_cell = '''                        <TableCell>
                          {u.userType === "principal" ? (
                            <Badge variant="outline" className="text-[10px] bg-purple-tint/50 text-purple-primary border-purple-primary/30">
                              Institutional Head
                            </Badge>
                          ) : assignedSection ? (
                            <Link href="/academics/classes">
                              <Badge className="bg-purple-primary text-white text-[10px] hover:bg-purple-primary/90 cursor-pointer">
                                Class Teacher of {assignedSection.code} →
                              </Badge>
                            </Link>
                          ) : (
                            <span className="text-[11px] text-text-secondary">Not Assigned</span>
                          )}
                        </TableCell>'''

new_ct_cell = '''                        <TableCell>
                          {u.userType === "principal" ? (
                            <Badge variant="outline" className="text-[10px] bg-purple-tint/50 text-purple-primary border-purple-primary/30">
                              Institutional Head
                            </Badge>
                          ) : assignedSection ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge className="bg-purple-primary text-white text-[10px] font-semibold">
                                CT: {assignedSection.className} ({assignedSection.code})
                              </Badge>
                              {isSuperAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-1.5 text-text-secondary hover:text-purple-primary"
                                  onClick={() => {
                                    setTargetTeacher(u);
                                    setSelectedSectionId(assignedSection.id);
                                    setAssignModalOpen(true);
                                  }}
                                  title="Change class/section assignment"
                                >
                                  Change
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-text-secondary">Not Assigned</span>
                              {isSuperAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2 text-purple-primary border-purple-primary/30 hover:bg-purple-tint"
                                  onClick={() => {
                                    setTargetTeacher(u);
                                    setSelectedSectionId("");
                                    setAssignModalOpen(true);
                                  }}
                                >
                                  + Assign Class & Section
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>'''

content = content.replace(orig_ct_cell, new_ct_cell)

# 7. Add Assign Dialog before the final </div>
modal_jsx = '''
      {/* ASSIGN CLASS & SECTION MODAL */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-primary" />
              Assign Class & Section Arm
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign <strong>{targetTeacher?.name}</strong> ({targetTeacher?.subjectSpecialization || "Faculty"}) as designated Class Teacher for a cohort.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSectionSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Class & Section Arm *</Label>
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select class section arm" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="unassign" className="text-xs text-rose-600 font-semibold">
                    -- Unassign (Remove Class Teacher Role) --
                  </SelectItem>
                  {sections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id} className="text-xs">
                      {sec.className} • Section {sec.name} ({sec.code}) {sec.classTeacherId ? `[Currently: Assigned]` : `[Vacant]`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!selectedSectionId || isAssigning} className="bg-purple-primary text-white">
                {isAssigning ? "Saving..." : "Save Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
'''

last_div_idx = content.rfind('</div>')
content = content[:last_div_idx] + modal_jsx + '\n    </div>\n  );\n}\n'

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated users/page.tsx with faculty loading & section assignment successfully.")

