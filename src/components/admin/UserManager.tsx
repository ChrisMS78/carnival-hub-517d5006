import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, UserCheck, UserX, Key } from "lucide-react";
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
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState("");
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

    // Combine profiles with roles - show ALL users for admin
    const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
      const userRole = userRoles?.find((r) => r.user_id === profile.id);
      return {
        ...profile,
        role: userRole?.role as AppRole | undefined,
      };
    });

    // Show all users (including those without roles)
    setUsers(usersWithRoles);
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

  const handleChangePassword = async () => {
    if (!selectedUserForPassword || !newPassword) return;
    
    if (newPassword.length < 6) {
      toast.error("Das Passwort muss mindestens 6 Zeichen haben");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('update-user-password', {
        body: { userId: selectedUserForPassword.id, newPassword },
      });

      if (response.error) {
        toast.error(response.error.message || "Fehler beim Ändern des Passworts");
      } else if (response.data?.error) {
        toast.error(response.data.error);
      } else {
        toast.success("Passwort erfolgreich geändert");
        setIsPasswordDialogOpen(false);
        setSelectedUserForPassword(null);
        setNewPassword("");
      }
    } catch (error) {
      toast.error("Fehler beim Ändern des Passworts");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPasswordDialog = (user: UserWithRole) => {
    setSelectedUserForPassword(user);
    setNewPassword("");
    setIsPasswordDialogOpen(true);
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
                    <Button variant="ghost" size="sm" onClick={() => openPasswordDialog(user)} title="Passwort ändern">
                      <Key className="w-4 h-4" />
                    </Button>
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

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Neues Passwort für <strong>{selectedUserForPassword?.display_name || selectedUserForPassword?.email}</strong>
            </p>
            <div>
              <Label htmlFor="new-password">Neues Passwort</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                minLength={6}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleChangePassword} disabled={isSubmitting || !newPassword}>
                {isSubmitting ? "Speichern..." : "Passwort ändern"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
