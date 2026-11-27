import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Home } from "lucide-react";
import { Link } from "react-router-dom";
import EventsManager from "./EventsManager";
import GalleryManager from "./GalleryManager";
import AboutManager from "./AboutManager";
import ContactManager from "./ContactManager";
import SiteSettingsManager from "./SiteSettingsManager";
import UserManager from "./UserManager";
import PageBackgroundManager from "./PageBackgroundManager";
import { Overview, TrashManager, AuditManager, OwnPassword } from "./ManagementTools";
import { BackupManager } from "./BackupManager";
import { LegalManager, LegalWarning } from "./LegalManager";

export default function AdminDashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [legalVersion, setLegalVersion] = useState(0);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-display font-bold text-primary">
              K.E.B e.V.
            </Link>
            <span className="text-muted-foreground">{isAdmin ? "Admin" : "Redakteur"}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.username || user?.email}</span>
            <Link to="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Website
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isAdmin && <LegalWarning version={legalVersion} onNavigate={setActiveTab} />}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto justify-start w-full gap-1 p-2">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="events">Termine</TabsTrigger>
            <TabsTrigger value="gallery">Galerie</TabsTrigger>
            <TabsTrigger value="about">Über uns</TabsTrigger>
            <TabsTrigger value="trash">Papierkorb</TabsTrigger>
            <TabsTrigger value="password">Mein Passwort</TabsTrigger>
            {isAdmin && <>
              <TabsTrigger value="backgrounds">Hintergründe</TabsTrigger>
              <TabsTrigger value="contact">Nachrichten</TabsTrigger>
              <TabsTrigger value="settings">Einstellungen</TabsTrigger>
              <TabsTrigger value="imprint">Impressum</TabsTrigger>
              <TabsTrigger value="privacy">Datenschutz</TabsTrigger>
              <TabsTrigger value="users">Benutzer</TabsTrigger>
              <TabsTrigger value="audit">Änderungshistorie</TabsTrigger>
              <TabsTrigger value="backup">Datensicherung</TabsTrigger>
            </>}
          </TabsList>

          <TabsContent value="overview"><Overview /></TabsContent>
          <TabsContent value="trash"><TrashManager isAdmin={isAdmin} /></TabsContent>
          <TabsContent value="password"><OwnPassword /></TabsContent>
          <TabsContent value="events">
            <EventsManager />
          </TabsContent>

          <TabsContent value="gallery">
            <GalleryManager />
          </TabsContent>

          <TabsContent value="about">
            <AboutManager />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="backgrounds">
                <PageBackgroundManager />
              </TabsContent>

              <TabsContent value="contact">
                <ContactManager />
              </TabsContent>

              <TabsContent value="settings">
                <SiteSettingsManager />
              </TabsContent>

              <TabsContent value="imprint"><LegalManager category="impressum" onSaved={() => setLegalVersion(v=>v+1)} /></TabsContent>
              <TabsContent value="privacy"><LegalManager category="datenschutz" onSaved={() => setLegalVersion(v=>v+1)} /></TabsContent>
              <TabsContent value="audit"><AuditManager /></TabsContent>
              <TabsContent value="backup"><BackupManager /></TabsContent>
              <TabsContent value="users">
                <UserManager />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}
