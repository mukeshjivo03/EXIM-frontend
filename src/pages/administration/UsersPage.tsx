import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type CreateUserRequest,
} from "@/api/users";
import { userCreateSchema, userEditSchema, getZodError } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ── Constants ─────────────────────────────────────────────── */

const AVATAR_COLORS = [
  "bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500",
  "bg-amber-500", "bg-teal-500", "bg-pink-500", "bg-indigo-500",
];

/* ── Types ─────────────────────────────────────────────────── */

type FormData = {
  name: string;
  email: string;
  password: string;
};

type SortKey = "name" | "email";
type SortDir = "asc" | "desc";

const emptyForm: FormData = { name: "", email: "", password: "" };

/* ── Password strength ─────────────────────────────────────── */

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { score: 3, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score: 4, label: "Strong", color: "bg-green-500" };
  return { score: 5, label: "Very Strong", color: "bg-emerald-500" };
}

/* ── Component ─────────────────────────────────────────────── */

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search
  const [search, setSearch] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Fetch ───────────────────────────────────────────────── */

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const data = await getUsers();
      setUsers(data.sort((a, b) => a.id - b.id));
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Failed to load users");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ── Filtered & sorted ───────────────────────────────────── */

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case "name":
            cmp = a.name.localeCompare(b.name);
            break;
          case "email":
            cmp = a.email.localeCompare(b.email);
            break;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [users, search, sortKey, sortDir]);

  const hasFilters = search.trim() !== "";

  /* ── Sort handler ────────────────────────────────────────── */

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 ml-1 inline" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  }

  /* ── Avatar ──────────────────────────────────────────────── */

  function UserAvatar({ name, index }: { name: string; index: number }) {
    const initial = (name?.[0] ?? "?").toUpperCase();
    const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
    return (
      <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
        {initial}
      </div>
    );
  }

  /* ── CRUD handlers ───────────────────────────────────────── */

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: "" });
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    const schema = editingUser ? userEditSchema : userCreateSchema;
    const result = schema.safeParse(form);
    const zodErr = getZodError(result);
    if (zodErr) { setFormError(zodErr); return; }

    setSaving(true);
    setFormError("");
    try {
      if (editingUser) {
        const payload: Partial<CreateUserRequest> = {
          name: form.name,
          email: form.email,
        };
        if (form.password) payload.password = form.password;
        const updated = await updateUser(editingUser.id, payload);
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? updated : u))
        );
        toast.success(`User "${updated.name}" updated.`);
      } else {
        const created = await createUser(form);
        toast.success(`User "${created.name}" created.`);
        fetchUsers();
      }
      setDialogOpen(false);
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data;
        if (typeof data === "object" && data !== null) {
          const messages = Object.entries(data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
            .join("; ");
          setFormError(messages);
        } else {
          setFormError(typeof data === "string" ? data : err.message);
        }
      } else {
        setFormError("Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(`User "${name}" deleted.`);
      fetchUsers();
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Failed to delete user");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  /* ── Password strength for form ──────────────────────────── */

  const pwStrength = getPasswordStrength(form.password);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage user accounts
          </p>
        </div>
        <Button onClick={openCreate} className="btn-press gap-2">
          <Plus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                {filteredUsers.length}
                {hasFilters ? ` of ${users.length}` : ""} registered user
                {filteredUsers.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-48 sm:w-56"
              />
            </div>
          </div>

          {hasFilters && (
            <div className="pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setSearch("")}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
                        Name<SortIcon column="name" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("email")}>
                        Email<SortIcon column="email" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <UsersRound className="h-10 w-10 stroke-1" />
                          <p className="font-medium">
                            {hasFilters ? "No users match your filters" : "No users found"}
                          </p>
                          <p className="text-sm">
                            {hasFilters
                              ? "Try adjusting your search."
                              : "Create your first user to get started."}
                          </p>
                          {!hasFilters && (
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreate}>
                              <Plus className="h-3.5 w-3.5" />
                              Create User
                            </Button>
                          )}
                          {hasFilters && (
                            <Button size="sm" variant="ghost" onClick={() => setSearch("")}>
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user, i) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar name={user.name} index={user.id} />
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(user)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(user)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update the user details below. Leave password blank to keep unchanged."
                : "Fill in the details to create a new user."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password{" "}
                {editingUser && (
                  <span className="text-muted-foreground">(optional)</span>
                )}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={
                  editingUser ? "Leave blank to keep current" : "Enter password"
                }
                required={!editingUser}
              />
              {/* Password strength indicator */}
              {form.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < pwStrength.score ? pwStrength.color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pwStrength.label}
                  </p>
                </div>
              )}
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingUser ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
