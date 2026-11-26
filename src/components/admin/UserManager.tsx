import { useState, useEffect } from "react";
import { siteApi } from "@/lib/siteApi";
import { useAuth } from "@/hooks/useAuth";
import { LastEdit } from "./LastEdit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, UserCheck, UserX, Key, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/siteTypes";

type Profile = Tables<"profiles"> & { is_active?: boolean };
type AppRole = "admin" | "redakteur";

interface UserWithRole extends Profile {
  role?: AppRole;
}

export default function UserManager() {
  const { user: currentAccount } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirmation: "",
    display_name: "",
    username: "",
    role: "redakteur" as AppRole,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    
    // Fetch profiles
    const { data: profiles, error: profilesError } = await siteApi
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast.error("Fehler beim Laden der Benutzer");
      setIsLoading(false);
      return;
    }

    // Fetch user roles
    const { data: userRoles, error: rolesError } = await siteApi
      .from("user_roles")
      .select("*");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }


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
    if (isSubmitting) return;
    const bytes = new TextEncoder().encode(formData.password).length;
    if (formData.password.length < 12 || bytes > 72) {
      toast.error("Das Passwort muss mindestens 12 Zeichen haben und darf höchstens 72 Bytes lang sein.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(formData.username.trim())) {
      toast.error("Benutzername: 3–64 Zeichen (Buchstaben, Zahlen, Punkt, Bindestrich, Unterstrich).");
      return;
    }
    if (formData.password !== formData.password_confirmation) {
      toast.error("Die Passwörter stimmen nicht überein.");
      return;
    }
    setIsSubmitting(true);

    try {
      const { error } = await siteApi.createUser(formData);
      if (error) { toast.error(error.message); return; }
      toast.success("Benutzer erfolgreich erstellt");

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
    
    const { error } = await siteApi
      .from("profiles")
      .update({ is_active: newActiveState })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(newActiveState ? "Benutzer aktiviert" : "Benutzer deaktiviert");
      fetchUsers();
    }
  };

  const handleRoleChange = async (user: UserWithRole, newRole: AppRole) => {
    const { error } = await siteApi.from("user_roles").update({ role: newRole }).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else { toast.success("Rolle aktualisiert"); fetchUsers(); }
  };

  const handleDeleteUser = async (user: UserWithRole) => {
    if (!confirm(`Möchten Sie den Benutzer "${user.display_name || user.email}" endgültig löschen? Das Konto kann nicht wiederhergestellt werden. Erstellte Inhalte bleiben erhalten.`)) {
      return;
    }

    const { error } = await siteApi.deleteUser(user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Benutzer endgültig gelöscht");
      await fetchUsers();
    }
  };

  const resetForm = () => {
    setFormData({ email: "", password: "", password_confirmation: "", display_name: "", username: "", role: "redakteur" });
    setShowPassword(false);
    setIsDialogOpen(false);
  };

  const handleChangePassword = async () => {
    if (!selectedUserForPassword || !newPassword) return;
    
    if (newPassword.length < 12) {
      toast.error("Das Passwort muss mindestens 12 Zeichen haben");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await siteApi.changePassword(selectedUserForPassword.id, newPassword);

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
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (isSubmitting) return; if (open) setIsDialogOpen(true); else resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Neuer Benutzer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
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
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  autoComplete="off"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  minLength={3}
                  maxLength={64}
                  placeholder="z. B. karneval"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Eindeutiger Name für die Anmeldung.</p>
              </div>
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Passwort</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-12"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={12}
                    maxLength={72}
                    required
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Passwörter ausblenden" : "Passwörter anzeigen"} aria-pressed={showPassword} title={showPassword ? "Passwörter ausblenden" : "Passwörter anzeigen"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Mindestens 12 Zeichen, maximal 72 Bytes.</p>
              </div>
              <div>
                <Label htmlFor="password-confirmation">Passwort wiederholen</Label>
                <Input
                  id="password-confirmation"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.password_confirmation}
                  onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                  minLength={12}
                  maxLength={72}
                  required
                  aria-invalid={!!formData.password_confirmation && formData.password !== formData.password_confirmation}
                  aria-describedby="password-match"
                />
                <p id="password-match" aria-live="polite" className="text-sm text-destructive mt-1">
                  {formData.password_confirmation && formData.password !== formData.password_confirmation ? "Die Passwörter stimmen nicht überein." : ""}
                </p>
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
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting || !formData.password_confirmation || formData.password !== formData.password_confirmation}>
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
                      <p className="text-sm text-muted-foreground">Benutzername: {user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <LastEdit record={user} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select
                      value={user.role || "redakteur"}
                      disabled={user.id === currentAccount?.id}
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
                        disabled={user.id === currentAccount?.id}
                        onCheckedChange={() => handleToggleActive(user)}
                      />
                      <Label htmlFor={`active-${user.id}`} className="text-sm cursor-pointer">
                        Aktiv
                      </Label>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openPasswordDialog(user)} title="Passwort ändern">
                      <Key className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} disabled={user.id === currentAccount?.id} title="Benutzer endgültig löschen">
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
                placeholder="Mindestens 12 Zeichen"
                minLength={12}
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
