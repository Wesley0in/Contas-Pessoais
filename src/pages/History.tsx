import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Layout } from "@/components/Layout";
import { SyncStatus } from "@/components/SyncStatus";
import { useTransactions, useDeleteTransaction } from "@/hooks/useFinanceData";
import { CATEGORIES, ALL_CATEGORIES, getCategoryLabel, MONTH_NAMES, PAYMENT_METHODS } from "@/lib/constants";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function HistoryPage() {
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");

  const { data: transactions = [], isLoading } = useTransactions({
    month: filterMonth ? Number(filterMonth) : undefined,
    year: filterYear ? Number(filterYear) : undefined,
    category: filterCategory || undefined,
    type: filterType || undefined,
  });

  const deleteTransaction = useDeleteTransaction();

  const handleDelete = async (tx: typeof transactions[0]) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    try {
      await deleteTransaction.mutateAsync(tx);
      toast.success("Transação excluída.");
    } catch {
      toast.error("Erro ao excluir.");
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <Layout>
      <h1 className="text-2xl font-heading font-bold mb-6">Histórico</h1>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {MONTH_NAMES.map((n, i) => (
              <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Receita</SelectItem>
            <SelectItem value="expense">Despesa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {ALL_CATEGORIES.map(c => (
              <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma transação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {MONTH_NAMES[tx.month - 1]?.slice(0, 3)}/{tx.year}
                      </TableCell>
                      <TableCell>
                        <span className={tx.type === "income" ? "text-balance-positive font-medium" : "text-balance-negative font-medium"}>
                          {tx.type === "income" ? "Receita" : "Despesa"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{getCategoryLabel(tx.category)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(Number(tx.amount))}
                      </TableCell>
                      <TableCell>
                        <SyncStatus status={tx.sync_status as "synced" | "pending" | "error"} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
