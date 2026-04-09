import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/Layout";
import { useSettings, useUpdateSettings } from "@/hooks/useFinanceData";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [referenceYear, setReferenceYear] = useState(2026);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load settings when available
  if (settings && !loaded) {
    setSpreadsheetId(settings.spreadsheet_id);
    setSheetName(settings.sheet_name);
    setServiceAccountJson(settings.service_account_json);
    setReferenceYear(settings.reference_year);
    setLoaded(true);
  }

  const handleSave = async () => {
    if (!settings?.id) return;
    try {
      await updateSettings.mutateAsync({
        id: settings.id,
        spreadsheet_id: spreadsheetId,
        sheet_name: sheetName,
        service_account_json: serviceAccountJson,
        reference_year: referenceYear,
      });
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar.");
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
      toast.error("Falha na conexão com a planilha.");
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
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-heading font-bold mb-6">Configurações</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Google Planilhas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>ID da Planilha</Label>
              <Input
                placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Extraído da URL: docs.google.com/spreadsheets/d/<strong>ID_AQUI</strong>/edit
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nome da Aba</Label>
              <Input
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
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

            <div className="space-y-2">
              <Label>Service Account JSON</Label>
              <Textarea
                rows={6}
                placeholder='{"type": "service_account", ...}'
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="outline" onClick={handleTest} disabled={isTesting}>
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : testResult === "success" ? (
                  <CheckCircle className="w-4 h-4 mr-2 text-success" />
                ) : testResult === "error" ? (
                  <AlertCircle className="w-4 h-4 mr-2 text-destructive" />
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
