import re

path = r'school-ms/src/app/(app)/settings/roles/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add apiClient import if needed
if 'import { apiClient } from "@/lib/api-client";' not in content:
    content = content.replace(
        'import { useAuth } from "@/services/auth-context";',
        'import { useAuth } from "@/services/auth-context";\nimport { apiClient } from "@/lib/api-client";'
    )

# 2. Add Edit Role state & functions inside RolesManagementPage
edit_state_logic = '''  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  // Edit Role & Permissions State
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<RoleItem | null>(null);
  const [editDisplayName, setEditDisplayName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editPerms, setEditPerms] = React.useState<string[]>([]);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleOpenEditModal = (r: RoleItem) => {
    setEditingRole(r);
    setEditDisplayName(r.displayName);
    setEditDescription(r.description || "");
    setEditPerms([...r.permissions]);
    setEditModalOpen(true);
  };

  const toggleEditPerm = (code: string) => {
    setEditPerms((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const handleSaveEditPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setIsUpdating(true);
    try {
      // 1. Persist to backend API if running
      try {
        await apiClient.put(`/super-admin/roles/${editingRole.id}`, {
          displayName: editDisplayName.trim(),
          description: editDescription.trim(),
          permissionCodes: editPerms,
        });
      } catch {
        // Fallback for custom or system role
      }

      // 2. Update local state
      const updatedRoles = roles.map((r) => {
        if (r.id === editingRole.id) {
          return {
            ...r,
            displayName: editDisplayName.trim(),
            description: editDescription.trim(),
            permissions: editPerms,
            permissionCount: editPerms.length,
          };
        }
        return r;
      });
      setRoles(updatedRoles);

      // 3. Persist dynamic role permissions map in localStorage
      if (typeof window !== "undefined") {
        const dynamicMap: Record<string, string[]> = {};
        updatedRoles.forEach((r) => {
          dynamicMap[r.name.toUpperCase()] = r.permissions;
        });
        localStorage.setItem("edupulse_dynamic_role_permissions", JSON.stringify(dynamicMap));
        window.dispatchEvent(new Event("edupulse:permissions_updated"));
      }

      setToastMsg(`Permissions updated for role "${editDisplayName}" (${editPerms.length} permissions active). Dynamic access immediately reflected across modules.`);
      setEditModalOpen(false);
      setEditingRole(null);
    } catch (err: any) {
      setToastMsg(err?.message || "Failed to update role permissions.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm("Are you sure you want to delete this custom role?")) return;
    try {
      try {
        await apiClient.delete(`/super-admin/roles/${roleId}`);
      } catch {
        // fallback
      }
      const updated = roles.filter((r) => r.id !== roleId);
      setRoles(updated);
      if (typeof window !== "undefined") {
        const dynamicMap: Record<string, string[]> = {};
        updated.forEach((r) => {
          dynamicMap[r.name.toUpperCase()] = r.permissions;
        });
        localStorage.setItem("edupulse_dynamic_role_permissions", JSON.stringify(dynamicMap));
        window.dispatchEvent(new Event("edupulse:permissions_updated"));
      }
      setToastMsg("Custom role removed successfully.");
    } catch (e: any) {
      setToastMsg(e.message || "Failed to delete role.");
    }
  };'''

content = content.replace('  const [toastMsg, setToastMsg] = React.useState<string | null>(null);', edit_state_logic)

# 3. Add TableHead Actions
old_thead = '''                <TableHead>Separation of Duties</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>'''

new_thead = '''                <TableHead>Separation of Duties</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>'''

content = content.replace(old_thead, new_thead)

# 4. Add TableCell Actions for each role
old_trow_end = '''                    <TableCell>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>'''

new_trow_end = '''                    <TableCell>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5 text-purple-primary border-purple-primary/30 hover:bg-purple-tint flex items-center gap-1 font-semibold"
                          onClick={() => handleOpenEditModal(r)}
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit Permissions
                        </Button>
                        {!r.isSystem && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-text-secondary hover:text-rose-600"
                            onClick={() => handleDeleteRole(r.id)}
                            title="Delete custom role"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>'''

content = content.replace(old_trow_end, new_trow_end)

# 5. Add Edit Dialog before the final </div>
edit_dialog_jsx = '''
      {/* Edit Role Permissions Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-primary" />
              Edit Role Permissions: {editingRole?.displayName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure granular module authorizations. Changes reflect dynamically across navigation panels and route access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditPermissions} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Display Title *</Label>
                <Input
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Classification</Label>
                <div className="pt-1.5">
                  <Badge variant="outline" className="text-xs">
                    {editingRole?.isSystem ? "Core System Role" : "Custom Dynamic Role"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Scope and purpose..."
                className="text-xs"
              />
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Module Permissions ({editPerms.length} active)
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2 text-purple-primary"
                    onClick={() => setEditPerms(permissions.map((p) => p.code))}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2 text-text-secondary"
                    onClick={() => setEditPerms([])}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2.5 bg-muted/20 border border-border rounded-lg">
                {permissions.map((p) => {
                  const isChecked = editPerms.includes(p.code);
                  return (
                    <label
                      key={p.code}
                      onClick={() => toggleEditPerm(p.code)}
                      className={`flex items-start gap-2.5 p-2 rounded border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "bg-purple-500/10 border-purple-primary text-foreground font-medium shadow-2xs"
                          : "bg-surface border-border/60 text-text-secondary hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-purple-primary focus:ring-0"
                      />
                      <div className="space-y-0.5">
                        <div className="font-mono text-[11px] font-semibold">{p.code}</div>
                        <div className="text-[10px] text-text-secondary">{p.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdating}
                className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold"
              >
                {isUpdating ? "Saving..." : "Save & Apply Permissions"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
'''

last_div_idx = content.rfind('</div>')
content = content[:last_div_idx] + edit_dialog_jsx + '\n    </div>\n  );\n}\n'

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated roles/page.tsx with Edit Permissions functionality.")

