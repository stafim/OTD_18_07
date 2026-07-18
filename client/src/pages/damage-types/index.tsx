import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  insertDamageTypeSchema,
  damageSeverities,
  damageCategories,
  damageBrands,
  type DamageType,
  type DamageSeverity,
  type DamageCategory,
  type DamageBrand,
  type InsertDamageType,
} from "@shared/schema";

const categoryLabel: Record<DamageCategory, string> = {
  quebra: "Quebra",
  risco: "Risco",
  furto: "Furto",
};

const brandLabel: Record<DamageBrand, string> = {
  volvo: "Volvo",
  scania: "Scania",
  mercedes_benz: "Mercedes-Benz",
  daf: "DAF",
  volkswagen: "Volkswagen",
};

const categoryBadgeClass: Record<DamageCategory, string> = {
  quebra: "bg-rose-600 hover:bg-rose-700 text-white",
  risco: "bg-amber-500 hover:bg-amber-600 text-white",
  furto: "bg-slate-700 hover:bg-slate-800 text-white",
};

const severityLabel: Record<DamageSeverity, string> = {
  leve: "Leve",
  media: "Média",
  grave: "Grave",
  critica: "Crítica",
};

const severityBadgeClass: Record<DamageSeverity, string> = {
  leve: "bg-emerald-500 hover:bg-emerald-600 text-white",
  media: "bg-amber-500 hover:bg-amber-600 text-white",
  grave: "bg-orange-600 hover:bg-orange-700 text-white",
  critica: "bg-red-600 hover:bg-red-700 text-white",
};

const severityField: Record<DamageSeverity, "costLeve" | "costMedia" | "costGrave" | "costCritica"> = {
  leve: "costLeve",
  media: "costMedia",
  grave: "costGrave",
  critica: "costCritica",
};

