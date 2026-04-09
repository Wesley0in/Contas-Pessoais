import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, PAYMENT_METHODS, MONTH_NAMES } from "@/lib/constants";
import { useCreateTransaction } from "@/hooks/useFinanceData";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";

export default function NewTransaction() {
  const navigate = useNavigate();
  const createTransaction = useCreateTransaction();

  const now = new Date();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const categories = type === "income" ? CATEGORIES.income : CATEGORIES.expense;

  const handleOCR = async (file: File) => {
    setIsScanning(true);
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

      if (data?.amount) setAmount(String(data.amount));
      if (data?.description) setDescription(data.description);
      if (data?.beneficiary) {
        setDescription((prev) =>
          prev ? `${data.beneficiary} - ${prev}` : data.beneficiary
        );
      }

      toast.success("Dados extraídos do boleto!");
    } catch (err) {
      toast.error("Erro ao escanear o boleto. Preencha manualmente.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !amount) {
      toast.error("Preencha categoria e valor.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction.mutateAsync({
        type,
        category,
        amount: parseFloat(amount),
        month,
        year,
        payment_method: paymentMethod || null,
        description: description || null,
        image_url: null,
        ocr_raw_text: null,
      });
      toast.success("Transação registrada!");
      navigate("/");
    } catch {
      toast.error("Erro ao salvar transação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-heading font-bold mb-6">Nova Transação</h1>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "income" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => { setType("income"); setCategory(""); }}
                >
                  Receita
                </Button>
                <Button
                  type="button"
                  variant={type === "expense" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => { setType("expense"); setCategory(""); }}
                >
                  Despesa
                </Button>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Month/Year */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Método de pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Observações..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* OCR Upload */}
              <div className="space-y-2">
                <Label>Boleto / Comprovante</Label>
                <label className="flex items-center gap-2 px-4 py-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <Camera className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {isScanning ? "Escaneando..." : "Clique para enviar imagem"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleOCR(file);
                    }}
                    disabled={isScanning}
                  />
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Registrar Transação"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
