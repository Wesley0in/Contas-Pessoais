import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  month: number;
  year: number;
  payment_method: string | null;
  description: string | null;
  image_url: string | null;
  ocr_raw_text: string | null;
  sync_status: string;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: string;
  spreadsheet_id: string;
  sheet_name: string;
  service_account_json: string;
  reference_year: number;
  updated_at: string;
}

export function useTransactions(filters?: { month?: number; year?: number; category?: string; type?: string }) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.month) query = query.eq("month", filters.month);
      if (filters?.year) query = query.eq("year", filters.year);
      if (filters?.category) query = query.eq("category", filters.category);
      if (filters?.type) query = query.eq("type", filters.type);

      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useMonthSummary(month: number, year: number) {
  return useQuery({
    queryKey: ["summary", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("type, amount")
        .eq("month", month)
        .eq("year", year);

      if (error) throw error;

      const income = (data ?? [])
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = (data ?? [])
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return { income, expense, balance: income - expense };
    },
  });
}

export function useLast6MonthsSummary(currentMonth: number, currentYear: number) {
  return useQuery({
    queryKey: ["summary-6months", currentMonth, currentYear],
    queryFn: async () => {
      const months: { month: number; year: number }[] = [];
      let m = currentMonth;
      let y = currentYear;
      for (let i = 0; i < 6; i++) {
        months.unshift({ month: m, year: y });
        m--;
        if (m === 0) { m = 12; y--; }
      }

      const results = await Promise.all(
        months.map(async ({ month, year }) => {
          const { data } = await supabase
            .from("transactions")
            .select("type, amount")
            .eq("month", month)
            .eq("year", year);

          const income = (data ?? []).filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
          const expense = (data ?? []).filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

          return { month, year, income, expense };
        })
      );

      return results;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tx: Omit<Transaction, "id" | "created_at" | "updated_at" | "sync_status" | "sync_error">) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...tx, sync_status: "pending" })
        .select()
        .single();
      if (error) throw error;

      // Try to sync with Google Sheets
      try {
        await supabase.functions.invoke("sync-sheets", {
          body: { transactionId: data.id, operation: "add" },
        });
      } catch {
        // Sync will be retried later
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["summary-6months"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tx: Transaction) => {
      // Try to sync deletion with Google Sheets first
      try {
        await supabase.functions.invoke("sync-sheets", {
          body: { transactionId: tx.id, operation: "subtract", amount: Number(tx.amount), category: tx.category, month: tx.month, year: tx.year },
        });
      } catch {
        // Continue with deletion anyway
      }

      const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["summary-6months"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, oldAmount, oldCategory, oldMonth, oldYear }: {
      id: string;
      updates: Partial<Transaction>;
      oldAmount: number;
      oldCategory: string;
      oldMonth: number;
      oldYear: number;
    }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update({ ...updates, sync_status: "pending" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Sync: subtract old, add new
      try {
        await supabase.functions.invoke("sync-sheets", {
          body: { transactionId: id, operation: "edit", oldAmount, oldCategory, oldMonth, oldYear },
        });
      } catch {
        // Will retry later
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["summary-6months"] });
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as AppSettings;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<AppSettings> & { id: string }) => {
      const { id, ...rest } = updates;
      const { data, error } = await supabase
        .from("settings")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
