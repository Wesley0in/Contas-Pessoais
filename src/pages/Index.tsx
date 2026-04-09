import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { SyncStatus } from "@/components/SyncStatus";
import {
  useMonthSummary,
  useLast6MonthsSummary,
  useTransactions,
} from "@/hooks/useFinanceData";
import { MONTH_NAMES, getCategoryLabel, getBalanceColor } from "@/lib/constants";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  PlusCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: summary } = useMonthSummary(month, year);
  const { data: chartData } = useLast6MonthsSummary(month, year);
  const { data: recentTransactions = [] } = useTransactions({ month, year });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);

  const balance = summary?.balance ?? 0;

  const barData = chartData?.map((d) => ({
    name: MONTH_NAMES[d.month - 1]?.slice(0, 3),
    Receitas: d.income,
    Despesas: d.expense,
  }));

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((n, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild>
            <Link to="/nova-transacao">
              <PlusCircle className="w-4 h-4 mr-2" />
              Nova
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm text-muted-foreground">Receitas</span>
            </div>
            <p className="text-xl font-heading font-bold text-balance-positive">
              {formatCurrency(summary?.income ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <span className="text-sm text-muted-foreground">Despesas</span>
            </div>
            <p className="text-xl font-heading font-bold text-balance-negative">
              {formatCurrency(summary?.expense ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Balanço</span>
            </div>
            <p className={`text-xl font-heading font-bold ${getBalanceColor(balance)}`}>
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Reserva</span>
            </div>
            <p className="text-xl font-heading font-bold">—</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {barData && barData.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                />
                <Legend />
                <Bar dataKey="Receitas" fill="hsl(142, 60%, 35%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Últimas Transações</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/historico">Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma transação neste mês.
            </p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        tx.type === "income" ? "bg-balance-positive" : "bg-balance-negative"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{getCategoryLabel(tx.category)}</p>
                      {tx.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {tx.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-sm font-medium ${
                        tx.type === "income" ? "text-balance-positive" : "text-balance-negative"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(Number(tx.amount))}
                    </span>
                    <SyncStatus status={tx.sync_status as "synced" | "pending" | "error"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
