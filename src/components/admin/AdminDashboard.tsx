import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Calendar, Image, FileText, Mail, Home, Settings, Users, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import EventsManager from "./EventsManager";
import GalleryManager from "./GalleryManager";
import AboutManager from "./AboutManager";
import ContactManager from "./ContactManager";
import SiteSettingsManager from "./SiteSettingsManager";
import UserManager from "./UserManager";
import PageBackgroundManager from "./PageBackgroundManager";

export default function AdminDashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("events");

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
            <span className="text-muted-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-7' : 'grid-cols-3'} lg:w-auto lg:inline-flex`}>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Termine</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">Galerie</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Über uns</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="backgrounds" className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Hintergründe</span>
                </TabsTrigger>
                <TabsTrigger value="contact" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">Nachrichten</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Einstellungen</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Benutzer</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

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
