import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { Camera, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ScannerPage() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<{
    amount: number | null;
    dueDate: string | null;
    beneficiary: string | null;
    description: string | null;
  } | null>(null);

  const handleFile = async (file: File) => {
    setIsScanning(true);
    setResult(null);

    // Show preview
    const url = URL.createObjectURL(file);
    setPreview(url);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("ocr", {
        body: { image: base64 },
      });

      if (error) throw error;
      setResult(data);
      toast.success("Dados extraídos com sucesso!");
    } catch {
      toast.error("Erro ao processar imagem.");
    } finally {
      setIsScanning(false);
    }
  };

  const useResult = () => {
    const params = new URLSearchParams();
    if (result?.amount) params.set("amount", String(result.amount));
    if (result?.description) params.set("description", result.description);
    if (result?.beneficiary) params.set("beneficiary", result.beneficiary);
    navigate(`/nova-transacao?${params.toString()}`);
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-heading font-bold mb-6">Escanear Boleto</h1>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <label className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted transition-colors">
              {isScanning ? (
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              ) : (
                <Camera className="w-12 h-12 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="font-medium">
                  {isScanning ? "Processando..." : "Clique ou arraste uma imagem"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  JPG, PNG, WebP — boleto, nota fiscal ou comprovante
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                disabled={isScanning}
              />
            </label>
          </CardContent>
        </Card>

        {preview && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <img src={preview} alt="Preview" className="rounded-lg max-h-64 w-full object-contain" />
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-heading font-semibold">Dados Extraídos</h3>
              {result.amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-mono font-bold">
                    R$ {result.amount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}
              {result.beneficiary && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Beneficiário:</span>
                  <span className="font-medium">{result.beneficiary}</span>
                </div>
              )}
              {result.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimento:</span>
                  <span>{result.dueDate}</span>
                </div>
              )}
              {result.description && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descrição:</span>
                  <span className="text-sm">{result.description}</span>
                </div>
              )}
              <Button className="w-full mt-4" onClick={useResult}>
                Usar dados na transação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
