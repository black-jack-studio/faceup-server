import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Eye, EyeOff, Users, Globe, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

export default function PrivacySettings() {
  const [, navigate] = useLocation();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);
  const { toast } = useToast();

  // État local pour les paramètres de confidentialité
  const [settings, setSettings] = useState({
    profileVisibility: (user as any)?.privacySettings?.profileVisibility || "public",
    showStats: (user as any)?.privacySettings?.showStats || true,
    showLevel: (user as any)?.privacySettings?.showLevel || true,
    allowMessages: (user as any)?.privacySettings?.allowMessages || true,
    dataCollection: (user as any)?.privacySettings?.dataCollection || true,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateUser({
        privacySettings: settings
      });
      
      toast({
        title: "Paramètres sauvegardés",
        description: "Vos paramètres de confidentialité ont été mis à jour.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-ink text-white p-6 overflow-hidden">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="mr-3 text-white hover:bg-white/10 rounded-xl p-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-black text-white tracking-tight">Confidentialité</h1>
          </div>
        </motion.div>

        {/* Profile Visibility Section */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center mb-6">
            <Shield className="w-6 h-6 text-accent-purple mr-3" />
            <h2 className="text-2xl font-bold text-white">Visibilité du profil</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="text-white font-semibold">Profil public</p>
                    <p className="text-white/60 text-sm">Visible par tous les utilisateurs</p>
                  </div>
                </div>
                <Switch
                  checked={settings.profileVisibility === "public"}
                  onCheckedChange={(checked) => 
                    updateSetting("profileVisibility", checked ? "public" : "private")
                  }
                  data-testid="switch-profile-visibility"
                />
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Eye className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="text-white font-semibold">Afficher les statistiques</p>
                    <p className="text-white/60 text-sm">Montrer vos stats de jeu</p>
                  </div>
                </div>
                <Switch
                  checked={settings.showStats}
                  onCheckedChange={(checked) => updateSetting("showStats", checked)}
                  data-testid="switch-show-stats"
                />
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="text-white font-semibold">Afficher le niveau</p>
                    <p className="text-white/60 text-sm">Montrer votre niveau actuel</p>
                  </div>
                </div>
                <Switch
                  checked={settings.showLevel}
                  onCheckedChange={(checked) => updateSetting("showLevel", checked)}
                  data-testid="switch-show-level"
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Communication Settings */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center mb-6">
            <Users className="w-6 h-6 text-accent-green mr-3" />
            <h2 className="text-2xl font-bold text-white">Communication</h2>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-white/70" />
                <div>
                  <p className="text-white font-semibold">Autoriser les messages</p>
                  <p className="text-white/60 text-sm">Recevoir des messages d'autres joueurs</p>
                </div>
              </div>
              <Switch
                checked={settings.allowMessages}
                onCheckedChange={(checked) => updateSetting("allowMessages", checked)}
                data-testid="switch-allow-messages"
              />
            </div>
          </div>
        </motion.section>

        {/* Data Settings */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center mb-6">
            <Lock className="w-6 h-6 text-accent-gold mr-3" />
            <h2 className="text-2xl font-bold text-white">Données</h2>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-white/70" />
                <div>
                  <p className="text-white font-semibold">Collecte de données</p>
                  <p className="text-white/60 text-sm">Améliorer l'expérience utilisateur</p>
                </div>
              </div>
              <Switch
                checked={settings.dataCollection}
                onCheckedChange={(checked) => updateSetting("dataCollection", checked)}
                data-testid="switch-data-collection"
              />
            </div>
          </div>
        </motion.section>

        {/* Save Button */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full bg-accent-purple hover:bg-accent-purple/80 text-white font-bold py-4 rounded-2xl"
            data-testid="button-save-privacy"
          >
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sauvegarde...</span>
              </div>
            ) : (
              "Sauvegarder les paramètres"
            )}
          </Button>
        </motion.div>

        {/* Privacy Notice */}
        <motion.div
          className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <p className="text-white/70 text-sm text-center leading-relaxed">
            Vos paramètres de confidentialité sont importants pour nous. 
            Ces paramètres affectent la façon dont vos informations sont 
            partagées avec d'autres utilisateurs de l'application.
          </p>
        </motion.div>
      </div>
    </div>
  );
}