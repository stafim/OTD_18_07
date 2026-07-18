import { useState, useCallback, useRef, useEffect } from "react";
import { getAccessToken } from "@/hooks/use-auth";
import { getJsPDF } from "@/lib/jspdf-shim";
import otdLogoUrl from "@assets/logo_OTD_1772310881404.png";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { normalizeImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Receipt, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  RotateCcw, 
  FileText, 
  Truck, 
  User, 
  MapPin, 
  Search, 
  XCircle,
  Camera,
  DollarSign,
  Fuel,
  Utensils,
  Wrench,
  Car,
  Building,
  ImageOff,
  Plus,
  Upload,
  Loader2,
  Trash2,
  Hotel,
  Ticket,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Paperclip,
  ExternalLink,
  FileImage,
  FileCode2,
  FileDown,
  RefreshCw,
  BookOpen,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Send,
  Link2,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { 
  ExpenseSettlement, 
  ExpenseSettlementItem, 
  Transport, 
  Driver, 
  Client, 
  DeliveryLocation, 
  Yard 
} from "@shared/schema";

interface AssociatedRoute {
  id: string;
  name: string;
  fuelCost: string | null;
  tollCost: string | null;
  driverDailyCost: string | null;
  foodCost: string | null;
  othersCost: string | null;
  totalCost: string | null;
}

interface TravelRateInfo {
  name: string;
  rateType: string;
  rateValue: string;
}

interface SettlementLancamentoItem {
  id: string;
  settlementId: string;
  lancamentoId: string;
  createdAt?: string | null;
  lancamento: {
    id: string;
    tipo: "debito" | "credito";
    nome: string;
    detalhes?: string | null;
    valor: string;
  };
}

interface ExpenseSettlementWithRelations extends ExpenseSettlement {
  transport?: Transport & {
    client?: Client;
    deliveryLocation?: DeliveryLocation;
    originYard?: Yard;
  };
  driver?: Driver;
  items?: ExpenseSettlementItem[];
  associatedRoute?: AssociatedRoute | null;
  driverCost?: string | null;
  travelRateInfo?: TravelRateInfo | null;
  settlementLancamentos?: SettlementLancamentoItem[];
}

interface DamageReportForPDF {
  id: string;
  description: string | null;
  repairCost: string | null;
  includeInCost: boolean;
  vehicleChassi: string | null;
  damageTypeName: string | null;
  damageTypeCategory: string | null;
  damageTypeBrand: string | null;
  severity: string;
  severityLabel: string;
}

const expenseTypeLabels: Record<string, { label: string; icon: any }> = {
  combustivel: { label: "Combustível", icon: Fuel },
  pedagio: { label: "Pedágio", icon: Receipt },
  hospedagem: { label: "Hotel", icon: Hotel },
  alimentacao: { label: "Alimentação", icon: Utensils },
  passagem: { label: "Passagem", icon: Ticket },
  outros: { label: "Outros", icon: Receipt },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pendente: { label: "Pendente", variant: "secondary", icon: Clock },
  enviado: { label: "Aguardando Análise", variant: "default", icon: Eye },
  devolvido: { label: "Devolvido", variant: "destructive", icon: RotateCcw },
  aprovado: { label: "Aprovado", variant: "outline", icon: CheckCircle },
  assinado: { label: "Assinado", variant: "outline", icon: FileText },
  enviado_nfs: { label: "Enviado NFS", variant: "default", icon: Paperclip },
  concluido: { label: "Concluído", variant: "outline", icon: CheckCircle },
};

export default function FinanceiroPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSettlement, setSelectedSettlement] = useState<ExpenseSettlementWithRelations | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [localAdvanceAmount, setLocalAdvanceAmount] = useState<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  interface ExpenseItemDraft {
    id: string;
    type: string;
    currency: string;
    amount: string;
    photoUrl: string;
    description: string;
  }
  
  const currencyConfig: Record<string, { label: string; country: string; symbol: string }> = {
    BRL: { label: "Real Brasileiro", country: "Brasil", symbol: "R$" },
    ARS: { label: "Peso Argentino", country: "Argentina", symbol: "$" },
    CLP: { label: "Peso Chileno", country: "Chile", symbol: "$" },
    PEN: { label: "Sol Peruano", country: "Peru", symbol: "S/" },
    UYU: { label: "Peso Uruguayo", country: "Uruguay", symbol: "$U" },
    COP: { label: "Peso Colombiano", country: "Colômbia", symbol: "$" },
    PYG: { label: "Guaraní Paraguayo", country: "Paraguai", symbol: "₲" },
    USD: { label: "Dólar Americano", country: "Equador", symbol: "$" },
    BOB: { label: "Boliviano", country: "Bolívia", symbol: "Bs." },
  };

  const countryConfig: Record<string, { label: string; flag: string }> = {
    BR: { label: "Brasil", flag: "🇧🇷" },
    AR: { label: "Argentina", flag: "🇦🇷" },
    CL: { label: "Chile", flag: "🇨🇱" },
    PE: { label: "Peru", flag: "🇵🇪" },
    UY: { label: "Uruguai", flag: "🇺🇾" },
    CO: { label: "Colômbia", flag: "🇨🇴" },
    PY: { label: "Paraguai", flag: "🇵🇾" },
    EC: { label: "Equador", flag: "🇪🇨" },
    BO: { label: "Bolívia", flag: "🇧🇴" },
  };

  const currencyToCountry: Record<string, string> = {
    BRL: "BR", ARS: "AR", CLP: "CL", PEN: "PE", UYU: "UY",
    COP: "CO", PYG: "PY", USD: "EC", BOB: "BO",
  };
  
  const [newSettlement, setNewSettlement] = useState<{
    transportId: string;
    driverId: string;
    driverNotes: string;
    items: ExpenseItemDraft[];
  }>({ transportId: "", driverId: "", driverNotes: "", items: [] });
  const [newItem, setNewItem] = useState({ type: "", currency: "BRL", amount: "", photoUrl: "", description: "" });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadingItemIndex, setUploadingItemIndex] = useState<number | null>(null);
  const [approvingItemId, setApprovingItemId] = useState<string | null>(null);
  const [approvingAmount, setApprovingAmount] = useState("");
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null); // holds settlement id being generated
  const [generatingNfsPDF, setGeneratingNfsPDF] = useState<string | null>(null);
  const [generatingFullPDF, setGeneratingFullPDF] = useState<string | null>(null);
  const [showAddLancamentoDialog, setShowAddLancamentoDialog] = useState(false);
  const [selectedLancamentoId, setSelectedLancamentoId] = useState<string>("");
  const [showAddDamageDialog, setShowAddDamageDialog] = useState(false);
  const [damageSearchTerm, setDamageSearchTerm] = useState("");
  const [selectedDamageItems, setSelectedDamageItems] = useState<Map<string, string>>(new Map()); // damageTypeId → severity
  const [expandedDamageTypeId, setExpandedDamageTypeId] = useState<string | null>(null);
  const [damageIncludeInCost, setDamageIncludeInCost] = useState(false);

  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // Baixa e redimensiona/recompacta a imagem para JPEG, reduzindo o tamanho
  // final do PDF. Mantém proporção e força lado maior <= maxSide.
  const fetchImageAsCompressedJpeg = async (
    url: string,
    maxSide = 1280,
    quality = 0.7,
  ): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(blob);
      });
      const img: HTMLImageElement = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error("decode"));
        im.src = dataUrl;
      });
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) return dataUrl;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, tw, th);
      ctx.drawImage(img, 0, 0, tw, th);
      return canvas.toDataURL("image/jpeg", quality);
    } catch {
      return null;
    }
  };

  // Gera e baixa um PDF com o documento NFS enviado pelo motorista.
  // Suporta imagem (jpg/png/webp), PDF (passa direto) e XML (texto no PDF).
  const downloadNfsPDF = async (settlementId: string, nfsUrl: string, requestNumber: string) => {
    setGeneratingNfsPDF(settlementId);
    try {
      const fullUrl = normalizeImageUrl(nfsUrl);
      const isImage = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(nfsUrl);
      const isPdf = /\.pdf(\?|$)/i.test(nfsUrl);
      const isXml = /\.xml(\?|$)/i.test(nfsUrl);

      if (isPdf) {
        // Download the PDF directly
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error("Erro ao baixar o arquivo");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `NFS_${requestNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const { jsPDF } = await getJsPDF();
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const PW = 210;
      const PH = 297;
      const M = 15;

      // Header
      doc.setFillColor(30, 30, 30);
      doc.rect(0, 0, PW, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text("OTD Logistics — Nota Fiscal de Serviços", M, 14);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Prestação ${requestNumber}`, PW - M, 14, { align: "right" });

      let cursorY = 32;

      if (isImage) {
        const imgData = await fetchImageAsCompressedJpeg(fullUrl, 1800, 0.85);
        if (imgData) {
          const img = new Image();
          img.src = imgData;
          await new Promise<void>((res) => { img.onload = () => res(); });
          const iw = img.naturalWidth || 800;
          const ih = img.naturalHeight || 600;
          // Fill the available page area in mm, preserving aspect ratio
          const maxW = PW - M * 2;
          const maxH = PH - cursorY - M;
          const ratio = iw / ih;
          let fitW = maxW;
          let fitH = fitW / ratio;
          if (fitH > maxH) { fitH = maxH; fitW = fitH * ratio; }
          doc.addImage(imgData, "JPEG", M, cursorY, fitW, fitH);
        } else {
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text("Não foi possível carregar a imagem da NFS.", M, cursorY);
        }
      } else if (isXml) {
        const response = await fetch(fullUrl);
        const xmlText = response.ok ? await response.text() : "Erro ao carregar XML.";
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        doc.setTextColor(30, 30, 30);
        const lines = doc.splitTextToSize(xmlText, PW - M * 2);
        const lineH = 3.5;
        lines.forEach((line: string) => {
          if (cursorY + lineH > PH - M) {
            doc.addPage();
            cursorY = M;
          }
          doc.text(line, M, cursorY);
          cursorY += lineH;
        });
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Tipo de arquivo não suportado para visualização em PDF.", M, cursorY);
        cursorY += 8;
        doc.setTextColor(0, 0, 200);
        doc.text(fullUrl, M, cursorY);
      }

      doc.save(`NFS_${requestNumber}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF da NFS:", err);
      toast({ title: "Erro ao gerar PDF da NFS", variant: "destructive" });
    } finally {
      setGeneratingNfsPDF(null);
    }
  };

  // Redimensiona um PNG preservando transparência (sem fundo branco).
  // Útil para o logo no cabeçalho — o PNG original é 3543x1993 RGBA, o que
  // explode o PDF para ~28MB descomprimido. Precisamos reduzir antes do addImage.
  const fetchImageAsResizedPng = async (
    url: string,
    maxSide = 256,
  ): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(blob);
      });
      const img: HTMLImageElement = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error("decode"));
        im.src = dataUrl;
      });
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) return dataUrl;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.clearRect(0, 0, tw, th);
      ctx.drawImage(img, 0, 0, tw, th);
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const generateSettlementPDF = async (
    settlement: ExpenseSettlementWithRelations,
    options?: { mode?: "save" | "blob"; includeNfs?: boolean }
  ): Promise<Blob | null> => {
    const mode = options?.mode || "save";
    const includeNfs = options?.includeNfs ?? false;
    if (mode === "save") setGeneratingPDF(settlement.id);
    try {
      const { jsPDF } = await getJsPDF();
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const M = 15;
      const CW = PW - M * 2;
      let y = 0;

      // ── Corporate color palette ──────────────────────────────────────
      const NAVY:   [number, number, number] = [27, 38, 59];
      const ORANGE: [number, number, number] = [232, 93, 4];
      const DARK:   [number, number, number] = [33, 37, 41];
      const MID:    [number, number, number] = [108, 117, 125];
      const SOFT:   [number, number, number] = [243, 245, 248];
      const LIGHT:  [number, number, number] = [248, 249, 250];
      const BORDER: [number, number, number] = [206, 212, 218];
      const WHITE:  [number, number, number] = [255, 255, 255];
      const GREEN:  [number, number, number] = [40, 130, 75];
      const RED:    [number, number, number] = [200, 50, 60];
      const YELLOW: [number, number, number] = [180, 130, 0];
      const BLUE:   [number, number, number] = [30, 90, 180];

      const fmtCur = (val: string | number | null | undefined, cur = "BRL") => {
        if (val === null || val === undefined || val === "") return "R$ 0,00";
        const n = typeof val === "number" ? val : parseFloat(val);
        if (Number.isNaN(n)) return "R$ 0,00";
        return n.toLocaleString("pt-BR", { style: "currency", currency: cur });
      };
      const fmtDt = (v: string | null | undefined) =>
        v ? format(new Date(v), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—";
      const fmtDtShort = (v: string | null | undefined) =>
        v ? format(new Date(v), "dd/MM/yyyy", { locale: ptBR }) : "—";

      const docId = settlement.id.substring(0, 8).toUpperCase();
      const otdNumber = settlement.transport?.requestNumber || "—";

      // Carrega o logo da OTD para inserção no cabeçalho.
      // O PNG original é 3543x1993 RGBA (~28MB descomprimido) — jsPDF embute
      // PNG sem compressão, então é obrigatório redimensionar antes.
      const otdLogoDataUrl = await fetchImageAsResizedPng(otdLogoUrl, 256);

      // Busca avarias reportadas pelo motorista durante o transporte
      interface TransportAppDamageForPDF {
        id: string;
        description: string | null;
        photoUrl: string;
        latitude: string | null;
        longitude: string | null;
        createdAt: string | null;
        vehicleChassi: string | null;
        damageTypeName: string | null;
        damageTypeCategory: string | null;
      }
      let transportAppDamageReports: TransportAppDamageForPDF[] = [];
      if (settlement.transport?.id) {
        try {
          const token = getAccessToken();
          const tdrRes = await fetch(`/api/damage-reports/transport/${settlement.transport.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: "include",
          });
          if (tdrRes.ok) {
            transportAppDamageReports = await tdrRes.json();
          }
        } catch {
          // non-fatal
        }
      }

      // Busca avarias vinculadas à prestação de contas para incluir no PDF
      let damageReports: DamageReportForPDF[] = [];
      try {
        const token = getAccessToken();
        const drRes = await fetch(`/api/expense-settlements/${settlement.id}/damages`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
        if (drRes.ok) {
          const links: Array<{
            id: string;
            severity: string;
            vehicleChassi: string | null;
            includeInCost: boolean;
            damageType: {
              name: string;
              category: string;
              brand: string | null;
              costLeve: string | null;
              costMedia: string | null;
              costGrave: string | null;
              costCritica: string | null;
              costPart: string | null;
            } | null;
          }> = await drRes.json();
          const severityLabels: Record<string, string> = {
            leve: "Leve", media: "Média", grave: "Grave", critica: "Crítica", part: "Troca de Peça",
          };
          damageReports = links
            .filter(l => l.damageType)
            .map(l => {
              const dt = l.damageType!;
              const costMap: Record<string, string | null | undefined> = {
                leve: dt.costLeve, media: dt.costMedia, grave: dt.costGrave,
                critica: dt.costCritica, part: dt.costPart,
              };
              const sevLabel = severityLabels[l.severity] || l.severity;
              return {
                id: l.id,
                description: sevLabel,
                repairCost: costMap[l.severity] || "0",
                includeInCost: l.includeInCost,
                vehicleChassi: l.vehicleChassi,
                damageTypeName: dt.name,
                damageTypeCategory: dt.category,
                damageTypeBrand: dt.brand || null,
                severity: l.severity,
                severityLabel: sevLabel,
              };
            });
        }
      } catch {
        // non-fatal — prossegue sem as avarias
      }

      // ── Page chrome (header + footer) ─────────────────────────────────
      let pageNum = 1;

      const drawPageTop = (): number => {
        // Navy header band
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, PW, 22, "F");
        doc.setFillColor(...ORANGE);
        doc.rect(0, 22, PW, 1.2, "F");
        // Logo + Brand à esquerda
        let textX = M;
        if (otdLogoDataUrl) {
          try {
            const logoH = 14;
            const logoW = 14;
            doc.addImage(otdLogoDataUrl, "PNG", M, 4, logoW, logoH, undefined, "FAST");
            textX = M + logoW + 3;
          } catch {
            // se falhar a renderização, mantém apenas o texto
          }
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...WHITE);
        doc.text("OTD LOGISTICS", textX, 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(180, 190, 205);
        doc.text("Sistema de Gestão de Entregas de Veículos", textX, 15);
        // Doc title right
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...WHITE);
        doc.text("RELATÓRIO DE PRESTAÇÃO DE CONTAS", PW - M, 10, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...ORANGE);
        doc.text(`OTD: ${otdNumber}`, PW - M, 14.5, { align: "right" });
        doc.setFontSize(6.5);
        doc.setTextColor(180, 190, 205);
        doc.text(`Doc. ID: ${docId}`, PW - M, 18.5, { align: "right" });
        doc.setTextColor(...DARK);
        return 30;
      };

      const drawFooter = () => {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(M, PH - 11, PW - M, PH - 11);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MID);
        doc.text(
          `Emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
          M, PH - 6.5
        );
        doc.text("OTD Logistics — Documento Confidencial", PW / 2, PH - 6.5, { align: "center" });
        doc.text(`Página ${pageNum}`, PW - M, PH - 6.5, { align: "right" });
        doc.setTextColor(...DARK);
      };

      const ensurePage = (needed: number, reservedBottom = 16) => {
        if (y + needed > PH - reservedBottom) {
          drawFooter();
          doc.addPage();
          pageNum++;
          y = drawPageTop();
        }
      };

      y = drawPageTop();

      // ── Section header (slim corporate style) ─────────────────────────
      const sectionHeader = (title: string) => {
        ensurePage(13);
        y += 3;
        doc.setFillColor(...ORANGE);
        doc.rect(M, y, 1.8, 6, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...NAVY);
        doc.text(title.toUpperCase(), M + 4, y + 4.4);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.line(M, y + 7.5, PW - M, y + 7.5);
        y += 11;
      };

      // ── 2-column key/value info table with borders ────────────────────
      const drawInfoTable = (rows: Array<[string, string | null | undefined]>) => {
        const validRows = rows.filter(([_, v]) => v !== null && v !== undefined && String(v).trim().length > 0);
        if (validRows.length === 0) return;
        const rowH = 8;
        const colW = CW / 2;
        const totalRows = Math.ceil(validRows.length / 2);
        ensurePage(totalRows * rowH + 2);
        const startY = y;
        for (let i = 0; i < validRows.length; i += 2) {
          const left = validRows[i];
          const right = validRows[i + 1];
          // alternating bg
          const isAlt = Math.floor(i / 2) % 2 === 1;
          if (isAlt) {
            doc.setFillColor(...SOFT);
            doc.rect(M, y, CW, rowH, "F");
          }
          // left column
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(...MID);
          doc.text(left[0].toUpperCase(), M + 2.5, y + 3.2);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(...DARK);
          const lv = doc.splitTextToSize(String(left[1]), colW - 5);
          doc.text(lv[0] || "", M + 2.5, y + 6.5);
          // right column
          if (right) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.setTextColor(...MID);
            doc.text(right[0].toUpperCase(), M + colW + 2.5, y + 3.2);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(...DARK);
            const rv = doc.splitTextToSize(String(right[1]), colW - 5);
            doc.text(rv[0] || "", M + colW + 2.5, y + 6.5);
          }
          y += rowH;
        }
        // outer border + grid
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.rect(M, startY, CW, y - startY, "S");
        // vertical divider
        doc.setLineWidth(0.15);
        doc.line(M + colW, startY, M + colW, y);
        // horizontal grid
        for (let i = 1; i < totalRows; i++) {
          doc.line(M, startY + i * rowH, M + CW, startY + i * rowH);
        }
        y += 3;
      };

      // ── STATUS BANNER ─────────────────────────────────────────────────
      const statusColors: Record<string, [number, number, number]> = {
        aprovado: GREEN, devolvido: RED, enviado: YELLOW, pendente: MID,
        assinado: ORANGE, enviado_nfs: BLUE, concluido: GREEN,
      };
      const statusLabels: Record<string, string> = {
        aprovado: "APROVADO", devolvido: "DEVOLVIDO", enviado: "AGUARDANDO ANÁLISE",
        pendente: "PENDENTE", assinado: "ASSINADO", enviado_nfs: "ENVIADO PARA NFS",
        concluido: "CONCLUÍDO",
      };
      const sCode = settlement.status || "pendente";
      const sc = statusColors[sCode] || MID;
      ensurePage(11);
      doc.setFillColor(...sc);
      doc.rect(M, y, 4, 9, "F");
      doc.setFillColor(...LIGHT);
      doc.rect(M + 4, y, CW - 4, 9, "F");
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.rect(M, y, CW, 9, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MID);
      doc.text("STATUS DO DOCUMENTO", M + 7, y + 3.6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...sc);
      doc.text(statusLabels[sCode] || sCode.toUpperCase(), M + 7, y + 7.5);
      if (settlement.approvedAt) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...MID);
        doc.text(`Aprovado em ${fmtDt(settlement.approvedAt?.toString())}`, PW - M - 3, y + 6, { align: "right" });
      }
      doc.setTextColor(...DARK);
      y += 12;

      // ── INFORMAÇÕES DO TRANSPORTE ────────────────────────────────────
      sectionHeader("Informações do Transporte");
      const t = settlement.transport;
      drawInfoTable([
        ["Nº da Solicitação", t?.requestNumber],
        ["Chassi do Veículo", t?.vehicleChassi],
        ["Cliente", t?.client?.name],
        ["Pátio de Origem", t?.originYard?.name],
        ["Local de Entrega", t?.deliveryLocation
          ? `${t.deliveryLocation.name} — ${t.deliveryLocation.city}/${t.deliveryLocation.state}` : null],
        ["Distância da Rota", settlement.routeDistance ? `${settlement.routeDistance} km` : null],
        ["Data de Saída", t?.checkinDateTime ? fmtDt(t.checkinDateTime?.toString()) : null],
        ["Data de Entrega", t?.checkoutDateTime ? fmtDt(t.checkoutDateTime?.toString()) : null],
      ]);

      // ── INFORMAÇÕES DO MOTORISTA ─────────────────────────────────────
      sectionHeader("Informações do Motorista");
      drawInfoTable([
        ["Nome Completo", settlement.driver?.name],
        ["CPF", settlement.driver?.cpf],
        ["Telefone", settlement.driver?.phone],
        ["Modalidade", settlement.driver?.modality?.toUpperCase()],
      ]);

      // ── RESUMO FINANCEIRO ───────────────────────────────────────────
      sectionHeader("Resumo Financeiro por Categoria");
      const items = settlement.items || [];
      const approvedItems = items.filter(i => (i as any).itemStatus === "aprovado");
      const totalSubmitted = items.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
      const totalComprovado = approvedItems.reduce((s, i) => s + parseFloat((i as any).approvedAmount || "0"), 0);
      const proposalAdvance = (settlement as any).proposalAdvanceAmount;
      const advanceAmount = parseFloat(settlement.advanceAmount || proposalAdvance || "0");
      const approximateValue = parseFloat((settlement as any).proposalApproximateValue || "0");
      const lancamentosList: SettlementLancamentoItem[] = (settlement as any).settlementLancamentos || [];
      const totalDebitos = lancamentosList.filter(l => l.lancamento.tipo === "debito").reduce((s, l) => s + parseFloat(l.lancamento.valor), 0);
      const totalCreditos = lancamentosList.filter(l => l.lancamento.tipo === "credito").reduce((s, l) => s + parseFloat(l.lancamento.valor), 0);
      const totalDamageCostPDF = damageReports
        .filter((dr: any) => dr.includeInCost && dr.repairCost)
        .reduce((s: number, dr: any) => s + parseFloat(String(dr.repairCost)), 0);
      const balance = advanceAmount - totalComprovado - approximateValue + totalDebitos - totalCreditos + totalDamageCostPDF;

      const typeLabels: Record<string, string> = {
        combustivel: "Combustível", pedagio: "Pedágio", hospedagem: "Hospedagem",
        alimentacao: "Alimentação", passagem: "Passagem", outros: "Outros",
      };
      const types = ["combustivel", "pedagio", "hospedagem", "alimentacao", "passagem", "outros"];

      // Table with proper borders
      const headers = ["Categoria", "Qtd. Enviada", "Qtd. Aprovada", "Valor Enviado", "Valor Aprovado"];
      const colWs = [50, 25, 28, 38, 39];
      const colXs: number[] = [];
      let acc = M;
      for (const w of colWs) { colXs.push(acc); acc += w; }
      const aligns: Array<"left" | "center" | "right"> = ["left", "center", "center", "right", "right"];

      const drawCell = (text: string, colIdx: number, rowY: number, rowH: number, opts?: { bold?: boolean; color?: [number,number,number]; size?: number }) => {
        doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
        doc.setFontSize(opts?.size ?? 7.8);
        doc.setTextColor(...(opts?.color ?? DARK));
        const align = aligns[colIdx];
        const padX = 2;
        let tx = colXs[colIdx] + padX;
        if (align === "right") tx = colXs[colIdx] + colWs[colIdx] - padX;
        else if (align === "center") tx = colXs[colIdx] + colWs[colIdx] / 2;
        doc.text(text, tx, rowY + rowH / 2 + 1.5, { align });
      };

      const headH = 8;
      const rowH = 7.5;
      const totH = 9;

      // Per-page state: when ensurePage breaks, close current page borders
      // before moving on, then redraw header on new page.
      let resPageStartY = 0;
      let resRowYsThisPage: number[] = [];

      const closeResumoPage = () => {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.rect(M, resPageStartY, CW, y - resPageStartY, "S");
        doc.setLineWidth(0.15);
        for (let i = 1; i < colWs.length; i++) {
          doc.line(colXs[i], resPageStartY, colXs[i], y);
        }
        resRowYsThisPage.forEach(ry => doc.line(M, ry, M + CW, ry));
      };

      const openResumoHeader = () => {
        resPageStartY = y;
        resRowYsThisPage = [];
        doc.setFillColor(...NAVY);
        doc.rect(M, y, CW, headH, "F");
        headers.forEach((h, i) => drawCell(h, i, y, headH, { bold: true, color: WHITE, size: 7.5 }));
        y += headH;
      };

      ensurePage(headH + rowH + totH + 4);
      openResumoHeader();

      // Body rows
      let zebra = 0;
      const emittedTypes: string[] = [];
      for (const type of types) {
        const typeItems = items.filter(i => i.type === type);
        if (typeItems.length === 0) continue;
        emittedTypes.push(type);
        const typeApproved = typeItems.filter(i => (i as any).itemStatus === "aprovado");
        const typeSubmittedVal = typeItems.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
        const typeApprovedVal = typeApproved.reduce((s, i) => s + parseFloat((i as any).approvedAmount || "0"), 0);
        // Check if row + totals fits on this page; if not, close and break
        if (y + rowH + totH > PH - 16) {
          closeResumoPage();
          drawFooter();
          doc.addPage();
          pageNum++;
          y = drawPageTop();
          openResumoHeader();
          zebra = 0;
        }
        if (zebra % 2 === 1) {
          doc.setFillColor(...SOFT);
          doc.rect(M, y, CW, rowH, "F");
        }
        resRowYsThisPage.push(y);
        drawCell(typeLabels[type], 0, y, rowH, { bold: true });
        drawCell(String(typeItems.length), 1, y, rowH);
        drawCell(String(typeApproved.length), 2, y, rowH);
        drawCell(fmtCur(typeSubmittedVal), 3, y, rowH);
        drawCell(fmtCur(typeApprovedVal), 4, y, rowH, { color: GREEN, bold: true });
        y += rowH;
        zebra++;
      }
      if (emittedTypes.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...MID);
        doc.text("Nenhum item registrado nesta prestação.", M + CW / 2, y + 5, { align: "center" });
        y += 10;
      }
      // Totals row (always on same page as previous row since we reserved space)
      if (y + totH > PH - 16) {
        closeResumoPage();
        drawFooter();
        doc.addPage();
        pageNum++;
        y = drawPageTop();
        openResumoHeader();
      }
      resRowYsThisPage.push(y);
      doc.setFillColor(...NAVY);
      doc.rect(M, y, CW, totH, "F");
      drawCell("TOTAL", 0, y, totH, { bold: true, color: WHITE, size: 8 });
      drawCell(String(items.length), 1, y, totH, { bold: true, color: WHITE, size: 8 });
      drawCell(String(approvedItems.length), 2, y, totH, { bold: true, color: WHITE, size: 8 });
      drawCell(fmtCur(totalSubmitted), 3, y, totH, { bold: true, color: [255, 200, 150], size: 8 });
      drawCell(fmtCur(totalComprovado), 4, y, totH, { bold: true, color: [180, 240, 195], size: 8 });
      y += totH;
      closeResumoPage();
      y += 5;

      // ── AVARIAS ADICIONADAS PELO OPERADOR (sumário rápido) ──────────
      if (damageReports.length > 0) {
        sectionHeader(`Avarias Adicionadas pelo Operador (${damageReports.length})`);

        // Compact table: Nome | Categoria | Severidade | Custo | Incluso
        const dmgHeaders = ["Avaria", "Categoria", "Severidade", "Custo", "Incluso no Saldo"];
        const dmgColWs = [48, 30, 28, 32, 42];
        const dmgColXs: number[] = [];
        let dmgAcc = M;
        for (const w of dmgColWs) { dmgColXs.push(dmgAcc); dmgAcc += w; }
        const dmgAligns: Array<"left"|"center"|"center"|"right"|"center"> = ["left","center","center","right","center"];

        const drawDmgCell = (text: string, colIdx: number, rowY: number, rowH: number, opts?: { bold?: boolean; color?: [number,number,number]; size?: number }) => {
          doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
          doc.setFontSize(opts?.size ?? 7.5);
          doc.setTextColor(...(opts?.color ?? DARK));
          const align = dmgAligns[colIdx] ?? "left";
          const padX = 2;
          let tx = dmgColXs[colIdx] + padX;
          if (align === "right") tx = dmgColXs[colIdx] + dmgColWs[colIdx] - padX;
          else if (align === "center") tx = dmgColXs[colIdx] + dmgColWs[colIdx] / 2;
          const lines = doc.splitTextToSize(text, dmgColWs[colIdx] - padX * 2);
          doc.text(lines[0] || "", tx, rowY + rowH / 2 + 1.5, { align });
          doc.setTextColor(...DARK);
        };

        const dmgHeadH = 8;
        const dmgRowH = 8;
        ensurePage(dmgHeadH + dmgRowH * damageReports.length + 4);

        const dmgStartY = y;
        // Header
        doc.setFillColor(...NAVY);
        doc.rect(M, y, CW, dmgHeadH, "F");
        dmgHeaders.forEach((h, i) => drawDmgCell(h, i, y, dmgHeadH, { bold: true, color: WHITE, size: 7 }));
        y += dmgHeadH;

        const dmgRowYs: number[] = [];
        for (let di = 0; di < damageReports.length; di++) {
          const dr = damageReports[di];
          // Check page break
          if (y + dmgRowH > PH - 16) {
            doc.setDrawColor(...BORDER);
            doc.setLineWidth(0.3);
            doc.rect(M, dmgStartY, CW, y - dmgStartY, "S");
            doc.setLineWidth(0.15);
            for (let i = 1; i < dmgColWs.length; i++) doc.line(dmgColXs[i], dmgStartY, dmgColXs[i], y);
            dmgRowYs.forEach(ry => doc.line(M, ry, M + CW, ry));
            drawFooter(); doc.addPage(); pageNum++; y = drawPageTop();
          }
          if (di % 2 === 1) { doc.setFillColor(...SOFT); doc.rect(M, y, CW, dmgRowH, "F"); }
          dmgRowYs.push(y);

          const costVal = dr.repairCost ? parseFloat(String(dr.repairCost)) : 0;
          const costStr = costVal > 0 ? costVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
          const inclusoStr = dr.includeInCost ? "SIM" : "NÃO";
          const inclusoColor: [number,number,number] = dr.includeInCost ? RED : GREEN;

          drawDmgCell(dr.damageTypeName || "—", 0, y, dmgRowH, { bold: true });
          drawDmgCell(dr.damageTypeCategory ? dr.damageTypeCategory.toUpperCase() : "—", 1, y, dmgRowH, { color: MID });
          drawDmgCell(dr.severityLabel || dr.severity, 2, y, dmgRowH);
          drawDmgCell(costStr, 3, y, dmgRowH, { bold: costVal > 0, color: costVal > 0 ? RED : MID });
          drawDmgCell(inclusoStr, 4, y, dmgRowH, { bold: true, color: inclusoColor });
          y += dmgRowH;
        }

        // Close table borders
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.rect(M, dmgStartY, CW, y - dmgStartY, "S");
        doc.setLineWidth(0.15);
        for (let i = 1; i < dmgColWs.length; i++) doc.line(dmgColXs[i], dmgStartY, dmgColXs[i], y);
        dmgRowYs.forEach(ry => doc.line(M, ry, M + CW, ry));
        doc.setTextColor(...DARK);
        y += 5;
      }

      // ── BALANÇO FINANCEIRO ──────────────────────────────────────────
      sectionHeader("Balanço Financeiro");
      // 3-column financial summary table
      const fHeaders = ["Adiantamento", "Valor da Rota (Ganho)", "Total Comprovado"];
      const fValues = [advanceAmount, approximateValue, totalComprovado];
      const fColors: Array<[number,number,number]> = [GREEN, BLUE, [110, 60, 150]];
      const fColW = CW / 3;
      ensurePage(20);
      const fStartY = y;
      // header strip
      doc.setFillColor(...LIGHT);
      doc.rect(M, y, CW, 6, "F");
      for (let i = 0; i < 3; i++) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MID);
        doc.text(fHeaders[i].toUpperCase(), M + i * fColW + fColW / 2, y + 4, { align: "center" });
      }
      y += 6;
      // value strip
      doc.setFillColor(...WHITE);
      doc.rect(M, y, CW, 11, "F");
      for (let i = 0; i < 3; i++) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(...fColors[i]);
        doc.text(fmtCur(fValues[i]), M + i * fColW + fColW / 2, y + 7.5, { align: "center" });
      }
      y += 11;
      // borders
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.rect(M, fStartY, CW, y - fStartY, "S");
      doc.setLineWidth(0.15);
      doc.line(M + fColW, fStartY, M + fColW, y);
      doc.line(M + 2 * fColW, fStartY, M + 2 * fColW, y);
      doc.line(M, fStartY + 6, M + CW, fStartY + 6);
      y += 4;

      // ── LANÇAMENTOS ─────────────────────────────────────────────────
      if (lancamentosList.length > 0) {
        sectionHeader("Lançamentos");
        const lHeaders = ["Tipo", "Descrição", "Detalhes", "Valor"];
        const lColWs = [22, 60, 68, 30];
        const lColXs: number[] = [];
        let lAcc = M;
        for (const w of lColWs) { lColXs.push(lAcc); lAcc += w; }
        const lAligns: Array<"left" | "center" | "right"> = ["center", "left", "left", "right"];

        const drawLancCell = (text: string, colIdx: number, rowY: number, rowH: number, opts?: { bold?: boolean; color?: [number,number,number]; size?: number }) => {
          doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
          doc.setFontSize(opts?.size ?? 7.8);
          doc.setTextColor(...(opts?.color ?? DARK));
          const align = lAligns[colIdx];
          const padX = 2;
          let tx = lColXs[colIdx] + padX;
          if (align === "right") tx = lColXs[colIdx] + lColWs[colIdx] - padX;
          else if (align === "center") tx = lColXs[colIdx] + lColWs[colIdx] / 2;
          doc.text(text, tx, rowY + rowH / 2 + 1.5, { align });
        };

        const lHeadH = 8;
        const lRowH = 7.5;
        ensurePage(lHeadH + lRowH);
        const lStartY = y;

        // header
        doc.setFillColor(...NAVY);
        doc.rect(M, y, CW, lHeadH, "F");
        lHeaders.forEach((h, i) => drawLancCell(h, i, y, lHeadH, { bold: true, color: WHITE, size: 7.5 }));
        y += lHeadH;

        const lRowYs: number[] = [];
        let lZebra = 0;
        for (const sl of lancamentosList) {
          if (y + lRowH > PH - 16) {
            doc.setDrawColor(...BORDER);
            doc.setLineWidth(0.3);
            doc.rect(M, lStartY, CW, y - lStartY, "S");
            doc.setLineWidth(0.15);
            for (let i = 1; i < lColWs.length; i++) doc.line(lColXs[i], lStartY, lColXs[i], y);
            lRowYs.forEach(ry => doc.line(M, ry, M + CW, ry));
            drawFooter();
            doc.addPage();
            pageNum++;
            y = drawPageTop();
          }
          if (lZebra % 2 === 1) {
            doc.setFillColor(...SOFT);
            doc.rect(M, y, CW, lRowH, "F");
          }
          lRowYs.push(y);
          const tipoColor: [number,number,number] = sl.lancamento.tipo === "credito" ? GREEN : RED;
          const tipoLabel = sl.lancamento.tipo === "credito" ? "Crédito" : "Débito";
          const valor = parseFloat(sl.lancamento.valor);
          drawLancCell(tipoLabel, 0, y, lRowH, { bold: true, color: tipoColor });
          drawLancCell(sl.lancamento.nome, 1, y, lRowH);
          drawLancCell(sl.lancamento.detalhes || "—", 2, y, lRowH, { color: MID });
          drawLancCell(fmtCur(valor), 3, y, lRowH, { bold: true, color: tipoColor });
          y += lRowH;
          lZebra++;
        }

        // totals row
        const lTotH = 9;
        if (y + lTotH > PH - 16) {
          doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
          doc.rect(M, lStartY, CW, y - lStartY, "S");
          doc.setLineWidth(0.15);
          for (let i = 1; i < lColWs.length; i++) doc.line(lColXs[i], lStartY, lColXs[i], y);
          lRowYs.forEach(ry => doc.line(M, ry, M + CW, ry));
          drawFooter(); doc.addPage(); pageNum++; y = drawPageTop();
        }
        lRowYs.push(y);
        doc.setFillColor(...LIGHT);
        doc.rect(M, y, CW, lTotH, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.8); doc.setTextColor(...DARK);
        doc.text("SUBTOTAL LANÇAMENTOS", M + 2, y + lTotH / 2 + 1.5);
        if (totalDebitos > 0) {
          doc.setTextColor(...RED);
          doc.text(`Débitos: +${fmtCur(totalDebitos)}`, M + 85, y + lTotH / 2 + 1.5);
        }
        if (totalCreditos > 0) {
          doc.setTextColor(...GREEN);
          doc.text(`Créditos: −${fmtCur(totalCreditos)}`, M + 120, y + lTotH / 2 + 1.5);
        }
        y += lTotH;

        doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
        doc.rect(M, lStartY, CW, y - lStartY, "S");
        doc.setLineWidth(0.15);
        for (let i = 1; i < lColWs.length; i++) doc.line(lColXs[i], lStartY, lColXs[i], y);
        lRowYs.forEach(ry => doc.line(M, ry, M + CW, ry));
        doc.setTextColor(...DARK);
        y += 5;
      }

      // Saldo final row
      ensurePage(22);
      const balColor = balance > 0 ? RED : balance < 0 ? GREEN : MID;
      const balLabel = balance > 0 ? "MOTORISTA DEVE DEVOLVER À EMPRESA"
                     : balance < 0 ? "MOTORISTA DEVE RECEBER DA EMPRESA"
                     : "SALDO ZERADO";
      doc.setDrawColor(...balColor);
      doc.setLineWidth(0.6);
      doc.rect(M, y, CW, 18, "S");
      doc.setFillColor(...balColor);
      doc.rect(M, y, 4, 18, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...MID);
      doc.text("SALDO FINAL", M + 7, y + 5);
      doc.setFontSize(9.5);
      doc.setTextColor(...balColor);
      doc.text(balLabel, M + 7, y + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...MID);
      {
        const formulaParts = [`Adiantamento (${fmtCur(advanceAmount)}) − Comprovado (${fmtCur(totalComprovado)}) − Rota (${fmtCur(approximateValue)})`];
        if (totalDebitos > 0) formulaParts.push(`+ Débitos (${fmtCur(totalDebitos)})`);
        if (totalCreditos > 0) formulaParts.push(`− Créditos (${fmtCur(totalCreditos)})`);
        if (totalDamageCostPDF > 0) formulaParts.push(`+ Avarias (${fmtCur(totalDamageCostPDF)})`);
        doc.text(`Cálculo: ${formulaParts.join(" ")}`, M + 7, y + 14.5);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...balColor);
      doc.text(fmtCur(Math.abs(balance)), PW - M - 3, y + 11.5, { align: "right" });
      doc.setTextColor(...DARK);
      y += 22;

      // ── OBSERVAÇÕES ─────────────────────────────────────────────────
      if (settlement.driverNotes) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const noteLines = doc.splitTextToSize(settlement.driverNotes, CW - 6);
        const nh = noteLines.length * 4.5 + 6;
        sectionHeader("Observações do Motorista");
        ensurePage(nh + 4);
        doc.setFillColor(...LIGHT);
        doc.rect(M, y, CW, nh, "F");
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.rect(M, y, CW, nh, "S");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...DARK);
        doc.text(noteLines, M + 3, y + 5);
        y += nh + 4;
      }

      // ── DETALHAMENTO DOS COMPROVANTES (item por item) ────────────────
      sectionHeader("Detalhamento dos Comprovantes");

      const itemStatusLabel: Record<string, string> = {
        aprovado: "APROVADO", reprovado: "REPROVADO", pendente: "PENDENTE",
      };
      const itemStatusColor: Record<string, [number, number, number]> = {
        aprovado: GREEN, reprovado: RED, pendente: YELLOW,
      };

      // Compact items index table — per-page pagination
      const idxHeaders = ["#", "Categoria", "Descrição", "Status", "Valor Enviado", "Valor Aprovado"];
      const idxColWs = [10, 28, 62, 24, 28, 28];
      const idxColXs: number[] = [];
      let iacc = M;
      for (const w of idxColWs) { idxColXs.push(iacc); iacc += w; }
      const idxAligns: Array<"left"|"center"|"right"> = ["center","left","left","center","right","right"];
      const drawIdxCell = (text: string, colIdx: number, rowY: number, rowH: number, opts?: { bold?: boolean; color?: [number,number,number]; size?: number }) => {
        doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
        doc.setFontSize(opts?.size ?? 7.3);
        doc.setTextColor(...(opts?.color ?? DARK));
        const align = idxAligns[colIdx];
        const padX = 2;
        let tx = idxColXs[colIdx] + padX;
        if (align === "right") tx = idxColXs[colIdx] + idxColWs[colIdx] - padX;
        else if (align === "center") tx = idxColXs[colIdx] + idxColWs[colIdx] / 2;
        const lines = doc.splitTextToSize(text, idxColWs[colIdx] - padX * 2);
        doc.text(lines[0] || "", tx, rowY + rowH / 2 + 1.4, { align });
      };
      const idxHeadH = 7.5;
      const idxRowH = 6.5;

      let idxPageStartY = 0;
      let idxRowYsThisPage: number[] = [];
      const closeIdxPage = () => {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.rect(M, idxPageStartY, CW, y - idxPageStartY, "S");
        doc.setLineWidth(0.15);
        for (let i = 1; i < idxColWs.length; i++) doc.line(idxColXs[i], idxPageStartY, idxColXs[i], y);
        idxRowYsThisPage.forEach(ry => doc.line(M, ry, M + CW, ry));
      };
      const openIdxHeader = () => {
        idxPageStartY = y;
        idxRowYsThisPage = [];
        doc.setFillColor(...NAVY);
        doc.rect(M, y, CW, idxHeadH, "F");
        idxHeaders.forEach((h, i) => drawIdxCell(h, i, y, idxHeadH, { bold: true, color: WHITE, size: 7.2 }));
        y += idxHeadH;
      };

      ensurePage(idxHeadH + idxRowH * 2 + 4);
      openIdxHeader();
      let idxZebra = 0;
      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        const ist = (it as any).itemStatus || "pendente";
        const approvedAmt = (it as any).approvedAmount;
        if (y + idxRowH > PH - 16) {
          closeIdxPage();
          drawFooter();
          doc.addPage();
          pageNum++;
          y = drawPageTop();
          openIdxHeader();
          idxZebra = 0;
        }
        if (idxZebra % 2 === 1) {
          doc.setFillColor(...SOFT);
          doc.rect(M, y, CW, idxRowH, "F");
        }
        idxRowYsThisPage.push(y);
        drawIdxCell(String(idx + 1), 0, y, idxRowH);
        drawIdxCell(typeLabels[it.type] || it.type, 1, y, idxRowH);
        drawIdxCell(it.description || "—", 2, y, idxRowH);
        drawIdxCell(itemStatusLabel[ist] || ist.toUpperCase(), 3, y, idxRowH, { bold: true, color: itemStatusColor[ist] || MID, size: 6.8 });
        drawIdxCell(fmtCur(it.amount, it.currency || "BRL"), 4, y, idxRowH);
        drawIdxCell(approvedAmt ? fmtCur(approvedAmt, it.currency || "BRL") : "—", 5, y, idxRowH, ist === "aprovado" ? { color: GREEN, bold: true } : undefined);
        y += idxRowH;
        idxZebra++;
      }
      closeIdxPage();
      y += 6;

      // ── COMPROVANTES (foto a foto) — começam em nova página ─────────
      if (items.some(i => i.photoUrl)) {
        drawFooter();
        doc.addPage();
        pageNum++;
        y = drawPageTop();
        sectionHeader("Anexos — Imagens dos Comprovantes");

        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          if (!item.photoUrl) continue;
          const ist = (item as any).itemStatus || "pendente";
          const approvedAmt = (item as any).approvedAmount;
          const stColor = itemStatusColor[ist] || MID;

          // ── Pre-fetch image and compute final dimensions BEFORE drawing
          // anything so the entire card can be rendered atomically (no
          // mid-card page break, no broken outer border).
          const imgUrl = normalizeImageUrl(item.photoUrl);
          // Recompacta a imagem como JPEG (máx 1280px no maior lado, qualidade 0.7)
          // para evitar PDFs com dezenas de MB que estouram o limite do Autentique (20MB).
          const imgData = await fetchImageAsCompressedJpeg(imgUrl, 1280, 0.7);
          let iW = 0, iH = 0, imgFormat: "PNG" | "JPEG" = "JPEG", imgOk = false;
          if (imgData) {
            try {
              const dims = await new Promise<{ w: number; h: number }>((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                img.onerror = () => resolve({ w: 4, h: 3 });
                img.src = imgData;
              });
              const maxW = CW - 8;
              const maxH = 95;
              const ratio = dims.w / dims.h;
              iW = maxW;
              iH = iW / ratio;
              if (iH > maxH) { iH = maxH; iW = iH * ratio; }
              imgFormat = "JPEG";
              imgOk = true;
            } catch {
              imgOk = false;
            }
          }

          const cardHeadH = 9;
          const cardDetailH = 8;
          const cardImageBlockH = imgOk ? (iH + 6) : 12;
          const cardTotalH = cardHeadH + cardDetailH + cardImageBlockH;

          // Atomic check — if it doesn't fit, force new page BEFORE drawing
          if (y + cardTotalH > PH - 16) {
            drawFooter();
            doc.addPage();
            pageNum++;
            y = drawPageTop();
          }

          const cardStartY = y;

          // Header strip (gray)
          doc.setFillColor(...LIGHT);
          doc.rect(M, y, CW, cardHeadH, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(...NAVY);
          doc.text(`COMPROVANTE Nº ${String(idx + 1).padStart(2, "0")}`, M + 3, y + 5.5);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...DARK);
          doc.text(`${typeLabels[item.type] || item.type}`, M + 38, y + 5.5);
          // Status pill
          doc.setFillColor(...stColor);
          doc.roundedRect(PW - M - 28, y + 2, 26, 5, 1, 1, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.8);
          doc.setTextColor(...WHITE);
          doc.text(itemStatusLabel[ist] || ist.toUpperCase(), PW - M - 15, y + 5.4, { align: "center" });
          doc.setTextColor(...DARK);
          y += cardHeadH;

          // Detail row (description + values) inline
          doc.setFillColor(...WHITE);
          doc.rect(M, y, CW, cardDetailH, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.8);
          doc.setTextColor(...MID);
          doc.text("DESCRIÇÃO", M + 3, y + 3);
          doc.text("VALOR ENVIADO", M + CW * 0.55, y + 3);
          if (ist === "aprovado" && approvedAmt) {
            doc.text("VALOR APROVADO", M + CW * 0.78, y + 3);
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...DARK);
          const descTxt = item.description || "—";
          const descLines = doc.splitTextToSize(descTxt, CW * 0.5);
          doc.text(descLines[0] || "—", M + 3, y + 6.5);
          doc.text(fmtCur(item.amount, item.currency || "BRL"), M + CW * 0.55, y + 6.5);
          if (ist === "aprovado" && approvedAmt) {
            doc.setTextColor(...GREEN);
            doc.text(fmtCur(approvedAmt, item.currency || "BRL"), M + CW * 0.78, y + 6.5);
            doc.setTextColor(...DARK);
          }
          y += cardDetailH;

          // Image block (or placeholder)
          if (imgOk && imgData) {
            const ix = M + 4 + ((CW - 8) - iW) / 2;
            doc.setFillColor(...LIGHT);
            doc.rect(M, y, CW, iH + 6, "F");
            try {
              doc.addImage(imgData, imgFormat, ix, y + 3, iW, iH, undefined, "MEDIUM");
              doc.setDrawColor(...BORDER);
              doc.setLineWidth(0.2);
              doc.rect(ix, y + 3, iW, iH, "S");
            } catch {
              doc.setFont("helvetica", "italic");
              doc.setFontSize(8);
              doc.setTextColor(...MID);
              doc.text("[Não foi possível incorporar a imagem]", M + CW / 2, y + iH / 2 + 3, { align: "center" });
              doc.setTextColor(...DARK);
            }
            y += iH + 6;
          } else {
            doc.setFillColor(...LIGHT);
            doc.rect(M, y, CW, 12, "F");
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(...MID);
            doc.text("[Imagem não disponível]", M + CW / 2, y + 7, { align: "center" });
            doc.setTextColor(...DARK);
            y += 12;
          }

          // Card outer border (now guaranteed within a single page)
          doc.setDrawColor(...BORDER);
          doc.setLineWidth(0.3);
          doc.rect(M, cardStartY, CW, y - cardStartY, "S");
          y += 4;
        }
      }

      // ── INFORMAÇÕES DE APROVAÇÃO ───────────────────────────────────
      const reviewedByUserName = (settlement as any).reviewedByUserName;
      if (reviewedByUserName || settlement.approvedAt) {
        sectionHeader("Informações de Aprovação");
        ensurePage(20);
        const apY = y;
        doc.setFillColor(240, 248, 242);
        doc.rect(M, y, CW, 16, "F");
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(0.4);
        doc.rect(M, y, CW, 16, "S");
        doc.setFillColor(...GREEN);
        doc.rect(M, y, 3, 16, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...GREEN);
        doc.text("DOCUMENTO APROVADO", M + 6, y + 5.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...MID);
        if (reviewedByUserName) {
          doc.text("Aprovado por:", M + 6, y + 11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text(reviewedByUserName, M + 30, y + 11);
        }
        if (settlement.approvedAt) {
          const approvedDate = format(new Date(settlement.approvedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...MID);
          doc.text("Data:", M + CW / 2, y + 11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text(approvedDate, M + CW / 2 + 14, y + 11);
        }
        doc.setTextColor(...DARK);
        y = apY + 20;
      }

      // ── AVARIAS REPORTADAS ─────────────────────────────────────────
      if (damageReports.length > 0) {
        drawFooter();
        doc.addPage();
        pageNum++;
        y = drawPageTop();
        sectionHeader(`Avarias Reportadas durante o Transporte (${damageReports.length})`);

        const RED_SOFT: [number, number, number] = [255, 245, 245];
        const RED_BORDER: [number, number, number] = [220, 100, 100];

        for (let di = 0; di < damageReports.length; di++) {
          const dr = damageReports[di];

          const cardHeadH = 10;
          const detailRowH = 9;
          // Rows: Severidade+Custo | Marca+Chassi | Incluso
          const numDetailRows = 3;
          const detailBlockH = numDetailRows * detailRowH;
          const cardTotalH = cardHeadH + detailBlockH + 4;

          if (y + cardTotalH > PH - 16) {
            drawFooter();
            doc.addPage();
            pageNum++;
            y = drawPageTop();
          }

          const cardStart = y;

          // ── Header strip ─────────────────────────────────────────────
          doc.setFillColor(...RED_SOFT);
          doc.rect(M, y, CW, cardHeadH, "F");
          doc.setFillColor(...RED_BORDER);
          doc.rect(M, y, 3.5, cardHeadH, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...NAVY);
          doc.text(
            `AVARIA Nº ${String(di + 1).padStart(2, "0")}${dr.damageTypeName ? ` — ${dr.damageTypeName}` : ""}`,
            M + 7, y + 6.5
          );
          if (dr.damageTypeCategory) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...MID);
            doc.text(dr.damageTypeCategory.toUpperCase(), PW - M - 3, y + 6.5, { align: "right" });
          }
          doc.setTextColor(...DARK);
          y += cardHeadH;

          // ── Detail grid (3 rows × 2 cols) ────────────────────────────
          const colL = M;
          const colR = M + CW / 2;
          const colHalfW = CW / 2;

          const drawDetailCell = (label: string, value: string, x: number, w: number, rowY: number, valueColor?: [number,number,number]) => {
            doc.setFillColor(...LIGHT);
            doc.rect(x, rowY, w, detailRowH, "F");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.setTextColor(...MID);
            doc.text(label.toUpperCase(), x + 3, rowY + 3.2);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(...(valueColor ?? DARK));
            doc.text(value || "—", x + 3, rowY + 7.5);
            doc.setTextColor(...DARK);
          };

          // Row 1 — Severidade | Custo de Reparo
          const sevLabel = dr.severityLabel || dr.severity;
          const costVal = dr.repairCost ? parseFloat(String(dr.repairCost)) : 0;
          const costStr = costVal > 0 ? costVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado";
          if (di % 2 === 0) {
            doc.setFillColor(...WHITE);
          } else {
            doc.setFillColor(249, 250, 251);
          }
          drawDetailCell("Severidade", sevLabel, colL, colHalfW, y);
          drawDetailCell("Custo de Reparo", costStr, colR, colHalfW, y, costVal > 0 ? RED : MID);
          y += detailRowH;

          // Row 2 — Marca | Chassi
          drawDetailCell("Marca", dr.damageTypeBrand ? dr.damageTypeBrand.toUpperCase() : "—", colL, colHalfW, y);
          drawDetailCell("Chassi do Veículo", dr.vehicleChassi || "—", colR, colHalfW, y);
          y += detailRowH;

          // Row 3 — Incluso no saldo (full width)
          const inclusoColor: [number,number,number] = dr.includeInCost ? RED : GREEN;
          const inclusoLabel = dr.includeInCost
            ? "SIM — Custo incluso no saldo da prestação de contas"
            : "NÃO — Custo não incluso no saldo da prestação de contas";
          doc.setFillColor(dr.includeInCost ? 255 : 240, dr.includeInCost ? 245 : 253, dr.includeInCost ? 245 : 244);
          doc.rect(M, y, CW, detailRowH, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(...MID);
          doc.text("CUSTO INCLUSO NA PRESTAÇÃO", M + 3, y + 3.2);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...inclusoColor);
          doc.text(inclusoLabel, M + 3, y + 7.5);
          doc.setTextColor(...DARK);
          y += detailRowH;

          // ── Card outer border ─────────────────────────────────────────
          // Inner grid lines
          doc.setDrawColor(...BORDER);
          doc.setLineWidth(0.15);
          // vertical divider for rows 1 and 2
          doc.line(M + colHalfW, cardStart + cardHeadH, M + colHalfW, cardStart + cardHeadH + detailRowH * 2);
          // horizontal row separators
          for (let r = 1; r <= numDetailRows; r++) {
            doc.line(M, cardStart + cardHeadH + r * detailRowH, M + CW, cardStart + cardHeadH + r * detailRowH);
          }
          doc.setDrawColor(...RED_BORDER);
          doc.setLineWidth(0.35);
          doc.rect(M, cardStart, CW, y - cardStart, "S");
          doc.setDrawColor(...BORDER);
          y += 5;
        }
      }

      // ── FOTOS DE AVARIA DA VISTORIA (checkin + checkout damage photos) ─
      const checkinDamagePhotos: string[] = (settlement.transport as any)?.checkinDamagePhotos || [];
      const checkoutDamagePhotos: string[] = (settlement.transport as any)?.checkoutDamagePhotos || [];
      const allVistoriaPhotos: Array<{ url: string; label: string }> = [
        ...checkinDamagePhotos.map((url) => ({ url, label: "AVARIA — CHECKIN" })),
        ...checkoutDamagePhotos.map((url) => ({ url, label: "AVARIA — CHECKOUT" })),
      ];

      if (allVistoriaPhotos.length > 0) {
        drawFooter();
        doc.addPage();
        pageNum++;
        y = drawPageTop();
        sectionHeader(`Fotos de Avaria da Vistoria do Veículo (${allVistoriaPhotos.length})`);

        const AMBER_SOFT: [number, number, number] = [255, 251, 235];
        const AMBER_BORDER: [number, number, number] = [217, 119, 6];

        for (let vi = 0; vi < allVistoriaPhotos.length; vi++) {
          const vp = allVistoriaPhotos[vi];

          let vImgData: string | null = null;
          let vImgW = 0, vImgH = 0, vImgOk = false;
          vImgData = await fetchImageAsCompressedJpeg(normalizeImageUrl(vp.url), 1280, 0.7);
          if (vImgData) {
            try {
              const dims = await new Promise<{ w: number; h: number }>((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                img.onerror = () => resolve({ w: 4, h: 3 });
                img.src = vImgData!;
              });
              const maxW = CW - 8;
              const maxH = 90;
              const ratio = dims.w / dims.h;
              vImgW = maxW;
              vImgH = vImgW / ratio;
              if (vImgH > maxH) { vImgH = maxH; vImgW = vImgH * ratio; }
              vImgOk = true;
            } catch { vImgOk = false; }
          }

          const cardHeadH = 10;
          const imgBlockH = vImgOk ? vImgH + 7 : 12;
          const cardTotalH = cardHeadH + imgBlockH + 4;

          if (y + cardTotalH > PH - 16) {
            drawFooter();
            doc.addPage();
            pageNum++;
            y = drawPageTop();
          }

          const cardStart = y;

          // Header strip
          doc.setFillColor(...AMBER_SOFT);
          doc.rect(M, y, CW, cardHeadH, "F");
          doc.setFillColor(...AMBER_BORDER);
          doc.rect(M, y, 3.5, cardHeadH, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...NAVY);
          doc.text(`${vp.label} — Foto ${vi + 1}`, M + 7, y + 6.5);
          doc.setTextColor(...DARK);
          y += cardHeadH;

          // Photo block
          if (vImgOk && vImgData) {
            doc.setFillColor(...LIGHT);
            doc.rect(M, y, CW, vImgH + 7, "F");
            const ix = M + 4 + ((CW - 8) - vImgW) / 2;
            try {
              doc.addImage(vImgData, "JPEG", ix, y + 3, vImgW, vImgH, undefined, "MEDIUM");
              doc.setDrawColor(...BORDER);
              doc.setLineWidth(0.2);
              doc.rect(ix, y + 3, vImgW, vImgH, "S");
            } catch {
              doc.setFont("helvetica", "italic");
              doc.setFontSize(8);
              doc.setTextColor(...MID);
              doc.text("[Não foi possível incorporar a imagem]", M + CW / 2, y + vImgH / 2 + 3, { align: "center" });
              doc.setTextColor(...DARK);
            }
            y += vImgH + 7;
          } else {
            doc.setFillColor(...LIGHT);
            doc.rect(M, y, CW, 12, "F");
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(...MID);
            doc.text("[Imagem não disponível]", M + CW / 2, y + 7, { align: "center" });
            doc.setTextColor(...DARK);
            y += 12;
          }

          // Card outer border
          doc.setDrawColor(...AMBER_BORDER);
          doc.setLineWidth(0.35);
          doc.rect(M, cardStart, CW, y - cardStart, "S");
          doc.setDrawColor(...BORDER);
          y += 5;
        }
      }

      // ── AVARIAS REPORTADAS PELO MOTORISTA DURANTE O TRANSPORTE ───────
      if (transportAppDamageReports.length > 0) {
        drawFooter();
        doc.addPage();
        pageNum++;
        y = drawPageTop();
        sectionHeader(`Avarias Reportadas pelo Motorista (${transportAppDamageReports.length})`);

        const APP_SOFT: [number, number, number] = [255, 251, 235];
        const APP_BORDER: [number, number, number] = [217, 119, 6];
        const detailRowH = 9;

        for (let ai = 0; ai < transportAppDamageReports.length; ai++) {
          const ar = transportAppDamageReports[ai];

          // Fetch and measure photo
          let aImgData: string | null = null;
          let aImgW = 0, aImgH = 0, aImgOk = false;
          aImgData = await fetchImageAsCompressedJpeg(normalizeImageUrl(ar.photoUrl), 1280, 0.7);
          if (aImgData) {
            try {
              const dims = await new Promise<{ w: number; h: number }>((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                img.onerror = () => resolve({ w: 4, h: 3 });
                img.src = aImgData!;
              });
              const maxW = CW - 8;
              const maxH = 80;
              const ratio = dims.w / dims.h;
              aImgW = maxW;
              aImgH = aImgW / ratio;
              if (aImgH > maxH) { aImgH = maxH; aImgW = aImgH * ratio; }
              aImgOk = true;
            } catch { aImgOk = false; }
          }

          const cardHeadH = 10;
          // Rows: Tipo+Categoria | Data | Localização | Descrição
          const numRows = ar.description ? 4 : (ar.latitude ? 3 : 2);
          const detailBlockH = numRows * detailRowH;
          const imgBlockH = aImgOk ? aImgH + 7 : 12;
          const cardTotalH = cardHeadH + detailBlockH + imgBlockH + 4;

          if (y + cardTotalH > PH - 16) {
            drawFooter();
            doc.addPage();
            pageNum++;
            y = drawPageTop();
          }

          const cardStart = y;

          // Header strip
          doc.setFillColor(...APP_SOFT);
          doc.rect(M, y, CW, cardHeadH, "F");
          doc.setFillColor(...APP_BORDER);
          doc.rect(M, y, 3.5, cardHeadH, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...NAVY);
          doc.text(
            `AVARIA Nº ${String(ai + 1).padStart(2, "0")}${ar.damageTypeName ? ` — ${ar.damageTypeName}` : ""}`,
            M + 7, y + 6.5
          );
          if (ar.damageTypeCategory) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...MID);
            doc.text(ar.damageTypeCategory.toUpperCase(), PW - M - 3, y + 6.5, { align: "right" });
          }
          doc.setTextColor(...DARK);
          y += cardHeadH;

          // Detail rows
          const colL = M;
          const colR = M + CW / 2;
          const colHalfW = CW / 2;
          const drawCell = (label: string, value: string, x: number, w: number, rowY: number) => {
            doc.setFillColor(...LIGHT);
            doc.rect(x, rowY, w, detailRowH, "F");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.setTextColor(...MID);
            doc.text(label.toUpperCase(), x + 3, rowY + 3.2);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(...DARK);
            doc.text(value || "—", x + 3, rowY + 7.5);
          };

          // Row 1: Chassi | Data
          const drDate = ar.createdAt ? new Date(ar.createdAt).toLocaleString("pt-BR") : "—";
          drawCell("Chassi do Veículo", ar.vehicleChassi || "—", colL, colHalfW, y);
          drawCell("Data / Hora", drDate, colR, colHalfW, y);
          doc.setDrawColor(...APP_BORDER);
          doc.setLineWidth(0.15);
          doc.line(M + colHalfW, y, M + colHalfW, y + detailRowH);
          y += detailRowH;

          // Row 2: Localização (full width)
          const locText = ar.latitude && ar.longitude
            ? `${parseFloat(ar.latitude).toFixed(6)}, ${parseFloat(ar.longitude).toFixed(6)}`
            : "Não registrada";
          drawCell("Localização (Lat, Long)", locText, M, CW, y);
          y += detailRowH;

          // Row 3: Descrição (if present, full width)
          if (ar.description) {
            drawCell("Descrição", ar.description, M, CW, y);
            y += detailRowH;
          }

          // Photo block
          if (aImgOk && aImgData) {
            doc.setFillColor(...LIGHT);
            doc.rect(M, y, CW, aImgH + 7, "F");
            const ix = M + 4 + ((CW - 8) - aImgW) / 2;
            try {
              doc.addImage(aImgData, "JPEG", ix, y + 3, aImgW, aImgH, undefined, "MEDIUM");
              doc.setDrawColor(...BORDER);
              doc.setLineWidth(0.2);
              doc.rect(ix, y + 3, aImgW, aImgH, "S");
            } catch {
              doc.setFont("helvetica", "italic");
              doc.setFontSize(8);
              doc.setTextColor(...MID);
              doc.text("[Não foi possível incorporar a imagem]", M + CW / 2, y + aImgH / 2 + 3, { align: "center" });
              doc.setTextColor(...DARK);
            }
            y += aImgH + 7;
          } else {
            doc.setFillColor(...LIGHT);
            doc.rect(M, y, CW, 12, "F");
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(...MID);
            doc.text("[Imagem não disponível]", M + CW / 2, y + 7, { align: "center" });
            doc.setTextColor(...DARK);
            y += 12;
          }

          // Card outer border
          doc.setDrawColor(...APP_BORDER);
          doc.setLineWidth(0.35);
          doc.rect(M, cardStart, CW, y - cardStart, "S");
          doc.setDrawColor(...BORDER);
          y += 5;
        }
      }

      // ── BLOCO DE ASSINATURA (final do documento) ──────────────────
      // Pre-compute the FULL block height (section header + declaration +
      // signature boxes + city/date line) so the entire block renders
      // atomically — never split between header and content.
      const declaration = `Declaro, para os devidos fins, que as informações e os comprovantes apresentados nesta prestação de contas referente à solicitação ${otdNumber} são verdadeiros e correspondem às despesas efetivamente realizadas durante a execução do transporte. Estou ciente do saldo apurado de ${fmtCur(Math.abs(balance))} ${balance > 0 ? "a ser devolvido à empresa" : balance < 0 ? "a ser recebido da empresa" : "(saldo zerado)"} e concordo com os valores apresentados.`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const declLines = doc.splitTextToSize(declaration, CW - 4);
      const sigBoxH_pre = 40;
      const sectionHeaderH = 12;     // approx height consumed by sectionHeader()
      const declBlockH = declLines.length * 4.2 + 6;
      const sigBoxesH = sigBoxH_pre + 6;
      const cityDateH = 10;
      const sigBlockTotalH = sectionHeaderH + declBlockH + sigBoxesH + cityDateH;

      if (y + sigBlockTotalH > PH - 16) {
        drawFooter();
        doc.addPage();
        pageNum++;
        y = drawPageTop();
      }
      sectionHeader("Termo de Conferência e Assinatura");

      // Declaration text (height already reserved above)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      doc.text(declLines, M + 2, y + 4);
      y += declLines.length * 4.2 + 6;

      // Signature row: driver (left) + reviewer (right)
      const sigBoxW = (CW - 8) / 2;
      const sigBoxH = 40;
      const driverSig = (settlement as any).driverSignature as string | undefined;
      const cityDateLine = `___________________________, _____ de _____________ de ${new Date().getFullYear()}`;

      // Driver signature box (left)
      const dx = M;
      doc.setFillColor(...WHITE);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.rect(dx, y, sigBoxW, sigBoxH, "S");
      // Header label
      doc.setFillColor(...LIGHT);
      doc.rect(dx, y, sigBoxW, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...NAVY);
      doc.text("ASSINATURA DO MOTORISTA", dx + sigBoxW / 2, y + 4, { align: "center" });
      // Signature image (if exists) inside box
      const sigInnerY = y + 8;
      const sigInnerH = 20;
      if (driverSig && driverSig.startsWith("data:image")) {
        try {
          const sigFmt = driverSig.includes("image/png") ? "PNG" : "JPEG";
          // Center signature image, max 60mm wide x 18mm tall
          const sigMaxW = sigBoxW - 8;
          const sigMaxH = sigInnerH - 2;
          doc.addImage(driverSig, sigFmt, dx + (sigBoxW - sigMaxW) / 2, sigInnerY, sigMaxW, sigMaxH, undefined, "MEDIUM");
        } catch {
          // ignore embed errors
        }
      }
      // Signature line
      doc.setDrawColor(...DARK);
      doc.setLineWidth(0.4);
      doc.line(dx + 4, y + sigBoxH - 14, dx + sigBoxW - 4, y + sigBoxH - 14);
      // Driver info
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      doc.text(settlement.driver?.name || "Motorista", dx + sigBoxW / 2, y + sigBoxH - 9.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MID);
      doc.text(`CPF: ${settlement.driver?.cpf || "—"}`, dx + sigBoxW / 2, y + sigBoxH - 5.5, { align: "center" });
      const sigDate = (settlement as any).signedAt
        ? `Assinado em ${fmtDtShort((settlement as any).signedAt?.toString())}`
        : "Data: ____ / ____ / ________";
      doc.text(sigDate, dx + sigBoxW / 2, y + sigBoxH - 1.5, { align: "center" });

      // Reviewer signature box (right)
      const rx = M + sigBoxW + 8;
      doc.setFillColor(...WHITE);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.rect(rx, y, sigBoxW, sigBoxH, "S");
      doc.setFillColor(...LIGHT);
      doc.rect(rx, y, sigBoxW, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...NAVY);
      doc.text("RESPONSÁVEL PELA ANÁLISE", rx + sigBoxW / 2, y + 4, { align: "center" });
      doc.setDrawColor(...DARK);
      doc.setLineWidth(0.4);
      doc.line(rx + 4, y + sigBoxH - 14, rx + sigBoxW - 4, y + sigBoxH - 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      doc.text(reviewedByUserName || "OTD Logistics", rx + sigBoxW / 2, y + sigBoxH - 9.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MID);
      doc.text("Departamento Financeiro", rx + sigBoxW / 2, y + sigBoxH - 5.5, { align: "center" });
      const revDate = settlement.approvedAt
        ? `Aprovado em ${fmtDtShort(settlement.approvedAt?.toString())}`
        : "Data: ____ / ____ / ________";
      doc.text(revDate, rx + sigBoxW / 2, y + sigBoxH - 1.5, { align: "center" });
      doc.setTextColor(...DARK);
      y += sigBoxH + 6;

      // Local/data line
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MID);
      doc.text(cityDateLine, M, y + 2);
      doc.setFontSize(6.5);
      doc.text("(Local e Data)", M, y + 6);
      doc.setTextColor(...DARK);

      // ── NOTA FISCAL DE SERVIÇOS (NFS) — apenas quando solicitado ─────
      if (includeNfs) {
        const nfsUrl: string | undefined = (settlement as any).nfsFileUrl;
        const nfsSentAt: string | undefined = (settlement as any).nfsSentAt;
        drawFooter();
        doc.addPage();
        pageNum++;
        y = drawPageTop();

        sectionHeader("Nota Fiscal de Serviços (NFS)");

        if (!nfsUrl) {
          ensurePage(16);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(...MID);
          doc.text("Nenhuma NFS foi anexada a esta prestação de contas.", M + CW / 2, y + 8, { align: "center" });
          y += 16;
        } else {
          const isNfsImage = /\.(jpe?g|png|webp|heic)(\?|$)/i.test(nfsUrl);
          const isPdf = /\.pdf(\?|$)/i.test(nfsUrl);
          const isXml = /\.xml(\?|$)/i.test(nfsUrl);
          const filename = nfsUrl.split("/").pop() || "nfs";

          // Meta info row
          ensurePage(20);
          doc.setFillColor(...LIGHT);
          doc.rect(M, y, CW, 14, "F");
          doc.setDrawColor(...BORDER);
          doc.setLineWidth(0.3);
          doc.rect(M, y, CW, 14, "S");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...NAVY);
          doc.text("Arquivo:", M + 3, y + 5.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          doc.text(filename, M + 22, y + 5.5);
          if (nfsSentAt) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...NAVY);
            doc.text("Enviada em:", M + 3, y + 10.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...MID);
            doc.text(fmtDt(nfsSentAt), M + 27, y + 10.5);
          }
          doc.setTextColor(...DARK);
          y += 18;

          if (isNfsImage) {
            // Embed image
            const fullUrl = nfsUrl.startsWith("http") ? nfsUrl : normalizeImageUrl(nfsUrl);
            const imgData = await fetchImageAsCompressedJpeg(fullUrl, 1800, 0.85);
            if (imgData) {
              const img = new Image();
              img.src = imgData;
              await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
              const iw = img.naturalWidth || 800;
              const ih = img.naturalHeight || 600;
              const maxW = CW;
              const maxH = PH - y - 20;
              const ratio = Math.min(maxW / iw, maxH / ih, 1);
              const fitW = iw * ratio;
              const fitH = ih * ratio;
              if (fitH > PH - y - 20) {
                drawFooter();
                doc.addPage();
                pageNum++;
                y = drawPageTop();
              }
              doc.addImage(imgData, "JPEG", M + (CW - fitW) / 2, y, fitW, fitH, undefined, "MEDIUM");
              y += fitH + 4;
            } else {
              doc.setFont("helvetica", "italic");
              doc.setFontSize(8);
              doc.setTextColor(...MID);
              doc.text("Não foi possível carregar a imagem da NFS.", M + CW / 2, y + 6, { align: "center" });
              y += 12;
            }
          } else {
            // Non-image file: show info box
            ensurePage(20);
            const fileType = isPdf ? "PDF" : isXml ? "XML" : "Arquivo";
            doc.setFillColor(240, 245, 255);
            doc.rect(M, y, CW, 22, "F");
            doc.setDrawColor(150, 170, 210);
            doc.setLineWidth(0.4);
            doc.rect(M, y, CW, 22, "S");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(...NAVY);
            doc.text(`Tipo: ${fileType}`, M + CW / 2, y + 8, { align: "center" });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(...MID);
            doc.text(`Arquivo: ${filename}`, M + CW / 2, y + 14, { align: "center" });
            doc.text("(Visualize o arquivo original no sistema)", M + CW / 2, y + 19, { align: "center" });
            doc.setTextColor(...DARK);
            y += 26;
          }
        }
      }

      drawFooter();

      const otd = settlement.transport?.requestNumber || settlement.id.substring(0, 8);
      if (mode === "blob") {
        return doc.output("blob");
      }
      doc.save(`prestacao-contas-${otd}.pdf`);
      toast({ title: "PDF gerado com sucesso!" });
      return null;
    } catch (err) {
      console.error("PDF error:", err);
      if (mode === "save") toast({ title: "Erro ao gerar PDF", variant: "destructive" });
      return null;
    } finally {
      if (mode === "save") setGeneratingPDF(null);
    }
  };

  const generateFullPrestacaoDeContasPDF = async (settlement: ExpenseSettlementWithRelations) => {
    setGeneratingFullPDF(settlement.id);
    try {
      const otd = settlement.transport?.requestNumber || settlement.id.substring(0, 8);
      const blob = await generateSettlementPDF(settlement, { mode: "blob", includeNfs: true });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prestacao-contas-completa-${otd}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        toast({ title: "Documento 'Prestação de Contas' gerado com sucesso!" });
      }
    } catch (err) {
      console.error("Full PDF error:", err);
      toast({ title: "Erro ao gerar documento completo", variant: "destructive" });
    } finally {
      setGeneratingFullPDF(null);
    }
  };

  // Helper: convert Blob → base64 string (no data URL prefix)
  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  const { data: settlements, isLoading } = useQuery<ExpenseSettlementWithRelations[]>({
    queryKey: ["/api/expense-settlements"],
  });

  // Auto-sync Autentique status for any settlement that is sent but not yet
  // signed/rejected. Runs once per list load and silently updates the cache.
  const autentiqueSyncedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!settlements) return;
    const pending = settlements.filter((s: any) =>
      s.autentiqueDocId &&
      s.autentiqueStatus !== "assinado" &&
      s.autentiqueStatus !== "recusado" &&
      !autentiqueSyncedRef.current.has(s.id)
    );
    if (pending.length === 0) return;
    pending.forEach((s) => autentiqueSyncedRef.current.add(s.id));
    let cancelled = false;
    (async () => {
      for (const s of pending) {
        if (cancelled) return;
        try {
          await apiRequest("POST", `/api/expense-settlements/${s.id}/sync-autentique`);
        } catch {
          // silent — keep showing last known status
        }
      }
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      }
    })();
    return () => { cancelled = true; };
  }, [settlements]);

  const { data: transports } = useQuery<Transport[]>({
    queryKey: ["/api/transports"],
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: allLancamentos } = useQuery<{ id: string; tipo: "debito" | "credito"; nome: string; detalhes?: string | null; valor: string }[]>({
    queryKey: ["/api/lancamentos"],
  });

  interface SettlementDamageItem {
    id: string;
    settlementId: string;
    damageTypeId: string;
    severity: string;
    vehicleChassi: string | null;
    includeInCost: boolean;
    createdAt: string;
    damageType: {
      id: string;
      name: string;
      category: string;
      brand: string | null;
      costLeve: string | null;
      costMedia: string | null;
      costGrave: string | null;
      costCritica: string | null;
      costPart: string | null;
    } | null;
  }

  interface AllDamageType {
    id: string;
    name: string;
    category: string;
    brand: string | null;
    description: string | null;
    costLeve: string | null;
    costMedia: string | null;
    costGrave: string | null;
    costCritica: string | null;
    costPart: string | null;
    isActive: string;
  }

  const SEVERITY_LABELS: Record<string, string> = {
    leve: "Leve", media: "Média", grave: "Grave", critica: "Crítica", part: "Troca de Peça",
  };

  function getCostForSeverity(dt: AllDamageType | SettlementDamageItem["damageType"], severity: string): number {
    if (!dt) return 0;
    const map: Record<string, string | null | undefined> = {
      leve: dt.costLeve, media: dt.costMedia, grave: dt.costGrave,
      critica: dt.costCritica, part: dt.costPart,
    };
    return parseFloat(map[severity] || "0") || 0;
  }

  function getAvailableSeverities(dt: AllDamageType): { key: string; label: string; cost: number }[] {
    return (["leve", "media", "grave", "critica", "part"] as const)
      .map(key => ({ key, label: SEVERITY_LABELS[key], cost: parseFloat((dt as any)[`cost${key.charAt(0).toUpperCase() + key.slice(1)}`] || "0") || 0 }))
      .filter(s => s.cost > 0);
  }

  const { data: settlementDamages, isLoading: isLoadingDamages } = useQuery<SettlementDamageItem[]>({
    queryKey: ["/api/expense-settlements", selectedSettlement?.id, "damages"],
    enabled: !!selectedSettlement?.id && showDetails,
    staleTime: 0,
    refetchOnMount: "always",
  });

  interface TransportDamageReportItem {
    id: string;
    description: string | null;
    photoUrl: string;
    latitude: string | null;
    longitude: string | null;
    createdAt: string | null;
    vehicleChassi: string | null;
    damageTypeName: string | null;
    damageTypeCategory: string | null;
  }
  const { data: transportDamageReports } = useQuery<TransportDamageReportItem[]>({
    queryKey: ["/api/damage-reports/transport", selectedSettlement?.transport?.id],
    enabled: !!selectedSettlement?.transport?.id && showDetails,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: allDamageTypes, isLoading: isLoadingAllDamageTypes } = useQuery<AllDamageType[]>({
    queryKey: ["/api/damage-types"],
    enabled: showAddDamageDialog,
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { transportId: string; driverId: string; driverNotes?: string; items: ExpenseItemDraft[] }) => {
      // Create settlement first
      const settlement = await apiRequest("POST", "/api/expense-settlements", {
        transportId: data.transportId,
        driverId: data.driverId,
        driverNotes: data.driverNotes,
        status: "enviado",
      });
      const settlementData = await settlement.json();
      
      // Create all items
      for (const item of data.items) {
        await apiRequest("POST", `/api/expense-settlements/${settlementData.id}/items`, {
          type: item.type,
          currency: item.currency || "BRL",
          amount: item.amount,
          photoUrl: item.photoUrl,
          description: item.description,
        });
      }
      
      return settlementData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ title: "Prestação de contas criada com sucesso!" });
      setShowNewDialog(false);
      setNewSettlement({ transportId: "", driverId: "", driverNotes: "", items: [] });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Erro ao criar prestação de contas", variant: "destructive" });
    },
  });

  // Helper: gera PDF e envia ao Autentique (usado tanto no approve quanto no
  // botão "Enviar" da lista quando a aprovação já ocorreu mas o envio falhou).
  const sendSettlementToAutentique = async (settlement: ExpenseSettlementWithRelations) => {
    const pdfBlob = await generateSettlementPDF(settlement, { mode: "blob" });
    if (!pdfBlob) throw new Error("Falha ao gerar o PDF para envio");
    const pdfBase64 = await blobToBase64(pdfBlob);
    const otd = settlement.transport?.requestNumber || settlement.id.substring(0, 8);
    return apiRequest("POST", `/api/expense-settlements/${settlement.id}/send-to-autentique`, {
      pdfBase64,
      filename: `prestacao-contas-${otd}.pdf`,
    });
  };

  const approveMutation = useMutation({
    mutationFn: async (settlement: ExpenseSettlementWithRelations) => {
      // 1) Aprovar (se falhar, a chamada lança e nada mais acontece)
      await apiRequest("POST", `/api/expense-settlements/${settlement.id}/approve`);
      // 2) Após aprovar, tentar enviar para Autentique. Se falhar, NÃO desfaz
      //    a aprovação — sinalizamos partialFailure para o onSuccess tratar.
      try {
        await sendSettlementToAutentique(settlement);
        return { sent: true as const };
      } catch (sendErr: any) {
        return { sent: false as const, sendError: sendErr?.message || "Falha ao enviar para assinatura" };
      }
    },
    onSuccess: (data) => {
      // Sempre refrescar a lista — a prestação está aprovada nos dois caminhos
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      setShowDetails(false);
      if (data.sent) {
        toast({ title: "Prestação aprovada e enviada para assinatura do motorista!" });
      } else {
        toast({
          title: "Prestação aprovada, mas o envio para assinatura falhou",
          description: `${data.sendError}. Use o botão "Enviar" na lista para tentar novamente.`,
          variant: "destructive",
        });
      }
    },
    onError: (err: any) => {
      // Apenas falha de aprovação cai aqui
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ title: err?.message || "Erro ao aprovar prestação", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      await apiRequest("POST", `/api/expense-settlements/${settlementId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      setShowDetails(false);
      toast({ title: "Prestação reprovada e devolvida para pendente." });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao reprovar prestação", variant: "destructive" });
    },
  });

  // Enviar / reenviar pela primeira vez a partir da lista (quando approve
  // ocorreu mas envio falhou ou ainda não foi tentado).
  const sendAutentiqueMutation = useMutation({
    mutationFn: async (settlement: ExpenseSettlementWithRelations) => {
      return sendSettlementToAutentique(settlement);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ title: "Documento enviado para assinatura do motorista!" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao enviar para assinatura", variant: "destructive" });
    },
  });

  // Reenviar e-mail de assinatura via Autentique (documento já existe)
  const resendAutentiqueMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      return apiRequest("POST", `/api/expense-settlements/${settlementId}/resend-autentique`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ title: "E-mail de assinatura reenviado com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao reenviar assinatura", variant: "destructive" });
    },
  });

  const addDamageMutation = useMutation({
    mutationFn: async ({ settlementId, items, includeInCost }: { settlementId: string; items: Array<{ damageTypeId: string; severity: string }>; includeInCost: boolean }) => {
      const results = await Promise.allSettled(
        items.map(item =>
          apiRequest("POST", `/api/expense-settlements/${settlementId}/damages`, {
            damageTypeId: item.damageTypeId,
            severity: item.severity,
            includeInCost,
          })
        )
      );
      const failed = results.filter(r => r.status === "rejected");
      if (failed.length === items.length) throw new Error("Erro ao vincular avarias");
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements", selectedSettlement?.id, "damages"] });
      toast({ title: `${vars.items.length === 1 ? "Avaria vinculada" : `${vars.items.length} avarias vinculadas`} com sucesso!` });
      setShowAddDamageDialog(false);
      setSelectedDamageItems(new Map());
      setExpandedDamageTypeId(null);
      setDamageIncludeInCost(false);
      setDamageSearchTerm("");
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao vincular avaria", variant: "destructive" });
    },
  });

  const removeDamageMutation = useMutation({
    mutationFn: async ({ settlementId, linkId }: { settlementId: string; linkId: string }) => {
      await apiRequest("DELETE", `/api/expense-settlements/${settlementId}/damages/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements", selectedSettlement?.id, "damages"] });
      toast({ title: "Avaria removida da prestação." });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao remover avaria", variant: "destructive" });
    },
  });

  const toggleDamageCostMutation = useMutation({
    mutationFn: async ({ settlementId, linkId, includeInCost }: { settlementId: string; linkId: string; includeInCost: boolean }) => {
      await apiRequest("PATCH", `/api/expense-settlements/${settlementId}/damages/${linkId}`, { includeInCost });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements", selectedSettlement?.id, "damages"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao atualizar avaria", variant: "destructive" });
    },
  });

  // Concluir prestação — só permitido quando assinada e com NFS recebida
  const concludeMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      return apiRequest("POST", `/api/expense-settlements/${settlementId}/conclude`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ title: "Prestação concluída com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao concluir prestação", variant: "destructive" });
    },
  });

  // Sincronizar status de assinatura com Autentique
  const syncAutentiqueMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      return apiRequest("POST", `/api/expense-settlements/${settlementId}/sync-autentique`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
    },
  });

  const nfsFileInputRef = useRef<HTMLInputElement>(null);

  const deleteNfsMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      return apiRequest("DELETE", `/api/expense-settlements/${settlementId}/nfs`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      if (selectedSettlement) {
        try {
          const response = await apiRequest("GET", `/api/expense-settlements/${selectedSettlement.id}`);
          const updated = await response.json();
          setSelectedSettlement(updated);
        } catch {}
      }
      toast({ title: "NFS excluída. Status revertido para Aprovado." });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao excluir NFS", variant: "destructive" });
    },
  });

  const uploadNfsMutation = useMutation({
    mutationFn: async ({ settlementId, file }: { settlementId: string; file: File }) => {
      const formData = new FormData();
      formData.append("nfsFile", file);
      const token = getAccessToken();
      const res = await fetch(`/api/expense-settlements/${settlementId}/nfs`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const errText = await res.text();
        let errMsg = "Erro ao enviar NFS";
        try { errMsg = JSON.parse(errText).message || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      if (selectedSettlement) {
        setSelectedSettlement({ ...selectedSettlement, ...data } as any);
      }
      toast({ title: "NFS enviada com sucesso!" });
      if (nfsFileInputRef.current) nfsFileInputRef.current.value = "";
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Erro ao enviar NFS", variant: "destructive" });
      if (nfsFileInputRef.current) nfsFileInputRef.current.value = "";
    },
  });

  const handleNfsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSettlement) return;
    const allowedTypes = [
      "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic",
      "application/pdf", "text/xml", "application/xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Envie uma imagem (JPG/PNG/WEBP), PDF ou XML.",
        variant: "destructive",
      });
      if (nfsFileInputRef.current) nfsFileInputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "Tamanho máximo permitido: 10MB.",
        variant: "destructive",
      });
      if (nfsFileInputRef.current) nfsFileInputRef.current.value = "";
      return;
    }
    uploadNfsMutation.mutate({ settlementId: selectedSettlement.id, file });
  };

  const returnMutation = useMutation({
    mutationFn: async ({ settlementId, reason }: { settlementId: string; reason: string }) => {
      return apiRequest("POST", `/api/expense-settlements/${settlementId}/return`, { returnReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ title: "Prestação de contas devolvida para o motorista" });
      setShowReturnDialog(false);
      setShowDetails(false);
      setReturnReason("");
    },
    onError: () => {
      toast({ title: "Erro ao devolver prestação de contas", variant: "destructive" });
    },
  });

  const updateAdvanceMutation = useMutation({
    mutationFn: async ({ settlementId, advanceAmount }: { settlementId: string; advanceAmount: string }) => {
      return apiRequest("PATCH", `/api/expense-settlements/${settlementId}`, { advanceAmount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar adiantamento", variant: "destructive" });
    },
  });

  const debouncedUpdateAdvance = useCallback((settlementId: string, value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      updateAdvanceMutation.mutate({ settlementId, advanceAmount: value });
    }, 500);
  }, [updateAdvanceMutation]);

  const addLancamentoMutation = useMutation({
    mutationFn: async ({ settlementId, lancamentoId }: { settlementId: string; lancamentoId: string }) => {
      return apiRequest("POST", `/api/expense-settlements/${settlementId}/lancamentos`, { lancamentoId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      if (selectedSettlement) {
        try {
          const response = await apiRequest("GET", `/api/expense-settlements/${selectedSettlement.id}`);
          const updated = await response.json();
          setSelectedSettlement(updated);
        } catch {}
      }
      setSelectedLancamentoId("");
      setShowAddLancamentoDialog(false);
      toast({ title: "Lançamento vinculado com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao vincular lançamento", variant: "destructive" });
    },
  });

  const removeLancamentoMutation = useMutation({
    mutationFn: async (settlementLancamentoId: string) => {
      return apiRequest("DELETE", `/api/settlement-lancamentos/${settlementLancamentoId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      if (selectedSettlement) {
        try {
          const response = await apiRequest("GET", `/api/expense-settlements/${selectedSettlement.id}`);
          const updated = await response.json();
          setSelectedSettlement(updated);
        } catch {}
      }
      toast({ title: "Lançamento removido" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao remover lançamento", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: { settlementId: string; type: string; currency: string; amount: string; photoUrl: string; description: string }) => {
      return apiRequest("POST", `/api/expense-settlements/${data.settlementId}/items`, {
        type: data.type,
        currency: data.currency,
        amount: data.amount,
        photoUrl: data.photoUrl,
        description: data.description,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      if (selectedSettlement) {
        try {
          const response = await apiRequest("GET", `/api/expense-settlements/${selectedSettlement.id}`);
          const updatedSettlement = await response.json();
          setSelectedSettlement(updatedSettlement);
        } catch {}
      }
      toast({ title: "Despesa adicionada com sucesso!" });
      setShowAddItemDialog(false);
      setNewItem({ type: "", currency: "BRL", amount: "", photoUrl: "", description: "" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar despesa", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("DELETE", `/api/expense-settlement-items/${itemId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      if (selectedSettlement) {
        try {
          const response = await apiRequest("GET", `/api/expense-settlements/${selectedSettlement.id}`);
          const updatedSettlement = await response.json();
          setSelectedSettlement(updatedSettlement);
        } catch {}
      }
      toast({ title: "Despesa removida com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover despesa", variant: "destructive" });
    },
  });

  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ itemId, itemStatus, approvedAmount }: { itemId: string; itemStatus: string; approvedAmount?: string }) => {
      return apiRequest("PATCH", `/api/expense-settlement-items/${itemId}`, { itemStatus, approvedAmount: approvedAmount ?? null });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      if (selectedSettlement) {
        try {
          const response = await apiRequest("GET", `/api/expense-settlements/${selectedSettlement.id}`);
          const updatedSettlement = await response.json();
          setSelectedSettlement(updatedSettlement);
        } catch {}
      }
      if (variables.itemStatus === "aprovado") {
        toast({ title: "Comprovante aprovado!" });
      } else {
        toast({ title: "Comprovante reprovado." });
      }
      setApprovingItemId(null);
      setApprovingAmount("");
    },
    onError: () => {
      toast({ title: "Erro ao atualizar comprovante", variant: "destructive" });
    },
  });

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      // Try Object Storage first
      const response = await apiRequest("POST", "/api/uploads/request-url", {
        contentType: file.type,
        name: file.name,
        isPublic: false,
      });

      const { uploadURL, objectPath } = await response.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      return objectPath;
    } catch {
      // Fallback to local upload
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const localResponse = await apiRequest("POST", "/api/uploads/local", {
          filename: file.name,
          contentType: file.type,
          data: base64,
        });

        const { objectPath } = await localResponse.json();
        return objectPath;
      } catch (err: any) {
        console.error("Upload error:", err);
        toast({ title: err.message || "Erro ao fazer upload da foto", variant: "destructive" });
        return null;
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const objectPath = await uploadPhoto(file);
    if (objectPath) {
      setNewItem(prev => ({ ...prev, photoUrl: objectPath }));
    }
    setIsUploadingPhoto(false);
  };

  const handleNewSettlementItemPhoto = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingItemIndex(index);
    const objectPath = await uploadPhoto(file);
    if (objectPath) {
      setNewSettlement(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === index ? { ...item, photoUrl: objectPath } : item
        ),
      }));
    }
    setUploadingItemIndex(null);
  };

  const addNewSettlementItem = () => {
    setNewSettlement(prev => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), type: "", currency: "BRL", amount: "", photoUrl: "", description: "" }],
    }));
  };

  const removeNewSettlementItem = (index: number) => {
    setNewSettlement(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateNewSettlementItem = (index: number, field: string, value: string) => {
    setNewSettlement(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddItem = () => {
    if (!selectedSettlement) return;
    if (!newItem.type || !newItem.photoUrl) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    addItemMutation.mutate({
      settlementId: selectedSettlement.id,
      type: newItem.type,
      currency: newItem.currency,
      amount: newItem.amount || "0",
      photoUrl: newItem.photoUrl,
      description: newItem.description,
    });
  };

  const allSettlements = settlements || [];

  const filteredSettlements = allSettlements.filter(s => {
    if (statusFilter !== "todos" && s.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      s.transport?.requestNumber?.toLowerCase().includes(searchLower) ||
      s.driver?.name?.toLowerCase().includes(searchLower) ||
      s.transport?.vehicleChassi?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (value: string | null, currency: string = "BRL") => {
    if (!value) return currencyConfig[currency]?.symbol + " 0,00" || "R$ 0,00";
    const num = parseFloat(value);
    const locales: Record<string, string> = {
      BRL: "pt-BR",
      ARS: "es-AR",
      CLP: "es-CL",
      PEN: "es-PE",
      UYU: "es-UY",
    };
    return num.toLocaleString(locales[currency] || "pt-BR", { style: "currency", currency: currency });
  };

  const openDetails = (settlement: ExpenseSettlementWithRelations) => {
    setSelectedSettlement(settlement);
    setLocalAdvanceAmount("");
    setShowDetails(true);
  };

  const openReturnDialog = () => {
    setShowReturnDialog(true);
  };

  const handleReturn = () => {
    if (!selectedSettlement || !returnReason.trim()) {
      toast({ title: "Por favor, informe o motivo da devolução", variant: "destructive" });
      return;
    }
    returnMutation.mutate({ settlementId: selectedSettlement.id, reason: returnReason });
  };

  const handleApprove = () => {
    if (!selectedSettlement) return;
    approveMutation.mutate(selectedSettlement);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Financeiro - Prestação de Contas" />
        <div className="grid gap-4 mt-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader title="Financeiro - Prestação de Contas" />

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por OTD, motorista ou chassi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-settlements"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
              <SelectTrigger className="w-48" data-testid="trigger-status-filter">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">
                  <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Pendente
                  </span>
                </SelectItem>
                <SelectItem value="enviado">
                  <span className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-blue-500" />
                    Aguardando Análise
                  </span>
                </SelectItem>
                <SelectItem value="devolvido">
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-3.5 w-3.5 text-red-500" />
                    Devolvido
                  </span>
                </SelectItem>
                <SelectItem value="aprovado">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Aprovado
                  </span>
                </SelectItem>
                <SelectItem value="enviado_nfs">
                  <span className="flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                    Enviado NFS
                  </span>
                </SelectItem>
                <SelectItem value="assinado">
                  <span className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-orange-500" />
                    Assinado
                  </span>
                </SelectItem>
                <SelectItem value="concluido">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    Concluído
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
                queryClient.invalidateQueries({ queryKey: ["/api/transports"] });
                queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
              }}
              title="Atualizar lista"
              data-testid="button-refresh-settlements"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowNewDialog(true)} data-testid="button-new-settlement">
              <Plus className="h-4 w-4 mr-2" />
              Nova Prestação
            </Button>
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: "status",
              label: "Status",
              render: (settlement) => {
                const status = statusConfig[settlement.status || "pendente"];
                const StatusIcon = status.icon;
                return (
                  <Badge variant={status.variant} className="gap-1 whitespace-nowrap">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                );
              },
            },
            {
              key: "requestNumber",
              label: "OTD",
              render: (settlement) => (
                <span className="font-mono font-bold text-primary">
                  {settlement.transport?.requestNumber || "—"}
                </span>
              ),
            },
            {
              key: "driver",
              label: "Motorista",
              render: (settlement) => (
                <span className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {settlement.driver?.name || "—"}
                </span>
              ),
            },
            {
              key: "vehicleChassi",
              label: "Chassi",
              render: (settlement) => (
                <span className="font-mono text-sm">
                  {settlement.transport?.vehicleChassi || "—"}
                </span>
              ),
            },
            {
              key: "destination",
              label: "Destino",
              render: (settlement) => (
                <span className="flex items-center gap-1.5 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {settlement.transport?.deliveryLocation?.city
                    ? `${settlement.transport.deliveryLocation.city}/${settlement.transport.deliveryLocation.state}`
                    : "—"}
                </span>
              ),
            },
            {
              key: "totalExpenses",
              label: "Total",
              render: (settlement) => (
                <span className="font-semibold text-green-600 text-sm">
                  {formatCurrency(settlement.totalExpenses)}
                </span>
              ),
            },
            {
              key: "items",
              label: "Comprovantes",
              render: (settlement) => (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Camera className="h-3.5 w-3.5 shrink-0" />
                  {settlement.items?.length || 0}
                </span>
              ),
            },
            {
              key: "submittedAt",
              label: "Enviado em",
              render: (settlement) => (
                <span className="text-xs text-muted-foreground">
                  {settlement.submittedAt
                    ? format(new Date(settlement.submittedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "—"}
                </span>
              ),
            },
            {
              key: "autentique",
              label: "Assinatura",
              render: (settlement) => {
                const aStatus = (settlement as any).autentiqueStatus as string | undefined;
                const aSignedAt = (settlement as any).autentiqueSignedAt || (settlement as any).signedAt;
                const aDocId = (settlement as any).autentiqueDocId as string | undefined;
                const sStatus = settlement.status as string | undefined;

                if (aStatus === "assinado") {
                  return (
                    <div className="flex flex-col leading-tight gap-0.5" data-testid={`status-signed-${settlement.id}`}>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Assinado
                      </span>
                      {aSignedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(aSignedAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  );
                }
                if (aStatus === "recusado") {
                  return (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500" data-testid={`status-rejected-${settlement.id}`}>
                      <XCircle className="h-3 w-3" />
                      Recusado
                    </span>
                  );
                }
                if (aDocId) {
                  return (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600" data-testid={`status-not-signed-${settlement.id}`}>
                      <Clock className="h-3 w-3" />
                      Aguardando
                    </span>
                  );
                }
                if (sStatus === "aprovado" || sStatus === "enviado_nfs" || sStatus === "assinado") {
                  return (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" data-testid={`status-not-sent-${settlement.id}`}>
                      <Send className="h-3 w-3" />
                      Não enviado
                    </span>
                  );
                }
                return <span className="text-xs text-muted-foreground">—</span>;
              },
            },
            {
              key: "nfs",
              label: "NFS",
              render: (settlement) => {
                const nfsUrl: string | undefined = (settlement as any).nfsFileUrl;
                const nfsSentAt: string | undefined = (settlement as any).nfsSentAt;
                if (!nfsUrl) {
                  return <span className="text-xs text-muted-foreground">—</span>;
                }
                return (
                  <div className="flex flex-col leading-tight gap-0.5">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                      <FileText className="h-3 w-3" />
                      Anexada
                    </span>
                    {nfsSentAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(nfsSentAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: "actions",
              label: "",
              className: "text-right",
              render: (settlement) => {
                const aStatus = (settlement as any).autentiqueStatus as string | undefined;
                const aDocId = (settlement as any).autentiqueDocId as string | undefined;
                const signedUrl = (settlement as any).autentiqueSignedUrl as string | undefined;
                const nfsUrl: string | undefined = (settlement as any).nfsFileUrl;
                const requestNumber = settlement.transport?.requestNumber || settlement.id.slice(0, 8);
                const canConclude = (settlement.status === "assinado" || (settlement.status === "enviado_nfs" && aStatus === "assinado")) && !!nfsUrl;
                const canSend = (settlement.status === "aprovado" || settlement.status === "enviado_nfs" || settlement.status === "assinado") && !aDocId;
                const canResend = !!aDocId && aStatus !== "assinado";
                const canAutentiquePDF = settlement.status === "aprovado";
                const canFullPDF = ["aprovado", "assinado", "enviado_nfs", "concluido"].includes(settlement.status);
                return (
                  <div className="flex items-center justify-end gap-1">
                    {canConclude && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-green-700 border-green-300 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                              disabled={concludeMutation.isPending}
                              onClick={(e) => { e.stopPropagation(); concludeMutation.mutate(settlement.id); }}
                              data-testid={`button-conclude-settlement-${settlement.id}`}
                            >
                              {concludeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Concluir Prestação</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-menu-settlement-${settlement.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                          {requestNumber}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {canSend && (
                          <DropdownMenuItem
                            disabled={sendAutentiqueMutation.isPending}
                            onClick={() => sendAutentiqueMutation.mutate(settlement)}
                            data-testid={`button-send-autentique-${settlement.id}`}
                          >
                            <Send className="h-3.5 w-3.5 mr-2 text-amber-500" />
                            Enviar para Autentique
                          </DropdownMenuItem>
                        )}
                        {canResend && (
                          <DropdownMenuItem
                            disabled={resendAutentiqueMutation.isPending}
                            onClick={() => resendAutentiqueMutation.mutate(settlement.id)}
                            data-testid={`button-resend-autentique-${settlement.id}`}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-2 text-amber-500" />
                            Reenviar para Autentique
                          </DropdownMenuItem>
                        )}
                        {signedUrl && (
                          <DropdownMenuItem asChild>
                            <a
                              href={signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center"
                              data-testid={`link-signed-pdf-${settlement.id}`}
                            >
                              <Link2 className="h-3.5 w-3.5 mr-2 text-green-600" />
                              Abrir PDF Assinado
                            </a>
                          </DropdownMenuItem>
                        )}
                        {(canSend || canResend || signedUrl) && <DropdownMenuSeparator />}
                        {canAutentiquePDF && (
                          <DropdownMenuItem
                            disabled={generatingPDF === settlement.id}
                            onClick={() => generateSettlementPDF(settlement)}
                            data-testid={`button-pdf-settlement-${settlement.id}`}
                          >
                            {generatingPDF === settlement.id ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-2 text-orange-500" />}
                            PDF para Autentique
                          </DropdownMenuItem>
                        )}
                        {canFullPDF && (
                          <DropdownMenuItem
                            disabled={generatingFullPDF === settlement.id}
                            onClick={() => generateFullPrestacaoDeContasPDF(settlement)}
                            data-testid={`button-full-pdf-settlement-${settlement.id}`}
                          >
                            {generatingFullPDF === settlement.id ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-2 text-blue-500" />}
                            Prestação de Contas (PDF)
                          </DropdownMenuItem>
                        )}
                        {nfsUrl && (
                          <DropdownMenuItem
                            disabled={generatingNfsPDF === settlement.id}
                            onClick={() => downloadNfsPDF(settlement.id, nfsUrl, requestNumber)}
                            data-testid={`button-download-nfs-${settlement.id}`}
                          >
                            {generatingNfsPDF === settlement.id ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-2 text-purple-500" />}
                            Baixar NFS
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDetails(settlement)} data-testid={`button-view-settlement-${settlement.id}`}>
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); openDetails(settlement); }}
                      data-testid={`button-view-icon-settlement-${settlement.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                );
              },
            },
          ]}
          data={filteredSettlements}
          isLoading={isLoading}
          keyField="id"
          onRowClick={openDetails}
          emptyMessage="Nenhuma prestação de contas encontrada"
        />
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Prestação de Contas - {selectedSettlement?.transport?.requestNumber}
            </DialogTitle>
            <DialogDescription>
              Analise os comprovantes enviados pelo motorista
            </DialogDescription>
          </DialogHeader>
          
          {selectedSettlement && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Informações do Transporte
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Número OTD:</span>
                      <span className="font-mono font-bold">{selectedSettlement.transport?.requestNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chassi:</span>
                      <span className="font-mono">{selectedSettlement.transport?.vehicleChassi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Origem:</span>
                      <span>{selectedSettlement.transport?.originYard?.name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destino:</span>
                      <span>
                        {selectedSettlement.transport?.deliveryLocation?.name} - 
                        {selectedSettlement.transport?.deliveryLocation?.city}/
                        {selectedSettlement.transport?.deliveryLocation?.state}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span>{selectedSettlement.transport?.client?.name || "-"}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Motorista
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium">{selectedSettlement.driver?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF:</span>
                      <span>{selectedSettlement.driver?.cpf}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span>{selectedSettlement.driver?.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modalidade:</span>
                      <Badge variant="outline">
                        {selectedSettlement.driver?.modality?.toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Resumo Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                        Despesas Previstas
                        {selectedSettlement.associatedRoute && (
                          <span className="ml-1 font-normal text-blue-500 dark:text-blue-400 truncate">
                            — {selectedSettlement.associatedRoute.name}
                          </span>
                        )}
                      </p>
                      {selectedSettlement.associatedRoute ? (
                        selectedSettlement.associatedRoute.totalCost ? (
                          // Route uses a single total cost
                          <div className="flex justify-between text-xs font-bold border-t border-blue-200 dark:border-blue-700 mt-1 pt-1">
                            <span>Total:</span>
                            <span className="text-blue-700 dark:text-blue-300">
                              {formatCurrency(selectedSettlement.associatedRoute.totalCost)}
                            </span>
                          </div>
                        ) : (
                          // Route uses detailed costs
                          <>
                            {selectedSettlement.associatedRoute.fuelCost && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Combustível:</span>
                                <span className="font-medium">{formatCurrency(selectedSettlement.associatedRoute.fuelCost)}</span>
                              </div>
                            )}
                            {selectedSettlement.associatedRoute.tollCost && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Pedágios:</span>
                                <span className="font-medium">{formatCurrency(selectedSettlement.associatedRoute.tollCost)}</span>
                              </div>
                            )}
                            {selectedSettlement.associatedRoute.driverDailyCost && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Hotel / Diária:</span>
                                <span className="font-medium">{formatCurrency(selectedSettlement.associatedRoute.driverDailyCost)}</span>
                              </div>
                            )}
                            {selectedSettlement.associatedRoute.foodCost && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Alimentação:</span>
                                <span className="font-medium">{formatCurrency(selectedSettlement.associatedRoute.foodCost)}</span>
                              </div>
                            )}
                            {selectedSettlement.associatedRoute.othersCost && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Outros:</span>
                                <span className="font-medium">{formatCurrency(selectedSettlement.associatedRoute.othersCost)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs font-bold border-t border-blue-200 dark:border-blue-700 mt-1 pt-1">
                              <span>Total:</span>
                              <span className="text-blue-700 dark:text-blue-300">
                                {formatCurrency((
                                  parseFloat(selectedSettlement.associatedRoute.fuelCost || "0") +
                                  parseFloat(selectedSettlement.associatedRoute.tollCost || "0") +
                                  parseFloat(selectedSettlement.associatedRoute.driverDailyCost || "0") +
                                  parseFloat(selectedSettlement.associatedRoute.foodCost || "0") +
                                  parseFloat(selectedSettlement.associatedRoute.othersCost || "0")
                                ).toString())}
                              </span>
                            </div>
                          </>
                        )
                      ) : (
                        // Fallback: use transport estimated values
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Pedágios:</span>
                            <span className="font-medium">{formatCurrency(selectedSettlement.estimatedTolls)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Combustível:</span>
                            <span className="font-medium">{formatCurrency(selectedSettlement.estimatedFuel)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold border-t border-blue-200 dark:border-blue-700 mt-1 pt-1">
                            <span>Total:</span>
                            <span className="text-blue-700 dark:text-blue-300">
                              {formatCurrency((parseFloat(selectedSettlement.estimatedTolls || "0") + parseFloat(selectedSettlement.estimatedFuel || "0")).toString())}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                      <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Despesas Realizadas</p>
                      {(() => {
                        const typeLabel: Record<string, string> = {
                          pedagio: "Pedágio", combustivel: "Combustível", hospedagem: "Hotel",
                          alimentacao: "Alimentação", passagem: "Passagem",
                        };
                        const allItems = (selectedSettlement.items || []) as any[];
                        // Group by country
                        const byCountry: Record<string, any[]> = {};
                        for (const i of allItems) {
                          const cc = i.country || currencyToCountry[i.currency || "BRL"] || "BR";
                          if (!byCountry[cc]) byCountry[cc] = [];
                          byCountry[cc].push(i);
                        }
                        // BR first, then alphabetical
                        const countryOrder = Object.keys(byCountry).sort((a, b) =>
                          a === "BR" ? -1 : b === "BR" ? 1 : a.localeCompare(b)
                        );
                        // Grand total in BRL (approved → approvedAmount; pending → amount as BRL proxy)
                        const grandTotal = allItems.reduce((s, i) => {
                          if (i.itemStatus === "reprovado") return s;
                          return s + parseFloat(i.itemStatus === "aprovado" ? (i.approvedAmount || "0") : (i.amount || "0"));
                        }, 0);

                        if (countryOrder.length === 0) {
                          return <p className="text-xs text-muted-foreground italic">Nenhuma despesa registrada</p>;
                        }
                        return (
                          <>
                            {countryOrder.map(cc => {
                              const info = countryConfig[cc] || { label: cc, flag: "🌍" };
                              const items = byCountry[cc];
                              const currency = items[0]?.currency || (cc === "BR" ? "BRL" : cc);
                              // subtotal in local currency (approved → approvedAmount; pending → amount; exclude reprovado)
                              const subtotal = items.reduce((s, i) => {
                                if (i.itemStatus === "reprovado") return s;
                                return s + parseFloat(i.itemStatus === "aprovado" ? (i.approvedAmount || "0") : (i.amount || "0"));
                              }, 0);
                              // group by type using approved amounts
                              const byType: Record<string, number> = {};
                              for (const i of items) {
                                if (i.itemStatus === "reprovado") continue;
                                const t = i.type || "outros";
                                byType[t] = (byType[t] || 0) + parseFloat(i.itemStatus === "aprovado" ? (i.approvedAmount || "0") : (i.amount || "0"));
                              }
                              return (
                                <div key={cc} className="mb-2 last:mb-0">
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className="text-sm leading-none">{info.flag}</span>
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{info.label}</span>
                                  </div>
                                  <div className="pl-3 space-y-0.5">
                                    {Object.entries(byType).map(([type, amt]) => (
                                      <div key={type} className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">{typeLabel[type] || type}:</span>
                                        <span className="font-medium">{formatCurrency(amt.toString(), currency)}</span>
                                      </div>
                                    ))}
                                    {Object.keys(byType).length > 1 && (
                                      <div className="flex justify-between text-xs font-semibold border-t border-green-200/60 dark:border-green-700/40 pt-0.5 mt-0.5">
                                        <span className="text-muted-foreground">Subtotal:</span>
                                        <span>{formatCurrency(subtotal.toString(), currency)}</span>
                                      </div>
                                    )}
                                    {Object.keys(byType).length === 0 && (
                                      <p className="text-xs text-muted-foreground italic">Tudo reprovado</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            <div className="flex justify-between text-xs font-bold border-t border-green-300 dark:border-green-700 mt-2 pt-1">
                              <span>Total (BRL):</span>
                              <span className="text-green-700 dark:text-green-300">{formatCurrency(grandTotal.toString(), "BRL")}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Custo com Motorista */}
                  {selectedSettlement.driverCost != null && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Custo com Motorista
                        {selectedSettlement.travelRateInfo && (
                          <span className="font-normal text-amber-600 dark:text-amber-400 ml-1">
                            — {selectedSettlement.travelRateInfo.name}
                          </span>
                        )}
                      </p>
                      {selectedSettlement.travelRateInfo && (
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {selectedSettlement.travelRateInfo.rateType === "por_km"
                              ? `${selectedSettlement.transport?.routeDistanceKm ?? "?"} km × R$ ${parseFloat(selectedSettlement.travelRateInfo.rateValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/km`
                              : selectedSettlement.travelRateInfo.rateType === "por_veiculo"
                              ? "Valor fixo por veículo"
                              : "Valor fixo"}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center border-t border-amber-200 dark:border-amber-700 mt-1 pt-1">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Total:</span>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-300" data-testid="text-driver-cost">
                          {formatCurrency(selectedSettlement.driverCost)}
                        </span>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const approvedItems = selectedSettlement.items?.filter(i => (i as any).itemStatus === "aprovado") || [];
                    const totalComprovado = approvedItems.reduce((sum, i) => sum + parseFloat((i as any).approvedAmount || "0"), 0);
                    const totalItens = selectedSettlement.items?.length || 0;
                    const totalAprovados = approvedItems.length;
                    const totalReprovados = selectedSettlement.items?.filter(i => (i as any).itemStatus === "reprovado").length || 0;
                    const totalPendentes = totalItens - totalAprovados - totalReprovados;
                    
                    return totalItens > 0 ? (
                      <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-700">
                        <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">Total Comprovado (itens aprovados)</p>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {totalAprovados}/{totalItens} aprovados
                            {totalReprovados > 0 && <span className="text-destructive ml-1">· {totalReprovados} reprovados</span>}
                            {totalPendentes > 0 && <span className="text-orange-500 ml-1">· {totalPendentes} pendentes</span>}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                            {formatCurrency(totalComprovado.toString())}
                          </span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>Distância: <strong>{selectedSettlement.routeDistance || "-"}</strong></span>
                    {selectedSettlement.driverNotes && (
                      <span className="truncate max-w-[200px]" title={selectedSettlement.driverNotes}>
                        Obs: {selectedSettlement.driverNotes}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Comparativo: Previsto x Real
                    {selectedSettlement.associatedRoute && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        — Rota: {selectedSettlement.associatedRoute.name}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const route = selectedSettlement.associatedRoute;
                    const items = selectedSettlement.items || [];

                    // ---- PREVISTO: from associated route ----
                    const plannedFuel     = parseFloat(route?.fuelCost || "0");
                    const plannedTolls    = parseFloat(route?.tollCost || "0");
                    const plannedHotel    = parseFloat(route?.driverDailyCost || "0");
                    const plannedFood     = parseFloat(route?.foodCost || "0");
                    const plannedOthers   = parseFloat(route?.othersCost || "0");
                    // If route uses a single totalCost, use it as the only planned figure
                    const routeTotalCost  = route?.totalCost ? parseFloat(route.totalCost) : null;
                    const plannedTotal = routeTotalCost !== null
                      ? routeTotalCost
                      : plannedFuel + plannedTolls + plannedHotel + plannedFood + plannedOthers;

                    // Fall back to transport estimates when no route is linked
                    const fallbackTolls = parseFloat(selectedSettlement.estimatedTolls || "0");
                    const fallbackFuel  = parseFloat(selectedSettlement.estimatedFuel  || "0");
                    const fallbackTotal = fallbackTolls + fallbackFuel;

                    // ---- REAL: from driver-submitted items ----
                    // Use approvedAmount when item is approved; use amount for pending; exclude reprovado
                    const getEffectiveAmt = (i: any) =>
                      i.itemStatus === "aprovado"
                        ? parseFloat(i.approvedAmount || "0")
                        : i.itemStatus === "reprovado"
                        ? 0
                        : parseFloat(i.amount || "0");

                    const realFuel    = items.filter(i => i.type === "combustivel").reduce((s, i) => s + getEffectiveAmt(i), 0);
                    const realTolls   = items.filter(i => i.type === "pedagio").reduce((s, i) => s + getEffectiveAmt(i), 0);
                    const realHotel   = items.filter(i => i.type === "hospedagem").reduce((s, i) => s + getEffectiveAmt(i), 0);
                    const realFood    = items.filter(i => i.type === "alimentacao").reduce((s, i) => s + getEffectiveAmt(i), 0);
                    const realOthers  = items.filter(i => i.type === "outros").reduce((s, i) => s + getEffectiveAmt(i), 0);
                    const realTotal   = realFuel + realTolls + realHotel + realFood + realOthers;

                    const diffTotal = realTotal - (route ? plannedTotal : fallbackTotal);
                    const baseTotal = route ? plannedTotal : fallbackTotal;
                    const pctTotal  = baseTotal > 0 ? ((diffTotal / baseTotal) * 100) : (realTotal > 0 ? 100 : 0);

                    const isDiscrepant = (pct: number) => Math.abs(pct) > 20;
                    const getColor = (diff: number, pct: number) => {
                      if (Math.abs(pct) <= 10) return "text-green-600";
                      if (diff > 0) return Math.abs(pct) > 20 ? "text-red-600" : "text-orange-500";
                      return "text-green-600";
                    };
                    const getBgColor = (diff: number, pct: number) => {
                      if (Math.abs(pct) <= 10) return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
                      if (diff > 0) return Math.abs(pct) > 20 ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
                      return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
                    };

                    type CompRow = { label: string; icon: any; planned: number; real: number };

                    // When route uses a single totalCost, show only one total row
                    const rows: CompRow[] = route
                      ? routeTotalCost !== null
                        ? [{ label: "Total Previsto (Rota)", icon: DollarSign, planned: routeTotalCost, real: realTotal }]
                        : [
                            { label: "Combustível",   icon: Fuel,    planned: plannedFuel,   real: realFuel   },
                            { label: "Pedágios",      icon: Receipt, planned: plannedTolls,  real: realTolls  },
                            { label: "Hotel / Diária",icon: Hotel,   planned: plannedHotel,  real: realHotel  },
                            { label: "Alimentação",   icon: Utensils,planned: plannedFood,   real: realFood   },
                            { label: "Outros",        icon: Receipt, planned: plannedOthers, real: realOthers },
                          ].filter(r => r.planned > 0 || r.real > 0)
                      : [
                          { label: "Pedágios",    icon: Receipt, planned: fallbackTolls, real: realTolls },
                          { label: "Combustível", icon: Fuel,    planned: fallbackFuel,  real: realFuel  },
                          ...(realHotel + realFood + realOthers > 0
                            ? [{ label: "Outras Despesas", icon: Receipt, planned: 0, real: realHotel + realFood + realOthers }]
                            : []),
                        ];

                    return (
                      <div className="space-y-4">
                        {!route && (
                          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                            Nenhuma rota cadastrada associada a este transporte. Exibindo estimativas do transporte.
                          </div>
                        )}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 font-medium">Categoria</th>
                                <th className="text-right py-2 font-medium">Previsto</th>
                                <th className="text-right py-2 font-medium">Real</th>
                                <th className="text-right py-2 font-medium">Diferença</th>
                                <th className="text-right py-2 font-medium">%</th>
                                <th className="text-center py-2 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row) => {
                                const diff = row.real - row.planned;
                                const pct  = row.planned > 0 ? ((diff / row.planned) * 100) : (row.real > 0 ? 100 : 0);
                                const IconComp = row.icon;
                                return (
                                  <tr key={row.label} className="border-b">
                                    <td className="py-3">
                                      <div className="flex items-center gap-2">
                                        <IconComp className="h-4 w-4 text-muted-foreground" />
                                        {row.label}
                                      </div>
                                    </td>
                                    <td className="text-right py-3">
                                      {row.planned > 0 ? formatCurrency(row.planned.toString()) : <span className="text-muted-foreground">-</span>}
                                    </td>
                                    <td className="text-right py-3 font-medium">{formatCurrency(row.real.toString())}</td>
                                    <td className={`text-right py-3 font-medium ${row.planned > 0 ? getColor(diff, pct) : "text-orange-500"}`}>
                                      {diff >= 0 ? "+" : ""}{formatCurrency(diff.toString())}
                                    </td>
                                    <td className={`text-right py-3 font-medium ${row.planned > 0 ? getColor(diff, pct) : "text-orange-500"}`}>
                                      {row.planned > 0 ? `${diff >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "-"}
                                    </td>
                                    <td className="text-center py-3">
                                      {row.planned === 0 ? (
                                        <Badge variant="secondary" className="gap-1">Extra</Badge>
                                      ) : isDiscrepant(pct) ? (
                                        <Badge variant="destructive" className="gap-1">
                                          <AlertTriangle className="h-3 w-3" />Discrepante
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                                          <CheckCircle className="h-3 w-3" />OK
                                        </Badge>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className={`border-t-2 ${getBgColor(diffTotal, pctTotal)}`}>
                                <td className="py-3 font-bold">TOTAL</td>
                                <td className="text-right py-3 font-bold">{formatCurrency(baseTotal.toString())}</td>
                                <td className="text-right py-3 font-bold">{formatCurrency(realTotal.toString())}</td>
                                <td className={`text-right py-3 font-bold ${getColor(diffTotal, pctTotal)}`}>
                                  {diffTotal >= 0 ? "+" : ""}{formatCurrency(diffTotal.toString())}
                                </td>
                                <td className={`text-right py-3 font-bold ${getColor(diffTotal, pctTotal)}`}>
                                  {baseTotal > 0 ? `${diffTotal >= 0 ? "+" : ""}${pctTotal.toFixed(1)}%` : "-"}
                                </td>
                                <td className="text-center py-3">
                                  {isDiscrepant(pctTotal) ? (
                                    <Badge variant="destructive" className="gap-1">
                                      <AlertTriangle className="h-3 w-3" />Atenção
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                                      <CheckCircle className="h-3 w-3" />Dentro do Esperado
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        
                        {isDiscrepant(pctTotal) && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-red-800 dark:text-red-200">Valores Discrepantes Detectados</p>
                                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                                  O total das despesas reais está {pctTotal > 0 ? "acima" : "abaixo"} do previsto em {Math.abs(pctTotal).toFixed(1)}%.
                                  Considere revisar os comprovantes antes de aprovar.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {!isDiscrepant(pctTotal) && Math.abs(pctTotal) <= 10 && baseTotal > 0 && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-green-800 dark:text-green-200">Valores Dentro do Esperado</p>
                                <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                                  As despesas reais estão dentro da margem de 10% do previsto pela rota.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* ── Card de Lançamentos ─────────────────────────────────────── */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Lançamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(selectedSettlement.settlementLancamentos || []).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Nenhum lançamento vinculado</p>
                    )}
                    {(selectedSettlement.settlementLancamentos || []).map((sl) => (
                      <div key={sl.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {sl.lancamento.tipo === "credito" ? (
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{sl.lancamento.nome}</p>
                            {sl.lancamento.detalhes && (
                              <p className="text-xs text-muted-foreground truncate">{sl.lancamento.detalhes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`font-semibold ${sl.lancamento.tipo === "credito" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {sl.lancamento.tipo === "credito" ? "+" : "−"} R$ {parseFloat(sl.lancamento.valor).toFixed(2).replace(".", ",")}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            sl.lancamento.tipo === "credito"
                              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                              : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                          }`}>
                            {sl.lancamento.tipo === "credito" ? "Crédito" : "Débito"}
                          </span>
                          {selectedSettlement.status !== "aprovado" && selectedSettlement.status !== "concluido" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLancamentoMutation.mutate(sl.id)}
                              disabled={removeLancamentoMutation.isPending}
                              data-testid={`button-remove-lancamento-${sl.id}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {selectedSettlement.status !== "aprovado" && selectedSettlement.status !== "concluido" && (
                      <div className="flex gap-2 pt-1">
                        {showAddLancamentoDialog ? (
                          <>
                            <Select value={selectedLancamentoId} onValueChange={setSelectedLancamentoId}>
                              <SelectTrigger className="flex-1 h-8 text-xs" data-testid="select-lancamento-to-add">
                                <SelectValue placeholder="Selecionar lançamento..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(allLancamentos || []).filter(l =>
                                  !(selectedSettlement.settlementLancamentos || []).some(sl => sl.lancamentoId === l.id)
                                ).map(l => (
                                  <SelectItem key={l.id} value={l.id}>
                                    <span className="flex items-center gap-1">
                                      {l.tipo === "credito"
                                        ? <TrendingUp className="h-3 w-3 text-green-600" />
                                        : <TrendingDown className="h-3 w-3 text-red-600" />}
                                      {l.nome} — R$ {parseFloat(l.valor).toFixed(2).replace(".", ",")}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              disabled={!selectedLancamentoId || addLancamentoMutation.isPending}
                              onClick={() => addLancamentoMutation.mutate({ settlementId: selectedSettlement.id, lancamentoId: selectedLancamentoId })}
                              data-testid="button-confirm-add-lancamento"
                            >
                              {addLancamentoMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => { setShowAddLancamentoDialog(false); setSelectedLancamentoId(""); }}
                              data-testid="button-cancel-add-lancamento"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => setShowAddLancamentoDialog(true)}
                            data-testid="button-add-lancamento"
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar Lançamento
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── Card Adiantamento e Saldo ────────────────────────────────── */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Adiantamento e Saldo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const approvedItemsForBalance = selectedSettlement.items?.filter(i => (i as any).itemStatus === "aprovado") || [];
                    const totalComprovadoForBalance = approvedItemsForBalance.reduce((sum, i) => sum + parseFloat((i as any).approvedAmount || "0"), 0);
                    // Prioridade: valor local editado > valor salvo na PC > valor da proposta de transporte
                    const proposalAdvance = (selectedSettlement as any).proposalAdvanceAmount;
                    const proposalMethod = (selectedSettlement as any).proposalAdvanceMethod;
                    const proposalApproximate = (selectedSettlement as any).proposalApproximateValue;
                    const savedAdvance = selectedSettlement.advanceAmount || proposalAdvance || "0";
                    const currentAdvance = localAdvanceAmount !== "" ? localAdvanceAmount : savedAdvance;
                    const advanceAmount = parseFloat(currentAdvance);
                    const approximateValue = parseFloat(proposalApproximate || "0");
                    // Lançamentos: débito aumenta dívida do motorista (+), crédito reduz dívida (−)
                    const lancamentos = selectedSettlement.settlementLancamentos || [];
                    const totalDebitos = lancamentos.filter(l => l.lancamento.tipo === "debito").reduce((s, l) => s + parseFloat(l.lancamento.valor), 0);
                    const totalCreditos = lancamentos.filter(l => l.lancamento.tipo === "credito").reduce((s, l) => s + parseFloat(l.lancamento.valor), 0);
                    // Avarias com custo incluso: abate do saldo (motorista deve devolver o valor)
                    const totalDamageCost = (settlementDamages || [])
                      .filter(l => l.includeInCost && l.damageType)
                      .reduce((s, l) => s + getCostForSeverity(l.damageType, l.severity), 0);
                    // Fórmula: Adiantamento − Total Comprovado − Valor da Rota + Débitos − Créditos + Avarias
                    // Positivo → motorista deve devolver à empresa
                    // Negativo → empresa deve pagar ao motorista
                    const balance = advanceAmount - totalComprovadoForBalance - approximateValue + totalDebitos - totalCreditos + totalDamageCost;

                    const methodLabels: Record<string, string> = {
                      dinheiro: "Dinheiro",
                      cartao: "Cartão",
                      credito_conta: "Crédito em conta",
                    };
                    
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="advance-amount" className="text-sm font-medium">
                              Valor Adiantado (R$)
                            </Label>
                            <Input
                              id="advance-amount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={localAdvanceAmount !== "" ? localAdvanceAmount : (selectedSettlement.advanceAmount || proposalAdvance || "")}
                              onChange={(e) => {
                                const value = e.target.value;
                                setLocalAdvanceAmount(value);
                                debouncedUpdateAdvance(selectedSettlement.id, value);
                              }}
                              placeholder="0,00"
                              className="mt-1"
                              data-testid="input-advance-amount"
                            />
                            {proposalAdvance && !selectedSettlement.advanceAmount && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Preenchido automaticamente da proposta de transporte
                              </p>
                            )}
                            {proposalMethod && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                                Forma: {methodLabels[proposalMethod] || proposalMethod}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Total Comprovado</Label>
                            <div className="mt-1 p-2 bg-muted rounded-md text-lg font-semibold text-purple-700 dark:text-purple-300" data-testid="text-total-comprovado">
                              R$ {totalComprovadoForBalance.toFixed(2).replace(".", ",")}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Valor da Rota (Ganho)</Label>
                            <div className="mt-1 p-2 bg-muted rounded-md text-lg font-semibold text-blue-700 dark:text-blue-300" data-testid="text-valor-rota">
                              R$ {approximateValue.toFixed(2).replace(".", ",")}
                            </div>
                            {proposalApproximate ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                Da proposta de transporte
                              </p>
                            ) : (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Sem proposta vinculada
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className={`p-4 rounded-lg border-2 ${
                          balance > 0 
                            ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700" 
                            : balance < 0 
                              ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                              : "bg-gray-50 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700"
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                {balance > 0 ? "Motorista deve devolver à empresa" : balance < 0 ? "Motorista deve receber da empresa" : "Saldo zerado"}
                              </p>
                              <p className={`text-2xl font-bold ${
                                balance > 0 
                                  ? "text-orange-600 dark:text-orange-400" 
                                  : balance < 0 
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-gray-600 dark:text-gray-400"
                              }`} data-testid="text-balance-amount">
                                R$ {Math.abs(balance).toFixed(2).replace(".", ",")}
                              </p>
                            </div>
                            <div className={`p-3 rounded-full ${
                              balance > 0 
                                ? "bg-orange-100 dark:bg-orange-800" 
                                : balance < 0 
                                  ? "bg-green-100 dark:bg-green-800"
                                  : "bg-gray-100 dark:bg-gray-800"
                            }`}>
                              {balance > 0 ? (
                                <RotateCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                              ) : balance < 0 ? (
                                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                              ) : (
                                <CheckCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Adiantamento (R$ {advanceAmount.toFixed(2).replace(".", ",")}) − Comprovado (R$ {totalComprovadoForBalance.toFixed(2).replace(".", ",")}) − Rota (R$ {approximateValue.toFixed(2).replace(".", ",")})
                            {(totalDebitos > 0 || totalCreditos > 0) && (
                              <> + Déb (R$ {totalDebitos.toFixed(2).replace(".", ",")}) − Créd (R$ {totalCreditos.toFixed(2).replace(".", ",")})</>
                            )}
                            {totalDamageCost > 0 && (
                              <> + Avarias (R$ {totalDamageCost.toFixed(2).replace(".", ",")})</>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* NFS — visível quando aprovada ou já enviada/assinada */}
              {(selectedSettlement.status === "aprovado" || (selectedSettlement as any).nfsFileUrl || selectedSettlement.status === "enviado_nfs" || selectedSettlement.status === "assinado") && (
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-blue-600" />
                        Nota Fiscal de Serviços (NFS)
                      </CardTitle>
                      {(selectedSettlement.status === "aprovado" || selectedSettlement.status === "enviado_nfs" || selectedSettlement.status === "assinado") && (
                        <>
                          <input
                            ref={nfsFileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,application/pdf,text/xml,application/xml,.xml"
                            className="hidden"
                            onChange={handleNfsFileChange}
                            data-testid="input-nfs-file"
                          />
                          <Button
                            size="sm"
                            variant={(selectedSettlement as any).nfsFileUrl ? "outline" : "default"}
                            onClick={() => nfsFileInputRef.current?.click()}
                            disabled={uploadNfsMutation.isPending}
                            data-testid="button-upload-nfs"
                          >
                            {uploadNfsMutation.isPending ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Upload className="h-3.5 w-3.5 mr-1.5" />
                                {(selectedSettlement as any).nfsFileUrl ? "Substituir NFS" : "Adicionar NFS"}
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(selectedSettlement as any).nfsFileUrl ? (() => {
                      const url: string = (selectedSettlement as any).nfsFileUrl;
                      const isImage = /\.(jpe?g|png|webp|heic)$/i.test(url);
                      const isPdf = /\.pdf$/i.test(url);
                      const isXml = /\.xml$/i.test(url);
                      const fileLabel = isPdf ? "PDF" : isXml ? "XML" : isImage ? "Imagem" : "Arquivo";
                      const FileIcon = isPdf ? FileText : isXml ? FileCode2 : FileImage;
                      const nfsSentAt = (selectedSettlement as any).nfsSentAt;
                      const fullUrl = url.startsWith("http") ? url : url;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded">
                                <FileIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                  NFS enviada ({fileLabel})
                                </p>
                                {nfsSentAt && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                    Enviada em {format(new Date(nfsSentAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={fullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors border border-blue-300 dark:border-blue-600 rounded px-2 py-1"
                                data-testid="link-nfs-view"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Visualizar
                              </a>
                              {selectedSettlement.status !== "concluido" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"
                                  disabled={deleteNfsMutation.isPending}
                                  onClick={() => deleteNfsMutation.mutate(selectedSettlement.id)}
                                  title="Excluir NFS"
                                  data-testid="button-delete-nfs"
                                >
                                  {deleteNfsMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          {isImage && (
                            <div
                              className="relative rounded overflow-hidden border cursor-pointer"
                              onClick={() => setLightboxPhoto(normalizeImageUrl(url))}
                            >
                              <img
                                src={normalizeImageUrl(url)}
                                alt="NFS"
                                className="w-full max-h-48 object-contain bg-muted"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg">
                        <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="mb-1">Nenhuma NFS anexada</p>
                        <p className="text-xs">
                          Anexe uma NFS (Imagem, PDF ou XML) ou aguarde o envio pelo motorista
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Comprovantes ({selectedSettlement.items?.length || 0})
                    </CardTitle>
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddItemDialog(true)}
                      data-testid="button-add-expense-item"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Despesa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedSettlement.items?.length ? (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Nenhum comprovante adicionado</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setShowAddItemDialog(true)}
                        data-testid="button-add-first-expense"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar primeira despesa
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border rounded-lg border overflow-hidden">
                      {selectedSettlement.items.map((item, idx) => {
                        const typeConfig = expenseTypeLabels[item.type] || expenseTypeLabels.outros;
                        const TypeIcon = typeConfig.icon;
                        const hasIssue = (item as any).photoStatus !== "ok";
                        const itemStatus = (item as any).itemStatus || "pendente";
                        const approvedAmount = (item as any).approvedAmount;
                        const isApproving = approvingItemId === item.id;

                        const countryCode = (item as any).country || currencyToCountry[item.currency || "BRL"] || "BR";
                        const countryInfo = countryConfig[countryCode] || { label: countryCode, flag: "🌍" };

                        const rowBg = itemStatus === "aprovado"
                          ? "bg-green-50/40 dark:bg-green-950/20"
                          : itemStatus === "reprovado"
                          ? "bg-red-50/40 dark:bg-red-950/20"
                          : "bg-background";

                        return (
                          <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${rowBg}`}>

                            {/* Thumbnail */}
                            <button
                              type="button"
                              className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border bg-muted group"
                              onClick={() => setLightboxPhoto(normalizeImageUrl(item.photoUrl))}
                              data-testid={`button-view-photo-${item.id}`}
                            >
                              <img
                                src={normalizeImageUrl(item.photoUrl)}
                                alt={typeConfig.label}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                                }}
                              />
                              <div className="hidden absolute inset-0 flex items-center justify-center">
                                <ImageOff className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="h-4 w-4 text-white" />
                              </div>
                            </button>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                                  <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  {typeConfig.label}
                                </span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 font-normal" data-testid={`text-country-${item.id}`}>
                                  <span className="leading-none">{countryInfo.flag}</span>
                                  <span>{item.currency || "BRL"}</span>
                                </Badge>
                                {itemStatus === "aprovado" && (
                                  <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                    <Check className="h-2.5 w-2.5" /> Aprovado
                                  </Badge>
                                )}
                                {itemStatus === "reprovado" && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                    <X className="h-2.5 w-2.5" /> Reprovado
                                  </Badge>
                                )}
                                {hasIssue && itemStatus === "pendente" && (
                                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-[10px] px-1.5 py-0 h-4">
                                    {(item as any).photoStatus}
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                              )}
                            </div>

                            {/* Amount */}
                            <div className="shrink-0 text-right min-w-[90px]">
                              {itemStatus === "aprovado" && approvedAmount ? (
                                <div>
                                  <p className="text-sm font-bold text-green-600">{formatCurrency(approvedAmount, "BRL")}</p>
                                  <p className="text-[10px] text-muted-foreground">comprovado</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{formatCurrency(item.amount, item.currency || "BRL")}</p>
                                  <p className="text-[10px] text-muted-foreground">enviado</p>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            {(selectedSettlement.status === "pendente" || selectedSettlement.status === "enviado") && (
                              <div className="shrink-0 flex items-center gap-1">
                                {isApproving ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="R$ 0,00"
                                      value={
                                        approvingAmount
                                          ? "R$ " + parseFloat(approvingAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, "");
                                        if (!digits) { setApprovingAmount(""); return; }
                                        setApprovingAmount((parseInt(digits, 10) / 100).toString());
                                      }}
                                      className="h-8 w-28 text-xs"
                                      autoFocus
                                      data-testid={`input-approve-amount-${item.id}`}
                                    />
                                    <Button
                                      size="icon"
                                      className="h-8 w-8 bg-green-600 hover:bg-green-700 shrink-0"
                                      disabled={!approvingAmount || updateItemStatusMutation.isPending}
                                      onClick={() => updateItemStatusMutation.mutate({
                                        itemId: item.id,
                                        itemStatus: "aprovado",
                                        approvedAmount: approvingAmount,
                                      })}
                                      data-testid={`button-confirm-approve-${item.id}`}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 shrink-0"
                                      onClick={() => { setApprovingItemId(null); setApprovingAmount(""); }}
                                      data-testid={`button-cancel-approve-${item.id}`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      onClick={() => setLightboxPhoto(normalizeImageUrl(item.photoUrl))}
                                      title="Visualizar comprovante"
                                      data-testid={`button-view-item-${item.id}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className={`h-8 w-8 ${itemStatus === "aprovado" ? "bg-green-600 border-green-600 text-white hover:bg-green-700" : "hover:bg-green-50 hover:border-green-500 hover:text-green-700"}`}
                                      disabled={updateItemStatusMutation.isPending}
                                      onClick={() => {
                                        setApprovingItemId(item.id);
                                        setApprovingAmount(approvedAmount || "");
                                      }}
                                      title={itemStatus === "aprovado" ? "Editar aprovação" : "Aprovar"}
                                      data-testid={`button-approve-item-${item.id}`}
                                    >
                                      <ThumbsUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant={itemStatus === "reprovado" ? "destructive" : "outline"}
                                      className={`h-8 w-8 ${itemStatus !== "reprovado" ? "hover:bg-red-50 hover:border-red-400 hover:text-red-700" : ""}`}
                                      disabled={updateItemStatusMutation.isPending}
                                      onClick={() => updateItemStatusMutation.mutate({
                                        itemId: item.id,
                                        itemStatus: itemStatus === "reprovado" ? "pendente" : "reprovado",
                                      })}
                                      title={itemStatus === "reprovado" ? "Desfazer reprovação" : "Reprovar"}
                                      data-testid={`button-reject-item-${item.id}`}
                                    >
                                      <ThumbsDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => deleteItemMutation.mutate(item.id)}
                                      title="Excluir comprovante"
                                      data-testid={`button-delete-item-${item.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Avarias ─────────────────────────────────────────── */}
              {(() => {
                const transport = selectedSettlement.transport as any;
                const checkinPhotos: string[] = transport?.checkinDamagePhotos || [];
                const checkoutPhotos: string[] = transport?.checkoutDamagePhotos || [];
                const transportPhotoItems = [
                  ...checkinPhotos.map((url, i) => ({ key: `cin-${i}`, url, label: "Avaria no Checkin", badge: "Checkin" })),
                  ...checkoutPhotos.map((url, i) => ({ key: `cout-${i}`, url, label: "Avaria no Checkout", badge: "Checkout" })),
                ];
                const linkedItems = settlementDamages || [];
                const transportAppDamages = transportDamageReports || [];
                const totalCount = transportPhotoItems.length + linkedItems.length + transportAppDamages.length;

                return (
                  <Card>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-orange-500" />
                          Avarias ({totalCount})
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddDamageDialog(true)}
                          data-testid="button-add-damage"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Avaria
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingDamages ? (
                        <div className="space-y-2">
                          <div className="h-16 bg-muted rounded-lg animate-pulse" />
                          <div className="h-16 bg-muted rounded-lg animate-pulse" />
                        </div>
                      ) : totalCount === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhuma avaria registrada</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => setShowAddDamageDialog(true)}
                            data-testid="button-add-first-damage"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Vincular avaria
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y divide-border rounded-lg border overflow-hidden">
                          {/* Transport checkin/checkout damage photos — read-only */}
                          {transportPhotoItems.map((item) => (
                            <div key={item.key} className="flex items-center gap-3 px-4 py-3 bg-orange-50/30 dark:bg-orange-950/10">
                              <button
                                type="button"
                                className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border bg-muted group"
                                onClick={() => setLightboxPhoto(normalizeImageUrl(item.url))}
                                data-testid={`button-view-transport-damage-${item.key}`}
                              >
                                <img
                                  src={normalizeImageUrl(item.url)}
                                  alt="Avaria"
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className="text-xs font-semibold text-foreground">{item.label}</span>
                                  <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[10px] px-1.5 py-0 h-4" variant="outline">
                                    {item.badge}
                                  </Badge>
                                  {selectedSettlement.transport?.vehicleChassi && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                      {selectedSettlement.transport.vehicleChassi}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground">Foto registrada pelo motorista</p>
                              </div>
                              {/* Transport photos are always part of the record — no cost toggle needed */}
                              <span className="text-[10px] text-muted-foreground shrink-0">Automático</span>
                            </div>
                          ))}

                          {/* Transport app damage reports (submitted by driver during transit) */}
                          {transportAppDamages.map((dr) => (
                            <div key={dr.id} className="flex items-start gap-3 px-4 py-3 bg-amber-50/40 dark:bg-amber-950/10" data-testid={`row-transport-damage-${dr.id}`}>
                              <button
                                type="button"
                                className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border bg-muted group"
                                onClick={() => setLightboxPhoto(normalizeImageUrl(dr.photoUrl))}
                                data-testid={`button-view-transport-damage-app-${dr.id}`}
                              >
                                <img
                                  src={normalizeImageUrl(dr.photoUrl)}
                                  alt={dr.damageTypeName ?? "Avaria"}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className="text-xs font-semibold text-foreground">{dr.damageTypeName ?? "Avaria"}</span>
                                  {dr.damageTypeCategory && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">{dr.damageTypeCategory}</Badge>
                                  )}
                                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0 h-4" variant="outline">Durante Transporte</Badge>
                                  {dr.vehicleChassi && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{dr.vehicleChassi}</Badge>
                                  )}
                                </div>
                                {dr.description && (
                                  <p className="text-[10px] text-muted-foreground">{dr.description}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground">
                                  {dr.createdAt ? new Date(dr.createdAt).toLocaleString("pt-BR") : "—"}
                                </p>
                                {dr.latitude && dr.longitude && (
                                  <a
                                    href={`https://www.google.com/maps?q=${dr.latitude},${dr.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MapPin className="h-2.5 w-2.5" />
                                    Ver localização
                                  </a>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">App motorista</span>
                            </div>
                          ))}

                          {/* Manually linked damage types */}
                          {linkedItems.map((link) => {
                            const dt = link.damageType;
                            const cost = getCostForSeverity(dt, link.severity);
                            const severityLabel = ({ leve: "Leve", media: "Média", grave: "Grave", critica: "Crítica", part: "Troca de Peça" } as Record<string, string>)[link.severity] || link.severity;
                            return (
                              <div key={link.id} className="flex items-center gap-3 px-4 py-3 bg-background">
                                <div className="shrink-0 w-14 h-14 rounded-lg border bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                                  <ShieldAlert className="h-6 w-6 text-orange-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span className="text-xs font-semibold text-foreground">
                                      {dt?.name || "Avaria"}
                                    </span>
                                    {dt?.category && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                                        {dt.category}
                                      </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                      {severityLabel}
                                    </Badge>
                                    {link.vehicleChassi && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                        {link.vehicleChassi}
                                      </Badge>
                                    )}
                                    {cost > 0 && (
                                      <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                                        R$ {cost.toFixed(2).replace(".", ",")}
                                      </span>
                                    )}
                                  </div>
                                  {dt?.brand && (
                                    <p className="text-[10px] text-muted-foreground">Marca: {dt.brand}</p>
                                  )}
                                </div>
                                <div className="shrink-0 flex flex-col items-center gap-1 min-w-[80px]">
                                  <Switch
                                    checked={link.includeInCost}
                                    onCheckedChange={(checked) =>
                                      toggleDamageCostMutation.mutate({
                                        settlementId: link.settlementId,
                                        linkId: link.id,
                                        includeInCost: checked,
                                      })
                                    }
                                    data-testid={`switch-damage-cost-${link.id}`}
                                  />
                                  <span className="text-[9px] text-muted-foreground text-center leading-tight">
                                    {link.includeInCost ? "Custo incluso" : "Sem custo"}
                                  </span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeDamageMutation.mutate({ settlementId: link.settlementId, linkId: link.id })}
                                  disabled={removeDamageMutation.isPending}
                                  title="Remover avaria"
                                  data-testid={`button-remove-damage-${link.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {selectedSettlement.status === "devolvido" && selectedSettlement.returnReason && (
                <Card className="border-destructive">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Motivo da Devolução
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{selectedSettlement.returnReason}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            {selectedSettlement && selectedSettlement.status === "enviado" && (
              <Button
                variant="destructive"
                onClick={() => rejectMutation.mutate(selectedSettlement.id)}
                disabled={rejectMutation.isPending}
                data-testid="button-reject-settlement"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {rejectMutation.isPending ? "Reprovando..." : "Reprovar Prestação"}
              </Button>
            )}
            {selectedSettlement && selectedSettlement.status === "enviado" && (
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                data-testid="button-approve-settlement"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar Prestação
              </Button>
            )}
            {selectedSettlement?.status === "aprovado" && (
              <Button
                variant="outline"
                data-testid="button-generate-document"
                disabled={generatingPDF === selectedSettlement?.id}
                onClick={() => selectedSettlement && generateSettlementPDF(selectedSettlement)}
              >
                {generatingPDF === selectedSettlement?.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Gerar PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Devolver Prestação de Contas
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da devolução para o motorista
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="return-reason">Motivo da Devolução</Label>
              <Textarea
                id="return-reason"
                placeholder="Ex: Foto do comprovante de pedágio está ilegível. Por favor, envie uma foto mais nítida."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={4}
                data-testid="textarea-return-reason"
              />
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                O motorista receberá uma notificação no aplicativo informando que precisa corrigir e reenviar a prestação de contas.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReturn}
              disabled={returnMutation.isPending || !returnReason.trim()}
              data-testid="button-confirm-return"
            >
              {returnMutation.isPending ? "Enviando..." : "Confirmar Devolução"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {lightboxPhoto && (
            <img
              src={lightboxPhoto}
              alt="Comprovante"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Prestação de Contas</DialogTitle>
            <DialogDescription>
              Crie uma prestação de contas com as despesas e comprovantes do transporte.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-transport">Transporte (OTD) *</Label>
                <Select 
                  value={newSettlement.transportId} 
                  onValueChange={(value) => {
                    const transport = transports?.find(t => t.id === value);
                    setNewSettlement({ 
                      ...newSettlement, 
                      transportId: value,
                      driverId: transport?.driverId || ""
                    });
                  }}
                >
                  <SelectTrigger data-testid="select-transport">
                    <SelectValue placeholder="Selecione um transporte" />
                  </SelectTrigger>
                  <SelectContent>
                    {transports?.filter(t => 
                      (t.status === "entregue" || t.status === "em_transito") && 
                      !settlements?.some(s => s.transportId === t.id)
                    ).map((transport) => (
                      <SelectItem key={transport.id} value={transport.id}>
                        {transport.requestNumber} - {transport.vehicleChassi}
                        {transport.status === "em_transito" && (
                          <span className="ml-1 text-xs text-amber-600">(Em trânsito)</span>
                        )}
                      </SelectItem>
                    ))}
                    {transports?.filter(t => 
                      (t.status === "entregue" || t.status === "em_transito") && 
                      !settlements?.some(s => s.transportId === t.id)
                    ).length === 0 && (
                      <div className="py-4 px-2 text-center text-sm text-muted-foreground">
                        Nenhum transporte em trânsito ou entregue disponível
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-driver">Motorista *</Label>
                <Select 
                  value={newSettlement.driverId} 
                  onValueChange={(value) => setNewSettlement({ ...newSettlement, driverId: value })}
                >
                  <SelectTrigger data-testid="select-driver">
                    <SelectValue placeholder="Selecione um motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers?.filter(d => d.isActive === "true").map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Despesas ({newSettlement.items.length})
                </h3>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={addNewSettlementItem}
                  data-testid="button-add-item"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Despesa
                </Button>
              </div>

              {newSettlement.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma despesa adicionada</p>
                  <p className="text-xs">Clique em "Adicionar Despesa" para incluir comprovantes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {newSettlement.items.map((item, index) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-24 shrink-0">
                          {item.photoUrl ? (
                            <div className="relative w-full h-full">
                              <img 
                                src={normalizeImageUrl(item.photoUrl)} 
                                alt="Comprovante" 
                                className="w-full h-full object-cover rounded-lg border"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-5 w-5"
                                onClick={() => updateNewSettlementItem(index, "photoUrl", "")}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer block w-full h-full border-2 border-dashed rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleNewSettlementItemPhoto(e, index)}
                                disabled={uploadingItemIndex === index}
                                data-testid={`input-photo-${index}`}
                              />
                              {uploadingItemIndex === index ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              ) : (
                                <div className="text-center">
                                  <Camera className="h-6 w-6 mx-auto text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Foto</span>
                                </div>
                              )}
                            </label>
                          )}
                        </div>

                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">País/Moeda *</Label>
                            <Select 
                              value={item.currency || "BRL"} 
                              onValueChange={(value) => updateNewSettlementItem(index, "currency", value)}
                            >
                              <SelectTrigger className="h-9" data-testid={`select-currency-${index}`}>
                                <SelectValue placeholder="Moeda" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(currencyConfig).map(([code, config]) => (
                                  <SelectItem key={code} value={code}>
                                    <span>{config.country}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Tipo *</Label>
                            <Select 
                              value={item.type} 
                              onValueChange={(value) => updateNewSettlementItem(index, "type", value)}
                            >
                              <SelectTrigger className="h-9" data-testid={`select-type-${index}`}>
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(expenseTypeLabels).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <config.icon className="h-3 w-3" />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>


                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Observação</Label>
                            <Input
                              placeholder="Descrição da despesa..."
                              value={item.description}
                              onChange={(e) => updateNewSettlementItem(index, "description", e.target.value)}
                              className="h-9"
                              data-testid={`input-description-${index}`}
                            />
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeNewSettlementItem(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-notes">Observações Gerais (opcional)</Label>
              <Textarea
                id="new-notes"
                placeholder="Adicione observações sobre a prestação de contas..."
                value={newSettlement.driverNotes}
                onChange={(e) => setNewSettlement({ ...newSettlement, driverNotes: e.target.value })}
                rows={2}
                data-testid="textarea-notes"
              />
            </div>

            {newSettlement.items.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total das Despesas:</span>
                <span className="text-lg font-bold text-green-600">
                  {newSettlement.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewDialog(false);
              setNewSettlement({ transportId: "", driverId: "", driverNotes: "", items: [] });
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createMutation.mutate(newSettlement)}
              disabled={
                createMutation.isPending || 
                !newSettlement.transportId || 
                !newSettlement.driverId || 
                newSettlement.items.length === 0 ||
                newSettlement.items.some(item => !item.type || !item.photoUrl)
              }
              data-testid="button-create-settlement"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Prestação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Despesa
            </DialogTitle>
            <DialogDescription>
              Adicione uma despesa com foto do comprovante
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Foto do Comprovante *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {newItem.photoUrl ? (
                  <div className="relative">
                    <img 
                      src={normalizeImageUrl(newItem.photoUrl)} 
                      alt="Comprovante" 
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => setNewItem(prev => ({ ...prev, photoUrl: "" }))}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      data-testid="input-expense-photo"
                    />
                    {isUploadingPhoto ? (
                      <div className="py-4">
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Enviando foto...</p>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">
                          Clique para enviar foto do comprovante
                        </p>
                      </div>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>País / Moeda *</Label>
              <Select 
                value={newItem.currency} 
                onValueChange={(value) => setNewItem(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger data-testid="select-expense-currency">
                  <SelectValue placeholder="Selecione o país/moeda" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(currencyConfig).map(([code, config]) => (
                    <SelectItem key={code} value={code}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.country}</span>
                        <span className="text-muted-foreground">({config.symbol})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Despesa *</Label>
              <Select 
                value={newItem.type} 
                onValueChange={(value) => setNewItem(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger data-testid="select-expense-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(expenseTypeLabels).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                placeholder="Descrição ou observação sobre esta despesa..."
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                data-testid="textarea-expense-description"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddItemDialog(false);
                setNewItem({ type: "", currency: "BRL", amount: "", photoUrl: "", description: "" });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddItem}
              disabled={addItemMutation.isPending || !newItem.type || !newItem.photoUrl}
              data-testid="button-save-expense"
            >
              {addItemMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Despesa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Adicionar Avaria Dialog ─────────────────────────────────────── */}
      <Dialog open={showAddDamageDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDamageDialog(false);
          setSelectedDamageItems(new Map());
          setExpandedDamageTypeId(null);
          setDamageIncludeInCost(false);
          setDamageSearchTerm("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
              Vincular Avarias
            </DialogTitle>
            <DialogDescription>
              Selecione o tipo de avaria e a severidade para vincular a esta prestação de contas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, categoria ou marca..."
                value={damageSearchTerm}
                onChange={(e) => setDamageSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-damage-search"
              />
            </div>

            {/* Damage type list */}
            <div className="max-h-72 overflow-y-auto space-y-1 rounded-md border bg-muted/30 p-1">
              {isLoadingAllDamageTypes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (() => {
                const q = damageSearchTerm.toLowerCase();
                const alreadyLinked = new Set(
                  (settlementDamages || []).map(l => `${l.damageTypeId}-${l.severity}`)
                );
                const types = (allDamageTypes || []).filter(dt =>
                  dt.isActive !== "false" && (
                    !q ||
                    dt.name.toLowerCase().includes(q) ||
                    dt.category.toLowerCase().includes(q) ||
                    (dt.brand?.toLowerCase().includes(q))
                  )
                );
                if (!types.length) return (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <ShieldAlert className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nenhuma avaria encontrada</p>
                    <p className="text-xs text-muted-foreground">Cadastre tipos de avaria em Cadastro → Avarias</p>
                  </div>
                );
                return types.map((dt) => {
                  const selectedSeverity = selectedDamageItems.get(dt.id);
                  const isSelected = selectedSeverity !== undefined;
                  const isExpanded = expandedDamageTypeId === dt.id;
                  const availableSeverities = getAvailableSeverities(dt);

                  return (
                    <div key={dt.id} className="rounded-md overflow-hidden">
                      {/* Type row */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            // Deselect
                            setSelectedDamageItems(prev => { const m = new Map(prev); m.delete(dt.id); return m; });
                            setExpandedDamageTypeId(null);
                          } else if (availableSeverities.length === 1) {
                            // Auto-select the only severity
                            const key = `${dt.id}-${availableSeverities[0].key}`;
                            if (!alreadyLinked.has(key)) {
                              setSelectedDamageItems(prev => new Map(prev).set(dt.id, availableSeverities[0].key));
                            }
                            setExpandedDamageTypeId(null);
                          } else {
                            // Toggle expand
                            setExpandedDamageTypeId(isExpanded ? null : dt.id);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        data-testid={`button-select-damage-type-${dt.id}`}
                      >
                        <div className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? "bg-primary-foreground border-primary-foreground" : "border-muted-foreground"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-primary" />}
                        </div>
                        <div className="shrink-0 w-9 h-9 rounded-lg border bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
                          <ShieldAlert className={`h-4 w-4 ${isSelected ? "text-primary-foreground" : "text-orange-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-xs font-semibold truncate ${isSelected ? "" : "text-foreground"}`}>{dt.name}</p>
                            <span className={`text-[10px] px-1.5 py-0 h-4 rounded border capitalize inline-flex items-center ${isSelected ? "border-primary-foreground/40 text-primary-foreground/80" : "border-border text-muted-foreground"}`}>
                              {dt.category}
                            </span>
                            {dt.brand && (
                              <span className={`text-[10px] ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {dt.brand}
                              </span>
                            )}
                          </div>
                          {isSelected ? (
                            <p className="text-[10px] text-primary-foreground/80 mt-0.5">
                              Severidade: {SEVERITY_LABELS[selectedSeverity!] || selectedSeverity} · R$ {getCostForSeverity(dt, selectedSeverity!).toFixed(2).replace(".", ",")}
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {availableSeverities.length} {availableSeverities.length === 1 ? "opção" : "opções"} de severidade
                            </p>
                          )}
                        </div>
                        {!isSelected && availableSeverities.length > 1 && (
                          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        )}
                      </button>

                      {/* Severity picker (expanded) */}
                      {isExpanded && !isSelected && (
                        <div className="px-3 pb-2 bg-muted/50 flex flex-wrap gap-1.5 pt-1.5">
                          {availableSeverities.map(sev => {
                            const key = `${dt.id}-${sev.key}`;
                            const alreadyUsed = alreadyLinked.has(key);
                            return (
                              <button
                                key={sev.key}
                                type="button"
                                disabled={alreadyUsed}
                                onClick={() => {
                                  setSelectedDamageItems(prev => new Map(prev).set(dt.id, sev.key));
                                  setExpandedDamageTypeId(null);
                                }}
                                className={`inline-flex flex-col items-center px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                                  alreadyUsed
                                    ? "border-border text-muted-foreground/40 cursor-not-allowed bg-muted/30"
                                    : "border-orange-300 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                }`}
                                data-testid={`button-severity-${dt.id}-${sev.key}`}
                              >
                                <span>{sev.label}</span>
                                <span className="text-[10px] font-bold">R$ {sev.cost.toFixed(2).replace(".", ",")}</span>
                                {alreadyUsed && <span className="text-[9px]">já vinculado</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Selection summary + include in cost toggle */}
            {selectedDamageItems.size > 0 && (
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/20">
                <div>
                  <p className="text-sm font-medium">
                    {selectedDamageItems.size === 1 ? "1 avaria selecionada" : `${selectedDamageItems.size} avarias selecionadas`}
                  </p>
                  <p className="text-xs text-muted-foreground">Incluir custo no saldo final da prestação?</p>
                </div>
                <Switch
                  checked={damageIncludeInCost}
                  onCheckedChange={setDamageIncludeInCost}
                  data-testid="switch-include-cost"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDamageDialog(false);
              setSelectedDamageItems(new Map());
              setExpandedDamageTypeId(null);
              setDamageIncludeInCost(false);
              setDamageSearchTerm("");
            }}>
              Cancelar
            </Button>
            <Button
              onClick={() => selectedSettlement && addDamageMutation.mutate({
                settlementId: selectedSettlement.id,
                items: Array.from(selectedDamageItems.entries()).map(([damageTypeId, severity]) => ({ damageTypeId, severity })),
                includeInCost: damageIncludeInCost,
              })}
              disabled={selectedDamageItems.size === 0 || addDamageMutation.isPending}
              data-testid="button-confirm-add-damage"
            >
              {addDamageMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Vinculando...</>
              ) : selectedDamageItems.size > 1 ? (
                <>Vincular {selectedDamageItems.size} Avarias</>
              ) : (
                "Vincular Avaria"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
