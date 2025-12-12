import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles"> & { is_active?: boolean };
type UserRole = Tables<"user_roles">;
type AppRole = "admin" | "redakteur";

interface UserWithRole extends Profile {
  role?: AppRole;
}

export default function UserManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    display_name: "",
    role: "redakteur" as AppRole,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    
    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast.error("Fehler beim Laden der Benutzer");
      setIsLoading(false);
      return;
    }

    // Fetch user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    setRoles(userRoles || []);

    // Combine profiles with roles
    const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
      const userRole = userRoles?.find((r) => r.user_id === profile.id);
      return {
        ...profile,
        role: userRole?.role as AppRole | undefined,
      };
    });

    // Filter to only show users who have a role (admin or redakteur)
    const backendUsers = usersWithRoles.filter((u) => u.role === "admin" || u.role === "redakteur");
    setUsers(backendUsers);
    setIsLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create the user via Supabase Auth Admin (we'll use edge function for this)
      // For now, we'll create a simple signup and then add the role
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: formData.display_name,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          toast.error("Diese E-Mail ist bereits registriert");
        } else {
          toast.error(signUpError.message);
        }
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        toast.error("Fehler beim Erstellen des Benutzers");
        setIsSubmitting(false);
        return;
      }

      // Update the profile with display_name
      await supabase
        .from("profiles")
        .update({ display_name: formData.display_name, is_active: true })
        .eq("id", authData.user.id);

      // Add the role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: formData.role });

      if (roleError) {
        toast.error("Benutzer erstellt, aber Rolle konnte nicht zugewiesen werden");
      } else {
        toast.success("Benutzer erfolgreich erstellt");
      }

      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error("Fehler beim Erstellen des Benutzers");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserWithRole) => {
    const newActiveState = !user.is_active;
    
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: newActiveState })
      .eq("id", user.id);

    if (error) {
      toast.error("Fehler beim Aktualisieren");
    } else {
      toast.success(newActiveState ? "Benutzer aktiviert" : "Benutzer deaktiviert");
      fetchUsers();
    }
  };

  const handleRoleChange = async (user: UserWithRole, newRole: AppRole) => {
    // First check if role exists
    const existingRole = roles.find((r) => r.user_id === user.id);

    if (existingRole) {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", user.id);

      if (error) {
        toast.error("Fehler beim Ändern der Rolle");
      } else {
        toast.success("Rolle aktualisiert");
        fetchUsers();
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: newRole });

      if (error) {
        toast.error("Fehler beim Zuweisen der Rolle");
      } else {
        toast.success("Rolle zugewiesen");
        fetchUsers();
      }
    }
  };

  const handleDeleteUser = async (user: UserWithRole) => {
    if (!confirm(`Möchten Sie den Benutzer "${user.display_name || user.email}" wirklich löschen?`)) {
      return;
    }

    // First delete the role
    await supabase.from("user_roles").delete().eq("user_id", user.id);

    // Deactivate the user (we can't delete auth.users from client)
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", user.id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Benutzer wurde deaktiviert");
      fetchUsers();
    }
  };

  const resetForm = () => {
    setFormData({ email: "", password: "", display_name: "", role: "redakteur" });
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Benutzerverwaltung</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Neuer Benutzer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Benutzer erstellen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="display_name">Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Rolle</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: AppRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="redakteur">Redakteur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Erstellen..." : "Erstellen"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Keine Benutzer vorhanden
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                      {user.is_active ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{user.display_name || "Kein Name"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select
                      value={user.role || "redakteur"}
                      onValueChange={(value: AppRole) => handleRoleChange(user, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="redakteur">Redakteur</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`active-${user.id}`}
                        checked={user.is_active ?? true}
                        onCheckedChange={() => handleToggleActive(user)}
                      />
                      <Label htmlFor={`active-${user.id}`} className="text-sm cursor-pointer">
                        Aktiv
                      </Label>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
