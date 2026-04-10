import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/Layout";
import { useSettings, useUpdateSettings } from "@/hooks/useFinanceData";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle, Loader2, Cpu, Table, ShieldCheck, Database } from "lucide-react";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [referenceYear, setReferenceYear] = useState(2026);
  const [groqApiKey, setGroqApiKey] = useState(localStorage.getItem("GROQ_API_KEY") || "");
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (settings) {
      setSpreadsheetId(settings.spreadsheet_id || "");
      setSheetName(settings.sheet_name || "");
      setServiceAccountJson(settings.service_account_json || "");
      setReferenceYear(settings.reference_year || 2026);
    }
  }, [settings]);

  const extractIdFromUrl = (input: string) => {
    // Regular expression to match Google Sheets ID
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      setSpreadsheetId(match[1]);
      toast.info("ID extraído do link com sucesso!");
      return;
    }
    setSpreadsheetId(input);
  };

  const handleSaveSystem = () => {
    localStorage.setItem("GROQ_API_KEY", groqApiKey);
    toast.success("Configurações do sistema salvas localmente!");
  };

  const getServiceAccountEmail = () => {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      return parsed.client_email || null;
    } catch {
      return null;
    }
  };

  const handleSaveSpreadsheet = async () => {
    if (!settings?.id) return;
    try {
      await updateSettings.mutateAsync({
        id: settings.id,
        spreadsheet_id: spreadsheetId,
        sheet_name: sheetName,
        service_account_json: serviceAccountJson,
        reference_year: referenceYear,
      });
      toast.success("Configurações da planilha salvas no banco!");
    } catch {
      toast.error("Erro ao salvar no banco de dados.");
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("test-sheets", {
        body: { spreadsheetId, sheetName, serviceAccountJson },
      });
      if (error) throw error;
      setTestResult("success");
      toast.success("Conexão com a planilha funcionando!");
    } catch {
      setTestResult("error");
      toast.error("Falha na conexão com a planilha. Verifique o ID e as permissões.");
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8 pb-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-heading font-bold">Configurações</h1>
        </div>

        {/* CONTAINER 1: SISTEMA */}
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl">Configurações do Sistema</CardTitle>
            </div>
            <CardDescription>
              Configurações locais e inteligência artificial (OCR)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="groq-key">Chave API do Groq (Acelera OCR)</Label>
              <Input
                id="groq-key"
                type="password"
                placeholder="gsk_..."
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground italic">
                A chave fica salva apenas no seu navegador, aumentando a segurança.
              </p>
            </div>
            <Button onClick={handleSaveSystem} className="w-full sm:w-auto">
              Salvar Sistema
            </Button>
          </CardContent>
        </Card>

        {/* CONTAINER 2: PLANILHA */}
        <Card className="border-indigo-200 shadow-sm">
          <CardHeader className="bg-indigo-50/50">
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-xl">Google Planilhas</CardTitle>
            </div>
            <CardDescription>
              Configure o destino da sincronização dos seus gastos
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label>ID da Planilha</Label>
                <div className="flex gap-2">
                   <div className="relative flex-1">
                    <Database className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cole o link da sua planilha ou o ID aqui"
                      value={spreadsheetId}
                      onChange={(e) => extractIdFromUrl(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  Você pode colar o <strong>link completo</strong> da planilha e eu extraio o ID para você.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Nome da Aba</Label>
                <Input
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="Ex: Gastos 2026"
                />
              </div>

              <div className="space-y-2">
                <Label>Ano de Referência</Label>
                <Input
                  type="number"
                  value={referenceYear}
                  onChange={(e) => setReferenceYear(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Service Account JSON (Google Cloud)</Label>
              <Textarea
                rows={6}
                placeholder='{"type": "service_account", ...}'
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                className="font-mono text-xs bg-muted/30"
              />
              <p className="text-[10px] text-muted-foreground">
                Dica: O e-mail da service account abaixo deve ter permissão de <strong>Editor</strong> na sua planilha.
              </p>
              {getServiceAccountEmail() ? (
                <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-primary/60 tracking-wider">E-mail para compartilhar:</span>
                    <span className="text-xs font-mono font-medium truncate select-all">{getServiceAccountEmail()}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      navigator.clipboard.writeText(getServiceAccountEmail()!);
                      toast.success("E-mail copiado!");
                    }}
                    className="h-8 px-3 text-xs bg-white"
                  >
                    Copiar
                  </Button>
                </div>
              ) : (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/20 text-center">
                  <p className="text-[10px] text-muted-foreground italic">
                    Cole o conteúdo do seu arquivo JSON acima para visualizar o e-mail de compartilhamento.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 pt-4 border-t">
              <Button onClick={handleSaveSpreadsheet} className="bg-indigo-600 hover:bg-indigo-700">
                Salvar Planilha
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTest} 
                disabled={isTesting}
                className="border-indigo-200"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : testResult === "success" ? (
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                ) : testResult === "error" ? (
                  <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                ) : null}
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
