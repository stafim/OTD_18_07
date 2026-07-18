import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BookOpen, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Search, X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type Lancamento = {
  id: string;
  tipo: "debito" | "credito";
  nome: string;
  detalhes?: string | null;
  valor: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

// ─── Form schema ──────────────────────────────────────────────────────────────

const formSchema = z.object({
  tipo: z.enum(["debito", "credito"], { required_error: "Selecione o tipo" }),
  nome: z.string().min(1, "Nome obrigatório").max(255),
  detalhes: z.string().optional(),
  valor: z.string().min(1, "Valor obrigatório").refine(
    v => !isNaN(parseFloat(v.replace(",", "."))) && parseFloat(v.replace(",", ".")) > 0,
    "Informe um valor válido maior que zero",
  ),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Máscara BRL: mantém apenas dígitos e formata como R$ 1.234,56
function maskBRL(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Converte valor mascarado "1.234,56" → "1234.56" para enviar à API
function unmaskedValue(masked: string): string {
  return masked.replace(/\./g, "").replace(",", ".");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
  catch { return "—"; }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LancamentosPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [deleting, setDeleting] = useState<Lancamento | null>(null);

  const { data: lancamentos = [], isLoading } = useQuery<Lancamento[]>({
    queryKey: ["/api/lancamentos"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { tipo: "credito", nome: "", detalhes: "", valor: "" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ tipo: "credito", nome: "", detalhes: "", valor: "" });
    setDialogOpen(true);
  }

  function openEdit(l: Lancamento) {
    setEditing(l);
    form.reset({
      tipo: l.tipo,
      nome: l.nome,
      detalhes: l.detalhes ?? "",
      valor: maskBRL(String(Math.round(parseFloat(l.valor) * 100))),
    });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        valor: unmaskedValue(values.valor),
      };
      if (editing) {
        return apiRequest("PATCH", `/api/lancamentos/${editing.id}`, payload);
      }
      return apiRequest("POST", "/api/lancamentos", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lancamentos"] });
      setDialogOpen(false);
      toast({ title: editing ? "Lançamento atualizado!" : "Lançamento criado!" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/lancamentos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lancamentos"] });
      setDeleting(null);
      toast({ title: "Lançamento excluído." });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    },
  });

  const filtered = lancamentos.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.nome.toLowerCase().includes(q) || (l.detalhes ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lançamentos</h1>
            <p className="text-sm text-muted-foreground">Cadastro de lançamentos financeiros</p>
          </div>
        </div>
        <Button onClick={openCreate} data-testid="button-novo-lancamento" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Lançamento
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou detalhes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 pr-9"
          data-testid="input-search-lancamentos"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Carregando lançamentos…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <BookOpen className="h-10 w-10 opacity-30" />
            <p className="text-sm">{search ? "Nenhum resultado encontrado." : "Nenhum lançamento cadastrado."}</p>
            {!search && (
              <Button variant="outline" size="sm" onClick={openCreate} className="gap-2 mt-1">
                <Plus className="h-4 w-4" />Criar primeiro lançamento
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Detalhes</th>
                <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Criado em</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr
                  key={l.id}
                  className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", i % 2 === 0 ? "" : "bg-muted/10")}
                  data-testid={`row-lancamento-${l.id}`}
                >
                  <td className="px-4 py-3">
                    {l.tipo === "credito" ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 gap-1">
                        <TrendingUp className="h-3 w-3" />Crédito
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 gap-1">
                        <TrendingDown className="h-3 w-3" />Débito
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium" data-testid={`text-nome-${l.id}`}>{l.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">
                    {l.detalhes || "—"}
                  </td>
                  <td className={cn(
                    "px-4 py-3 text-right font-bold tabular-nums",
                    l.tipo === "credito" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                  )} data-testid={`text-valor-${l.id}`}>
                    {formatCurrency(l.valor)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {fmtDate(l.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => openEdit(l)}
                        data-testid={`button-edit-${l.id}`}
                        className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => setDeleting(l)}
                        data-testid={`button-delete-${l.id}`}
                        className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              {editing ? "Editar Lançamento" : "Novo Lançamento"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => saveMutation.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Lançamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tipo">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credito">
                          <span className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                            Crédito (bonificação)
                          </span>
                        </SelectItem>
                        <SelectItem value="debito">
                          <span className="flex items-center gap-2">
                            <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                            Débito (desabonificação)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Lançamento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Bonificação por pontualidade"
                        data-testid="input-nome"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="detalhes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detalhes <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o motivo ou detalhes do lançamento…"
                        rows={3}
                        data-testid="textarea-detalhes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0,00"
                        data-testid="input-valor"
                        inputMode="numeric"
                        {...field}
                        onChange={e => {
                          field.onChange(maskBRL(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-salvar">
                  {saveMutation.isPending ? "Salvando…" : editing ? "Salvar alterações" : "Criar lançamento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O lançamento <strong>"{deleting?.nome}"</strong> será excluído permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
