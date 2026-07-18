import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Layers,
  Database,
  Network,
  KeyRound,
  Rocket,
  Server,
  Code2,
  ArrowRight,
  ShieldCheck,
  Terminal,
  Cloud,
  MapPin,
  Bell,
  FileSignature,
  Mail,
  BrainCircuit,
  HardDrive,
  Workflow,
  ExternalLink,
} from "lucide-react";

type MethodTag = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const methodColors: Record<MethodTag, string> = {
  GET: "bg-emerald-600",
  POST: "bg-blue-600",
  PUT: "bg-amber-600",
  PATCH: "bg-violet-600",
  DELETE: "bg-red-600",
};

function MethodBadge({ method }: { method: MethodTag }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${methodColors[method]}`}
    >
      {method}
    </span>
  );
}

const sections = [
  { id: "arquitetura", label: "1. Arquitetura & Stack", icon: Layers },
  { id: "modelagem", label: "2. Modelagem de Dados", icon: Database },
  { id: "api", label: "3. API / Endpoints", icon: Network },
  { id: "ambiente", label: "4. Variáveis de Ambiente", icon: KeyRound },
  { id: "inicializacao", label: "5. Inicialização & Deploy", icon: Rocket },
];

const stackLayers: {
  title: string;
  icon: typeof Layers;
  items: string[];
}[] = [
  {
    title: "Frontend (SPA)",
    icon: Code2,
    items: [
      "React + TypeScript",
      "Vite (build e dev server com HMR)",
      "Wouter (roteamento)",
      "TanStack Query v5 (estado de servidor / cache)",
      "Shadcn UI + Radix UI",
      "Tailwind CSS (tema claro/escuro via CSS vars)",
      "React Hook Form + Zod (formulários e validação)",
    ],
  },
  {
    title: "Backend (API REST)",
    icon: Server,
    items: [
      "Node.js 20 + TypeScript",
      "Express.js (rotas REST sob /api)",
      "Drizzle ORM (acesso ao banco)",
      "Zod (validação de entrada/saída)",
      "Processo único na porta 5000 servindo API + SPA",
    ],
  },
  {
    title: "Banco de Dados",
    icon: Database,
    items: [
      "PostgreSQL 16",
      "PostGIS 3.5 (dados geoespaciais — geometry Point 4326)",
      "Drizzle Kit (drizzle-kit push) para sincronizar schema",
      "Chaves primárias UUID",
    ],
  },
  {
    title: "Autenticação",
    icon: ShieldCheck,
    items: [
      "JWT (server/auth-jwt.ts) — Bearer token",
      "Access token + Refresh token",
      "Token específico de cliente (portal do cliente)",
      "Replit Auth (OIDC) disponível como integração",
    ],
  },
  {
    title: "Integrações externas",
    icon: Cloud,
    items: [
      "Google Maps / Routes / Distance Matrix (mapas, geocoding, distâncias)",
      "Firebase Cloud Messaging (push para motoristas)",
      "SMTP / nodemailer (envio de e-mails)",
      "Autentique (assinatura digital de prestação de contas)",
      "OpenAI (Consulta Inteligente / análise)",
      "Replit Object Storage (upload de documentos e fotos)",
    ],
  },
  {
    title: "Build & Ferramentas",
    icon: Terminal,
    items: [
      "tsx (execução TypeScript em dev)",
      "esbuild (bundle do backend)",
      "script/build.ts → dist/index.cjs",
    ],
  },
];

const dataFlow: string[] = [
  "Navegador (React SPA) faz requisições fetch para /api via TanStack Query.",
  "Express recebe a requisição, valida o JWT (Authorization: Bearer) e os dados com Zod.",
  "As rotas chamam a camada de storage (Drizzle ORM), que consulta o PostgreSQL/PostGIS.",
  "Uploads de arquivos (CNH, RG, fotos) vão para o Replit Object Storage.",
  "Recursos externos são acionados sob demanda: Google Maps (rotas/distância), FCM (push), SMTP (e-mail), Autentique (assinatura) e OpenAI (análise).",
];

interface EntityField {
  name: string;
  type: string;
  note?: string;
}

interface DataEntity {
  table: string;
  label: string;
  desc: string;
  fields: EntityField[];
}

const dataEntities: DataEntity[] = [
  {
    table: "drivers",
    label: "Motoristas",
    desc: "Cadastro de motoristas (coleta e transporte), documentos e dados de acesso.",
    fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "name / cpf / phone / email", type: "text/varchar" },
      { name: "driverType", type: "enum", note: "coleta | transporte" },
      { name: "modality", type: "enum", note: "pj | clt | agregado" },
      { name: "cnhType", type: "varchar" },
      { name: "documentsApproved", type: "text", note: "pendente | aprovado | reprovado" },
      { name: "isActive", type: "text" },
    ],
  },
  {
    table: "vehicles",
    label: "Veículos (Estoque)",
    desc: "Veículos novos rastreados pelo chassi durante todo o ciclo de vida.",
    fields: [
      { name: "chassi", type: "varchar (PK)" },
      { name: "clientId / yardId / manufacturerId", type: "uuid (FK)" },
      {
        name: "status",
        type: "enum",
        note: "pre_estoque | em_estoque | em_transferencia | despachado | entregue | retirado",
      },
    ],
  },
  {
    table: "collects",
    label: "Coletas",
    desc: "Coleta de veículos na montadora até a entrada no pátio.",
    fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "vehicleChassi / manufacturerId / originYardId / yardId / driverId", type: "FK" },
      { name: "status", type: "enum", note: "em_transito | autorizado_portaria | finalizada" },
      { name: "checkinLocation / checkoutLocation", type: "geometry(Point,4326)", note: "PostGIS" },
    ],
  },
  {
    table: "transports",
    label: "Transportes",
    desc: "Transporte do veículo do pátio/origem até o local de entrega do cliente.",
    fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "requestNumber", type: "varchar" },
      { name: "vehicleChassi / clientId / originYardId / deliveryLocationId / destinationYardId / driverId", type: "FK" },
      {
        name: "status",
        type: "enum",
        note: "pendente | pendente_aprovacao | aguardando_saida | em_transito | entregue | cancelado",
      },
      { name: "checkinLocation / checkoutLocation", type: "geometry(Point,4326)", note: "PostGIS" },
    ],
  },
  {
    table: "clients",
    label: "Clientes",
    desc: "Clientes (montadoras/distribuidoras) e regras de cobrança de pátio.",
    fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "name / cnpj", type: "text/varchar" },
      { name: "dailyCost / yardGraceDays", type: "text/integer" },
    ],
  },
  {
    table: "manufacturers / yards",
    label: "Montadoras & Pátios",
    desc: "Origem dos veículos (montadoras) e locais de armazenamento (pátios).",
    fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "name / city / state", type: "text/varchar" },
      { name: "yards.maxVehicles / hasPortaria", type: "integer/text" },
    ],
  },
  {
    table: "delivery_locations",
    label: "Locais de Entrega",
    desc: "Endereços de entrega vinculados a um cliente, com coordenadas.",
    fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "clientId", type: "uuid (FK)" },
      { name: "address / city / state", type: "text/varchar" },
      { name: "latitude / longitude", type: "text" },
    ],
  },
  {
    table: "routes",
    label: "Rotas",
    desc: "Rotas pré-definidas com distância, tipo de caminhão e custo/preço.",
    fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "originYardId / destinationLocationId / destinationYardId", type: "FK" },
      { name: "distanceKm / totalCost / suggestedPrice", type: "numeric" },
      { name: "truckType", type: "enum" },
    ],
  },
  {
    table: "freight_quotes / freight_contracts",
    label: "Cotação & Contratos de Frete",
    desc: "Cotações de frete que podem ser convertidas em contratos.",
    fields: [
      { name: "freight_quotes.id", type: "uuid (PK)" },
      { name: "valorTotalCte / distanciaKm / freteOtd", type: "numeric" },
      { name: "convertedToContractId", type: "uuid", note: "→ freight_contracts" },
      { name: "freight_contracts.status", type: "enum", note: "ativo | suspenso | expirado | cancelado" },
    ],
  },
  {
    table: "expense_settlements",
    label: "Prestação de Contas",
    desc: "Acerto de despesas por transporte/motorista, com itens e avarias.",
    fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "transportId / driverId", type: "uuid (FK)" },
      { name: "status", type: "enum" },
      { name: "totalExpenses / balanceAmount", type: "text" },
      { name: "items.type / amount", type: "enum / text", note: "tabela expense_settlement_items" },
    ],
  },
  {
    table: "evaluation_criteria / driver_evaluations / evaluation_scores",
    label: "Avaliação de Motoristas",
    desc: "Critérios ponderados, avaliações por transporte e notas com severidade.",
    fields: [
      { name: "evaluation_criteria.weight", type: "numeric" },
      { name: "driver_evaluations.transportId / driverId", type: "FK" },
      { name: "driver_evaluations.averageScore", type: "numeric" },
      { name: "evaluation_scores.score / severity", type: "numeric / enum" },
    ],
  },
  {
    table: "transport_proposals",
    label: "Propostas de Transporte",
    desc: "Propostas ofertadas a motoristas, com itens e status por motorista.",
    fields: [
      { name: "id", type: "uuid (PK)" },
      { name: "proposalNumber", type: "varchar" },
      { name: "originYardId / clientId", type: "FK" },
      { name: "status", type: "enum", note: "ativa | encerrada | cancelada" },
    ],
  },
];

const relationships: string[] = [
  "delivery_locations.clientId → clients.id",
  "vehicles.clientId → clients.id",
  "vehicles.yardId → yards.id",
  "vehicles.manufacturerId → manufacturers.id",
  "collects.vehicleChassi → vehicles.chassi",
  "collects.manufacturerId → manufacturers.id",
  "collects.originYardId / yardId → yards.id",
  "collects.driverId → drivers.id",
  "transports.vehicleChassi → vehicles.chassi",
  "transports.clientId → clients.id",
  "transports.originYardId / destinationYardId → yards.id",
  "transports.deliveryLocationId → delivery_locations.id",
  "transports.driverId → drivers.id",
  "routes.originYardId / destinationYardId → yards.id",
  "routes.destinationLocationId → delivery_locations.id",
  "contracts.driverId → drivers.id",
  "contract_drivers.contractId → contracts.id / driverId → drivers.id",
  "expense_settlements.transportId → transports.id / driverId → drivers.id",
  "expense_settlement_items.settlementId → expense_settlements.id",
  "driver_evaluations.transportId → transports.id / driverId → drivers.id",
  "evaluation_scores.evaluationId → driver_evaluations.id / criteriaId → evaluation_criteria.id",
  "transport_proposals.originYardId → yards.id / clientId → clients.id",
  "transport_proposal_drivers.proposalId → transport_proposals.id / driverId → drivers.id",
];

interface AuthEndpoint {
  method: MethodTag;
  path: string;
  desc: string;
}

const authEndpoints: AuthEndpoint[] = [
  { method: "POST", path: "/api/auth/login", desc: "Login do usuário interno. Body: { username, password }. Retorna accessToken + refreshToken." },
  { method: "POST", path: "/api/auth/register", desc: "Registro de usuário interno. Body: { username, password, email? }." },
  { method: "POST", path: "/api/auth/refresh", desc: "Renova o accessToken a partir do refreshToken." },
  { method: "POST", path: "/api/auth/logout", desc: "Invalida a sessão / token do usuário." },
  { method: "GET", path: "/api/auth/me", desc: "Retorna os dados do usuário autenticado (requer Bearer token)." },
  { method: "POST", path: "/api/auth/forgot-password", desc: "Inicia a recuperação de senha (envia código por e-mail)." },
  { method: "POST", path: "/api/auth/verify-reset-code", desc: "Valida o código de redefinição enviado." },
  { method: "POST", path: "/api/auth/reset-password", desc: "Define uma nova senha após validar o código." },
  { method: "POST", path: "/api/auth/client-login", desc: "Login do portal do cliente (token de cliente)." },
  { method: "GET", path: "/api/auth/client-me", desc: "Dados do cliente autenticado no portal." },
];

interface ApiGroup {
  base: string;
  label: string;
  ops: string;
}

const apiGroups: ApiGroup[] = [
  { base: "/api/drivers", label: "Motoristas", ops: "GET (lista/por id), POST, PATCH/PUT, DELETE — cadastro, documentos, status" },
  { base: "/api/external/drivers/register", label: "Auto-cadastro de motorista", ops: "POST (público, multipart/form-data) — primeiro acesso pelo app" },
  { base: "/api/vehicles", label: "Veículos / Estoque", ops: "GET, POST, PATCH — consulta por chassi e mudança de status" },
  { base: "/api/collects", label: "Coletas", ops: "GET, POST, PATCH — fluxo de coleta e check-in/checkout" },
  { base: "/api/transports", label: "Transportes", ops: "GET, POST, PATCH, DELETE — ciclo completo do transporte" },
  { base: "/api/clients", label: "Clientes", ops: "GET, POST, PATCH, DELETE — clientes e locais de entrega" },
  { base: "/api/manufacturers", label: "Montadoras", ops: "GET, POST, PATCH, DELETE" },
  { base: "/api/yards", label: "Pátios", ops: "GET, POST, PATCH, DELETE" },
  { base: "/api/routes", label: "Rotas", ops: "GET, POST, PATCH, DELETE — gestão de rotas e custos" },
  { base: "/api/freight-quotes", label: "Cotação de Frete", ops: "GET, POST — cotações e conversão em contrato" },
  { base: "/api/expense-settlements", label: "Prestação de Contas", ops: "GET, POST, PATCH + ações de aprovação/Autentique" },
  { base: "/api/driver-evaluations", label: "Avaliações", ops: "GET, POST — avaliação e notas de motoristas" },
  { base: "/api/transport-proposals", label: "Propostas de Transporte", ops: "GET, POST, PATCH — ofertas a motoristas" },
  { base: "/api/system-versions", label: "Controle de Versão", ops: "GET, POST — versões do sistema" },
  { base: "/api/backup", label: "Backup", ops: "POST/GET — backup e restauração do banco" },
];

interface EnvVar {
  key: string;
  required: boolean;
  desc: string;
}

interface EnvGroup {
  title: string;
  icon: typeof Layers;
  vars: EnvVar[];
}

const envGroups: EnvGroup[] = [
  {
    title: "Núcleo",
    icon: Server,
    vars: [
      { key: "DATABASE_URL", required: true, desc: "String de conexão do PostgreSQL (com PostGIS habilitado)." },
      { key: "SESSION_SECRET", required: true, desc: "Segredo para assinatura de sessões." },
      { key: "PORT", required: false, desc: "Porta do servidor (padrão 5000 no ambiente Replit)." },
      { key: "NODE_ENV", required: false, desc: "development | production (define dev server x build)." },
    ],
  },
  {
    title: "Autenticação",
    icon: ShieldCheck,
    vars: [
      { key: "JWT_ACCESS_SECRET", required: true, desc: "Segredo de assinatura do access token." },
      { key: "JWT_REFRESH_SECRET", required: true, desc: "Segredo de assinatura do refresh token." },
      { key: "JWT_CLIENT_SECRET", required: true, desc: "Segredo do token do portal do cliente." },
      { key: "ISSUER_URL / REPL_ID", required: false, desc: "Usados pela integração Replit Auth (OIDC)." },
    ],
  },
  {
    title: "Mapas & Geolocalização",
    icon: MapPin,
    vars: [
      { key: "GOOGLE_MAPS_API_KEY", required: false, desc: "Chave do Google Maps/Routes/Distance Matrix usada no backend (geocoding, distâncias, rotas)." },
      { key: "VITE_GOOGLE_MAPS_API_KEY", required: false, desc: "Mesma chave exposta ao frontend (mapa interativo). Prefixo VITE_ para ser lida pelo Vite." },
    ],
  },
  {
    title: "Inteligência Artificial",
    icon: BrainCircuit,
    vars: [
      { key: "OPENAI_API_KEY", required: false, desc: "Chave da OpenAI (Consulta Inteligente / análise)." },
      { key: "AI_INTEGRATIONS_OPENAI_API_KEY", required: false, desc: "Chave fornecida pela integração de IA do Replit." },
      { key: "AI_INTEGRATIONS_OPENAI_BASE_URL", required: false, desc: "Base URL da integração de IA do Replit." },
    ],
  },
  {
    title: "E-mail (SMTP)",
    icon: Mail,
    vars: [
      { key: "SMTP_HOST / SMTP_PORT", required: false, desc: "Servidor e porta SMTP para envio de e-mails." },
      { key: "SMTP_USER / SMTP_PASS", required: false, desc: "Credenciais de autenticação SMTP." },
      { key: "SMTP_FROM", required: false, desc: "Endereço remetente padrão." },
    ],
  },
  {
    title: "Assinatura Digital",
    icon: FileSignature,
    vars: [
      { key: "AUTENTIQUE_API_TOKEN", required: false, desc: "Token da API Autentique. Também pode ser armazenado em app_settings.autentique_api_token." },
    ],
  },
  {
    title: "Object Storage",
    icon: HardDrive,
    vars: [
      { key: "PRIVATE_OBJECT_DIR", required: false, desc: "Diretório privado do Object Storage (documentos e fotos)." },
      { key: "PUBLIC_OBJECT_SEARCH_PATHS", required: false, desc: "Caminhos públicos de busca de objetos." },
    ],
  },
];

interface CommandStep {
  cmd: string;
  desc: string;
}

const commandSteps: CommandStep[] = [
  { cmd: "npm run dev", desc: "Desenvolvimento: NODE_ENV=development tsx server/index.ts. Sobe a API Express e o Vite (HMR) na porta 5000. É o comando do botão Run / workflow 'Start application'." },
  { cmd: "npm run db:push", desc: "Sincroniza o schema do Drizzle com o banco (drizzle-kit push). Rode após alterar shared/schema.ts." },
  { cmd: "npm run build", desc: "Produção: tsx script/build.ts — gera o bundle do backend em dist/index.cjs e o build do frontend." },
  { cmd: "npm start", desc: "Produção: NODE_ENV=production node dist/index.cjs — executa o bundle gerado." },
];

const deployFacts: string[] = [
  "Plataforma: Replit (módulos nodejs-20 e postgresql-16; canal Nix stable-25_05).",
  "Comando de execução (.replit): run = \"npm run dev\".",
  "Mapeamento de portas: porta interna 5000 → externa 80.",
  "Deploy: deploymentTarget = autoscale; build = npm run build; run = node ./dist/index.cjs.",
  "Dependências críticas: PostgreSQL com extensão PostGIS habilitada e as variáveis de ambiente da seção 4.",
];

function SectionHeader({
  id,
  icon: Icon,
  title,
  subtitle,
}: {
  id: string;
  icon: typeof Layers;
  title: string;
  subtitle: string;
}) {
  return (
    <div id={id} className="scroll-mt-6">
      <div className="flex items-center gap-2">
        <Icon className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold" data-testid={`heading-${id}`}>
          {title}
        </h2>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
    </div>
  );
}

export default function DocumentacaoPage() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="h-full overflow-auto p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Documentação Técnica e de Sistema
        </h1>
        <p className="text-muted-foreground mt-1">
          Referência técnica do Sistema de Gestão de Entregas — arquitetura, dados, API, configuração e execução.
        </p>
      </div>

      {/* Índice / navegação rápida */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-5 w-5" />
            Índice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                size="sm"
                onClick={() => scrollTo(s.id)}
                data-testid={`button-jump-${s.id}`}
              >
                <s.icon className="h-4 w-4 mr-2" />
                {s.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-12">
        {/* 1. Arquitetura & Stack */}
        <section className="space-y-4">
          <SectionHeader
            id="arquitetura"
            icon={Layers}
            title="1. Arquitetura e Stack Tecnológica"
            subtitle="Monólito full-stack TypeScript: a SPA React é servida pelo próprio Express em um único processo Node, com PostgreSQL/PostGIS para persistência e dados geoespaciais."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {stackLayers.map((layer) => (
              <Card key={layer.title} data-testid={`card-stack-${layer.title}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <layer.icon className="h-5 w-5 text-primary" />
                    {layer.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {layer.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="h-5 w-5 text-primary" />
                Como os componentes se comunicam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {dataFlow.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* 2. Modelagem de Dados */}
        <section className="space-y-4">
          <SectionHeader
            id="modelagem"
            icon={Database}
            title="2. Modelagem de Dados (Banco de Dados)"
            subtitle="PostgreSQL + PostGIS com 52 tabelas gerenciadas pelo Drizzle ORM. Chaves UUID; colunas de check-in/checkout e checkpoints usam geometry(Point, 4326)."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {dataEntities.map((entity) => (
              <Card key={entity.table} data-testid={`card-entity-${entity.table}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{entity.label}</CardTitle>
                  <CardDescription>
                    <code className="text-xs">{entity.table}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{entity.desc}</p>
                  <ul className="space-y-1 text-xs">
                    {entity.fields.map((f) => (
                      <li key={f.name} className="flex flex-wrap items-center gap-1.5">
                        <code className="rounded bg-muted px-1.5 py-0.5">{f.name}</code>
                        <span className="text-muted-foreground">{f.type}</span>
                        {f.note && (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {f.note}
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Relacionamentos principais (chaves estrangeiras)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1.5 text-xs sm:grid-cols-2">
                {relationships.map((rel) => (
                  <li key={rel} className="flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 shrink-0 text-primary" />
                    <code className="text-[11px]">{rel}</code>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* 3. API / Endpoints */}
        <section className="space-y-4">
          <SectionHeader
            id="api"
            icon={Network}
            title="3. Documentação da API / Endpoints"
            subtitle="API REST sob o prefixo /api, formato JSON, autenticação por Bearer token (JWT). A lista completa com body, query e retorno de cada endpoint está em 'Lista de Endpoints'."
          />

          <Card>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-sm">
                <p className="font-medium">Base URL</p>
                <code className="rounded bg-muted px-2 py-1 text-xs">{typeof window !== "undefined" ? window.location.origin : ""}/api</code>
              </div>
              <Link href="/lista-endpoints">
                <Button variant="outline" data-testid="button-open-endpoints">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Lista de Endpoints completa
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-5 w-5 text-primary" />
                Autenticação (/api/auth)
              </CardTitle>
              <CardDescription>
                Fluxo JWT: faça login para obter o access token, envie-o em <code className="text-xs">Authorization: Bearer &lt;token&gt;</code> e use o refresh token para renovar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {authEndpoints.map((ep) => (
                  <div
                    key={ep.path}
                    className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:gap-3"
                    data-testid={`auth-endpoint-${ep.path}`}
                  >
                    <div className="flex shrink-0 items-center gap-2 sm:w-72">
                      <MethodBadge method={ep.method} />
                      <code className="text-xs">{ep.path}</code>
                    </div>
                    <span className="text-xs text-muted-foreground">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Principais grupos de recursos</CardTitle>
              <CardDescription>Endpoints internos (requerem Bearer token, salvo o auto-cadastro público).</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-56">Recurso</TableHead>
                    <TableHead className="w-64">Rota base</TableHead>
                    <TableHead>Operações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiGroups.map((g) => (
                    <TableRow key={g.base} data-testid={`api-group-${g.base}`}>
                      <TableCell className="font-medium">{g.label}</TableCell>
                      <TableCell>
                        <code className="text-xs">{g.base}</code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{g.ops}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* 4. Variáveis de Ambiente */}
        <section className="space-y-4">
          <SectionHeader
            id="ambiente"
            icon={KeyRound}
            title="4. Variáveis de Ambiente e Configuração"
            subtitle="Configure como Secrets do Replit. As variáveis marcadas como obrigatórias são necessárias para o sistema iniciar e autenticar; as demais habilitam recursos específicos."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {envGroups.map((group) => (
              <Card key={group.title} data-testid={`card-env-${group.title}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <group.icon className="h-5 w-5 text-primary" />
                    {group.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.vars.map((v) => (
                    <div key={v.key} className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{v.key}</code>
                        {v.required ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Obrigatória
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            Opcional
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{v.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* 5. Inicialização & Deploy */}
        <section className="space-y-4">
          <SectionHeader
            id="inicializacao"
            icon={Rocket}
            title="5. Guia de Inicialização (Deployment / Execução)"
            subtitle="Como o sistema sobe no ambiente Replit, comandos de build/execução e dependências críticas."
          />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Terminal className="h-5 w-5 text-primary" />
                Comandos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {commandSteps.map((step) => (
                <div key={step.cmd} className="space-y-1" data-testid={`command-${step.cmd}`}>
                  <code className="inline-block rounded bg-muted px-2 py-1 text-xs font-semibold">
                    {step.cmd}
                  </code>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cloud className="h-5 w-5 text-primary" />
                Ambiente Replit & Deploy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {deployFacts.map((fact) => (
                  <li key={fact} className="flex gap-2 text-muted-foreground">
                    <ArrowRight className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