const formatBRL = (v: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

const maskBRL = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  const number = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

const parseBRLToDecimal = (masked: string) => {
  const digits = (masked || "").replace(/\D/g, "");
  if (!digits) return "0.00";
  return (Number(digits) / 100).toFixed(2);
};

const decimalToMaskedBRL = (decimal: string | number | null | undefined) => {
  const n = Number(decimal ?? 0);
  if (!isFinite(n)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

function CurrencyInput({
  value,
  onChange,
  testId,
}: {
  value: string;
  onChange: (decimal: string) => void;
  testId?: string;
}) {
  const display = value === "" ? "" : decimalToMaskedBRL(value);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        type="text"
        inputMode="numeric"
        className="pl-9"
        value={display}
        onChange={(e) => {
          const masked = maskBRL(e.target.value);
          onChange(masked === "" ? "0.00" : parseBRLToDecimal(masked));
        }}
        placeholder="0,00"
        data-testid={testId}
      />
    </div>
  );
}

export default function DamageTypesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DamageType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery<DamageType[]>({
    queryKey: ["/api/damage-types"],
  });

  const form = useForm<InsertDamageType>({
    resolver: zodResolver(insertDamageTypeSchema),
    defaultValues: {
      name: "",
      category: "quebra",
      brand: "volvo",
      description: "",
      costLeve: "0.00",
      costMedia: "0.00",
      costGrave: "0.00",
      costCritica: "0.00",
      costPart: "0.00",
      isActive: "true",
    } as any,
  });

  const watchedCategory = (form.watch("category" as any) ?? "quebra") as DamageCategory;
  const isFurto = watchedCategory === "furto";

  const openNew = () => {
    setEditing(null);
    form.reset({
      name: "",
      category: "quebra",
      brand: "volvo",
      description: "",
      costLeve: "0.00",
      costMedia: "0.00",
      costGrave: "0.00",
      costCritica: "0.00",
      costPart: "0.00",
      isActive: "true",
    } as any);
    setDialogOpen(true);
  };

  const openEdit = (item: DamageType) => {
    setEditing(item);
    form.reset({
      name: item.name,
      category: ((item as any).category ?? "quebra") as DamageCategory,
      brand: (((item as any).brand ?? "volvo") as DamageBrand),
      description: item.description ?? "",
      costLeve: item.costLeve ?? "0.00",
      costMedia: item.costMedia ?? "0.00",
      costGrave: item.costGrave ?? "0.00",
      costCritica: item.costCritica ?? "0.00",
      costPart: (item as any).costPart ?? "0.00",
      isActive: item.isActive ?? "true",
    } as any);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: InsertDamageType) => {
      if (editing) {
        return apiRequest("PATCH", `/api/damage-types/${editing.id}`, data);
      }
      return apiRequest("POST", "/api/damage-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/damage-types"] });
      toast({ title: editing ? "Avaria atualizada" : "Avaria cadastrada" });
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Erro ao salvar avaria", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/damage-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/damage-types"] });
      toast({ title: "Avaria excluída" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir avaria", variant: "destructive" });
    },
  });

  const filtered = (items ?? []).filter((d) => {
    const q = search.toLowerCase();
    const cat = ((d as any).category ?? "") as string;
    const br = ((d as any).brand ?? "") as string;
    return (
      d.name.toLowerCase().includes(q) ||
      (d.description ?? "").toLowerCase().includes(q) ||
      (categoryLabel[cat as DamageCategory] ?? "").toLowerCase().includes(q) ||
      (brandLabel[br as DamageBrand] ?? "").toLowerCase().includes(q)
    );
  });

  const columns = [
    { key: "name", label: "Nome" },
    {
      key: "category",
      label: "Tipo",
      render: (d: DamageType) => {
        const cat = (((d as any).category ?? "quebra") as DamageCategory);
        return (
          <Badge className={categoryBadgeClass[cat]} data-testid={`badge-category-${d.id}`}>
            {categoryLabel[cat]}
          </Badge>
        );
      },
    },
    {
      key: "brand",
      label: "Marca",
      render: (d: DamageType) => {
        const b = ((d as any).brand ?? "") as string;
        return (
          <span className="text-sm" data-testid={`text-brand-${d.id}`}>
            {brandLabel[b as DamageBrand] ?? "—"}
          </span>
        );
      },
    },
    ...damageSeverities.map((s) => ({
      key: severityField[s],
      label: severityLabel[s],
      render: (d: DamageType) => {
        const isFurtoRow = (((d as any).category ?? "quebra") as DamageCategory) === "furto";
        return (
          <span className="font-mono text-sm" data-testid={`text-cost-${s}-${d.id}`}>
            {isFurtoRow ? "—" : formatBRL((d as any)[severityField[s]])}
          </span>
        );
      },
    })),
    {
      key: "costPart",
      label: "Custo Peça",
      render: (d: DamageType) => {
        const isFurtoRow = (((d as any).category ?? "quebra") as DamageCategory) === "furto";
        return (
          <span className="font-mono text-sm" data-testid={`text-cost-part-${d.id}`}>
            {isFurtoRow ? formatBRL((d as any).costPart) : "—"}
          </span>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      render: (d: DamageType) => (
        <Badge variant={d.isActive === "true" ? "default" : "secondary"}>
          {d.isActive === "true" ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-24",
      render: (d: DamageType) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); openEdit(d); }}
            data-testid={`button-edit-damage-${d.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); }}
            data-testid={`button-delete-damage-${d.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Avarias"
        breadcrumbs={[
          { label: "Cadastros", href: "/" },
          { label: "Avarias" },
        ]}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-damage-types"
            />
          </div>
          <Button onClick={openNew} data-testid="button-add-damage-type">
            <Plus className="mr-2 h-4 w-4" />
            Nova Avaria
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          keyField="id"
          onRowClick={openEdit}
          emptyMessage="Nenhuma avaria cadastrada"
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Avaria" : "Nova Avaria"}</DialogTitle>
            <DialogDescription>
              Cadastre o tipo de avaria e informe o custo para cada severidade.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                const payload: any = { ...data };
                if (payload.category === "furto") {
                  payload.costLeve = "0.00";
                  payload.costMedia = "0.00";
                  payload.costGrave = "0.00";
                  payload.costCritica = "0.00";
                } else {
                  payload.costPart = "0.00";
                }
                saveMutation.mutate(payload);
              })}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Ex.: Risco na lataria"
                        data-testid="input-damage-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name={"category" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Avaria *</FormLabel>
                      <Select
                        value={(field.value ?? "quebra") as string}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-damage-category">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {damageCategories.map((c) => (
                            <SelectItem
                              key={c}
                              value={c}
                              data-testid={`select-item-category-${c}`}
                            >
                              {categoryLabel[c]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"brand" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca *</FormLabel>
                      <Select
                        value={(field.value ?? "volvo") as string}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-damage-brand">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {damageBrands.map((b) => (
                            <SelectItem
                              key={b}
                              value={b}
                              data-testid={`select-item-brand-${b}`}
                            >
                              {brandLabel[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isFurto ? (
                <FormField
                  control={form.control}
                  name={"costPart" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo da Peça (R$) *</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={String(field.value ?? "0.00")}
                          onChange={field.onChange}
                          testId="input-cost-part"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div>
                  <div className="mb-2 text-sm font-medium">Custos por severidade (R$)</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {damageSeverities.map((s) => (
                      <FormField
                        key={s}
                        control={form.control}
                        name={severityField[s] as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Badge className={severityBadgeClass[s]}>{severityLabel[s]}</Badge>
                            </FormLabel>
                            <FormControl>
                              <CurrencyInput
                                value={String(field.value ?? "0.00")}
                                onChange={field.onChange}
                                testId={`input-cost-${s}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        rows={3}
                        placeholder="Detalhes opcionais sobre este tipo de avaria"
                        data-testid="input-damage-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-base">Ativo</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value === "true"}
                        onCheckedChange={(v) => field.onChange(v ? "true" : "false")}
                        data-testid="switch-damage-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-damage"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  data-testid="button-save-damage"
                >
                  {saveMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editing ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaria? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete-damage"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
