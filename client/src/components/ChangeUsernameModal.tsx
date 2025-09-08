import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useUserStore } from "@/store/user-store";

interface ChangeUsernameModalProps {
  children: React.ReactNode;
}

export default function ChangeUsernameModal({ children }: ChangeUsernameModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, updateUser } = useUserStore();

  const resetForm = () => {
    setNewUsername("");
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUsername) {
      toast({
        title: "Erreur",
        description: "Le nouveau pseudo est requis",
        variant: "destructive",
      });
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      toast({
        title: "Erreur",
        description: "Le pseudo doit contenir entre 3 et 20 caractères",
        variant: "destructive",
      });
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(newUsername)) {
      toast({
        title: "Erreur",
        description: "Le pseudo ne peut contenir que des lettres, chiffres et underscores",
        variant: "destructive",
      });
      return;
    }

    if (newUsername === user?.username) {
      toast({
        title: "Erreur",
        description: "Le nouveau pseudo doit être différent de l'actuel",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/change-username", {
        newUsername,
      });

      const data = await response.json();

      if (data.user) {
        updateUser({ username: data.user.username });
      }

      toast({
        title: "Succès",
        description: "Votre pseudo a été modifié avec succès",
      });

      handleClose();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de changer le pseudo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-ink border border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white text-center">Changer de pseudo</DialogTitle>
          <DialogDescription className="text-white/70 text-center">
            Changer de pseudo
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6">
          {/* Header avec icône et bouton fermer */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent-purple/20 rounded-xl flex items-center justify-center">
                <span className="text-accent-purple text-xl">👤</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl p-2"
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Current Username */}
          <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white/70 text-sm mb-1">Pseudo actuel</p>
            <p className="text-white font-bold">{user?.username}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new-username" className="text-white font-medium mb-2 block">
                Nouveau pseudo
              </Label>
              <Input
                id="new-username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                placeholder="Entrez votre nouveau pseudo"
                data-testid="input-new-username"
                maxLength={20}
              />
              <p className="text-white/50 text-xs mt-1">
                3-20 caractères, lettres, chiffres et underscores uniquement
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                data-testid="button-cancel"
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-accent-purple hover:bg-accent-purple/80 text-white font-bold"
                data-testid="button-change-username"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Modification...</span>
                  </div>
                ) : (
                  "Changer le pseudo"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}