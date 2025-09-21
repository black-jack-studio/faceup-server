import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, User } from "lucide-react";
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
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const { user, updateUser } = useUserStore();

  const resetForm = () => {
    setNewUsername("");
    setErrorMessage("");
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUsername) {
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(newUsername)) {
      return;
    }

    if (newUsername === user?.username) {
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

      // Username changé silencieusement

      handleClose();
    } catch (error: any) {
      // Gérer l'erreur spécifiquement pour "Username already taken"
      if (error.message?.includes("Username is already") || error.message?.includes("already taken") || error.message?.includes("already exists")) {
        setErrorMessage("Username already taken");
      } else {
        setErrorMessage("Username already taken"); // Par défaut, on assume que c'est ce problème
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm bg-card-dark border-white/10 shadow-2xl rounded-3xl">
        <DialogTitle className="sr-only">Change Username</DialogTitle>
        
        <div className="p-6">
          {/* Simplified header */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple/30 to-accent-blue/30 flex items-center justify-center mr-3">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Change Username</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-username" className="text-white font-medium text-sm">
                New Username
              </Label>
              <Input
                id="new-username"
                type="text"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  setErrorMessage(""); // Effacer l'erreur quand l'utilisateur tape
                }}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-11 focus:border-accent-purple/60 focus:bg-white/15 transition-all duration-200 rounded-2xl"
                placeholder="Your new username"
                data-testid="input-new-username"
                maxLength={20}
              />
              {errorMessage && (
                <p className="text-red-400 text-sm mt-1" data-testid="error-message">
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-11 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 font-medium rounded-2xl transition-all duration-200"
                data-testid="button-cancel"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11 bg-[#60A5FA] hover:bg-[#60A5FA]/90 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                data-testid="button-validate"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Changing...</span>
                  </div>
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}