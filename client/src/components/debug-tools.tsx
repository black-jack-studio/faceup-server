import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugTools() {
  const { addCoins, user } = useUserStore((state) => ({ 
    addCoins: state.addCoins, 
    user: state.user 
  }));

  const handleAddCoins = () => {
    addCoins(1000);
  };

  return (
    <Card className="m-4 bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Outils de développement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-white/80">Solde actuel: {user?.coins?.toLocaleString() || "0"} pièces</span>
        </div>
        <Button 
          onClick={handleAddCoins}
          className="bg-accent-gold hover:bg-accent-gold/80 text-ink font-bold"
          data-testid="button-add-coins"
        >
          Ajouter 1000 pièces
        </Button>
      </CardContent>
    </Card>
  );
}