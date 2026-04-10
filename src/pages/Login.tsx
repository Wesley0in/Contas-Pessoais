import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Lock, User, Heart } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Hardcoded credentials as requested
    if (username === "eu_te_amo" && password === "16.05.2025S2") {
      setTimeout(() => {
        localStorage.setItem("authenticated", "true");
        toast.success("Bem-vindo de volta! ❤️");
        navigate("/");
        setIsLoading(false);
      }, 800);
    } else {
      setTimeout(() => {
        toast.error("Usuário ou senha incorretos.");
        setIsLoading(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 overflow-hidden relative">
      {/* Decorative bubbles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-3xl" />
      
      <Card className="w-full max-w-md border-white/20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <CardHeader className="text-center space-y-2 pt-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center shadow-lg mb-2">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-heading font-black tracking-tight">
            Gestão Financeira
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium flex items-center justify-center gap-1">
            Feito com <Heart className="w-3 h-3 text-red-500 fill-red-500" /> para você
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="Seu usuário"
                    className="pl-10 h-11 border-zinc-200 focus:ring-2 focus:ring-purple-500"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 border-zinc-200 focus:ring-2 focus:ring-purple-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? "Acessando..." : "Entrar no Sistema"}
            </Button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-center">
            <p className="text-xs text-muted-foreground">
              Acesso Restrito & Seguro
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Background Micro-animations */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-ping" />
        <div className="absolute top-3/4 right-1/3 w-2 h-2 bg-white rounded-full animate-ping delay-700" />
      </div>
    </div>
  );
}
