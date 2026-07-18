import { useState } from "react";
import {
  Truck, Package, Users, MapPin, Shield, Zap, BarChart3,
  ChevronRight, ChevronLeft, CheckCircle2, Star, Clock,
  FileText, Bell, Globe, Lock, TrendingUp, Award,
  ArrowRight, Play, Smartphone, Monitor, Database
} from "lucide-react";

const slides = [
  { id: "cover" },
  { id: "problema" },
  { id: "solucao" },
  { id: "funcionalidades" },
  { id: "modulo-coletas" },
  { id: "modulo-transportes" },
  { id: "modulo-financeiro" },
  { id: "modulo-motoristas" },
  { id: "rastreamento" },
  { id: "portal-cliente" },
  { id: "kpis" },
  { id: "tecnologia" },
  { id: "beneficios" },
  { id: "cta" },
];

function SlideCover() {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-orange-500 blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-orange-400 blur-3xl -translate-x-1/3 translate-y-1/3" />
      </div>
      <div className="relative z-10 flex flex-col h-full px-20 py-16 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">KMC Logistics</span>
        </div>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-1.5 mb-8">
            <Star className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-orange-300 text-sm font-medium">Apresentação Comercial</span>
          </div>
          <h1 className="text-6xl font-black text-white leading-tight mb-6">
            Gestão Inteligente de<br />
            <span className="text-orange-400">Entregas de Veículos</span>
          </h1>
          <p className="text-slate-300 text-xl leading-relaxed max-w-2xl">
            Controle total do ciclo de vida dos veículos — da coleta na montadora
            até a entrega ao cliente final — em uma plataforma única, moderna e segura.
          </p>
        </div>
        <div className="flex items-center gap-8 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-orange-400" />
            <span>100% Web & Mobile</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-orange-400" />
            <span>Implementação Rápida</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-orange-400" />
            <span>Suporte Especializado</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideProblema() {
  const dores = [
    { icon: FileText, title: "Controle Manual", desc: "Planilhas desatualizadas, erros humanos e falta de visibilidade do status dos veículos em tempo real." },
    { icon: Clock, title: "Atrasos Frequentes", desc: "Falta de rastreamento resulta em entregas atrasadas, insatisfação do cliente e perdas financeiras." },
    { icon: Users, title: "Gestão de Motoristas Ineficiente", desc: "Dificuldade em acionar motoristas disponíveis, sem histórico de desempenho ou controle de documentação." },
    { icon: BarChart3, title: "Sem Dados Estratégicos", desc: "Impossível tomar decisões sem indicadores de desempenho (OTD, OTIF, Lead Time) confiáveis." },
  ];
  return (
    <div className="h-full flex flex-col bg-white px-16 py-12">
      <div className="mb-10">
        <span className="text-orange-500 text-sm font-bold uppercase tracking-widest">O Desafio</span>
        <h2 className="text-4xl font-black text-slate-900 mt-2">Por que o modelo atual<br /><span className="text-red-500">não funciona?</span></h2>
      </div>
      <div className="grid grid-cols-2 gap-6 flex-1">
        {dores.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="border border-red-100 rounded-2xl p-6 bg-red-50/50 flex gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-2xl bg-orange-50 border border-orange-200 p-5 flex items-center gap-4">
        <TrendingUp className="h-8 w-8 text-orange-500 shrink-0" />
        <p className="text-slate-700 text-sm font-medium">
          Empresas do setor automotivo perdem em média <strong className="text-orange-600">15–25% da eficiência operacional</strong> por falta de digitalização nos processos de logística.
        </p>
      </div>
    </div>
  );
}

function SlideSolucao() {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 px-16 py-12 relative overflow-hidden">
      <div className="absolute right-0 top-0 h-full w-1/2 opacity-5">
        <div className="w-full h-full bg-gradient-to-l from-orange-400 to-transparent" />
      </div>
      <div className="mb-10 relative z-10">
        <span className="text-orange-400 text-sm font-bold uppercase tracking-widest">A Solução</span>
        <h2 className="text-4xl font-black text-white mt-2">KMC Logistics:<br /><span className="text-orange-400">Uma plataforma, controle total</span></h2>
      </div>
      <div className="grid grid-cols-3 gap-5 flex-1 relative z-10">
        {[
          { icon: Database, title: "Dados Centralizados", desc: "Todas as informações de veículos, motoristas, pátios e clientes em um único sistema.", color: "bg-blue-500" },
          { icon: Globe, title: "Acesso em Qualquer Lugar", desc: "Plataforma web + app mobile para gestores e motoristas, com sincronização em tempo real.", color: "bg-green-500" },
          { icon: BarChart3, title: "Indicadores em Tempo Real", desc: "Dashboard com KPIs como OTD, OTIF e Lead Time para decisões estratégicas rápidas.", color: "bg-purple-500" },
          { icon: Bell, title: "Notificações Automáticas", desc: "Motoristas são notificados por push notification ao surgir uma nova rota disponível.", color: "bg-yellow-500" },
          { icon: Shield, title: "Segurança e Conformidade", desc: "Controle de acesso por perfis, assinatura digital de documentos e conformidade com LGPD.", color: "bg-red-500" },
          { icon: Smartphone, title: "Check-in/Check-out Fotográfico", desc: "Motoristas registram o estado do veículo com fotos no momento da coleta e entrega.", color: "bg-orange-500" },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-3 hover:bg-white/10 transition-colors">
            <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">{title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideFuncionalidades() {
  const modulos = [
    { icon: Package, label: "Coletas", color: "bg-blue-500", desc: "Coleta nas montadoras e transferência entre pátios" },
    { icon: Truck, label: "Transportes", color: "bg-orange-500", desc: "Despacho do pátio até a entrega ao cliente final" },
    { icon: Users, label: "Motoristas", color: "bg-green-500", desc: "Cadastro, documentação, avaliação e ranking" },
    { icon: MapPin, label: "Rastreamento", color: "bg-purple-500", desc: "Tráfego em tempo real com mapa interativo" },
    { icon: BarChart3, label: "Financeiro", color: "bg-yellow-500", desc: "Tabelas de frete, prestação de contas e fechamento" },
    { icon: Globe, label: "Portal do Cliente", color: "bg-teal-500", desc: "Acesso do cliente ao estoque e jornada do veículo" },
    { icon: FileText, label: "Relatórios", color: "bg-red-500", desc: "Avarias, jornada do veículo e indicadores de desempenho" },
    { icon: Bell, label: "Notificações", color: "bg-indigo-500", desc: "Push para motoristas com filtro geográfico" },
  ];
  return (
    <div className="h-full flex flex-col bg-white px-16 py-12">
      <div className="mb-10">
        <span className="text-orange-500 text-sm font-bold uppercase tracking-widest">Módulos</span>
        <h2 className="text-4xl font-black text-slate-900 mt-2">Tudo que você precisa,<br /><span className="text-orange-500">em um só lugar</span></h2>
      </div>
      <div className="grid grid-cols-4 gap-4 flex-1">
        {modulos.map(({ icon: Icon, label, color, desc }) => (
          <div key={label} className="rounded-2xl border border-slate-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{label}</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideModuloColetas() {
  return (
    <div className="h-full flex bg-white overflow-hidden">
      <div className="w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-12 flex flex-col justify-between">
        <div>
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-6">
            <Package className="h-6 w-6 text-white" />
          </div>
          <span className="text-blue-200 text-sm font-bold uppercase tracking-widest">Módulo</span>
          <h2 className="text-4xl font-black text-white mt-2 leading-tight">Coletas e<br />Transferências</h2>
          <p className="text-blue-200 mt-4 leading-relaxed">Controle completo desde a saída da montadora até a chegada ao pátio, com check-in/check-out fotográfico.</p>
        </div>
        <div className="space-y-3">
          {["Registro de coletas com chassi do veículo", "Fotos: dianteira, lateral, traseira, painel, odômetro", "Assinatura e aprovação no checkout pelo porteiro", "Transferências entre pátios rastreadas"].map(f => (
            <div key={f} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-blue-300 shrink-0" />
              <span className="text-blue-100 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="w-1/2 p-12 flex flex-col justify-center gap-6">
        <h3 className="text-slate-700 font-bold text-lg">Fluxo da Coleta</h3>
        {[
          { n: "01", t: "Criação da Coleta", d: "Operador registra chassi, motorista e pátio de destino" },
          { n: "02", t: "Check-in na Montadora", d: "Motorista fotografa o veículo e registra a localização GPS" },
          { n: "03", t: "Transporte", d: "Status 'Em Trânsito' com rastreamento em tempo real" },
          { n: "04", t: "Check-out no Pátio", d: "Porteiro aprova a entrada com fotos e assinatura digital" },
          { n: "05", t: "Estoque Atualizado", d: "Veículo entra automaticamente no estoque do pátio" },
        ].map(({ n, t, d }) => (
          <div key={n} className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">{n}</div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{t}</p>
              <p className="text-slate-500 text-xs mt-0.5">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideModuloTransportes() {
  return (
    <div className="h-full flex bg-white overflow-hidden">
      <div className="w-1/2 bg-gradient-to-br from-orange-500 to-orange-700 p-12 flex flex-col justify-between">
        <div>
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-6">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <span className="text-orange-200 text-sm font-bold uppercase tracking-widest">Módulo</span>
          <h2 className="text-4xl font-black text-white mt-2 leading-tight">Gestão de<br />Transportes</h2>
          <p className="text-orange-100 mt-4 leading-relaxed">Gerencie todas as solicitações de entrega de veículos com numeração automática e rastreamento de status.</p>
        </div>
        <div className="space-y-3">
          {["Numeração automática (KMC00001, KMC00002...)", "Status em tempo real: aguardando, em trânsito, entregue", "Atribuição de motorista com aceitação pelo app", "Documentos e fotos anexados ao transporte"].map(f => (
            <div key={f} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-orange-300 shrink-0" />
              <span className="text-orange-100 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="w-1/2 p-12 flex flex-col justify-center">
        <h3 className="text-slate-700 font-bold text-lg mb-6">Status do Transporte</h3>
        <div className="space-y-3">
          {[
            { s: "Pendente", c: "bg-slate-100 text-slate-600 border-slate-200", d: "Aguardando atribuição de motorista" },
            { s: "Pend. Aprovação", c: "bg-yellow-50 text-yellow-700 border-yellow-200", d: "Gestor valida o transporte" },
            { s: "Aguardando Saída", c: "bg-blue-50 text-blue-700 border-blue-200", d: "Motorista confirmado, saída agendada" },
            { s: "Em Trânsito", c: "bg-orange-50 text-orange-700 border-orange-200", d: "Veículo a caminho do destino" },
            { s: "Entregue", c: "bg-green-50 text-green-700 border-green-200", d: "Veículo entregue com sucesso ao cliente" },
          ].map(({ s, c, d }) => (
            <div key={s} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${c}`}>
              <span className="font-semibold text-sm w-40 shrink-0">{s}</span>
              <span className="text-xs opacity-80">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideModuloFinanceiro() {
  return (
    <div className="h-full flex flex-col bg-white px-16 py-12">
      <div className="mb-8">
        <span className="text-orange-500 text-sm font-bold uppercase tracking-widest">Módulo Financeiro</span>
        <h2 className="text-4xl font-black text-slate-900 mt-2">Controle Financeiro<br /><span className="text-orange-500">Completo e Rastreável</span></h2>
      </div>
      <div className="grid grid-cols-3 gap-6 flex-1">
        {[
          { icon: FileText, title: "Tabelas de Frete", color: "bg-blue-500", items: ["Tarifas por km, fixo ou por veículo", "Aprovação de tarifas pelo gestor", "Histórico de mudanças de preço", "Vinculação por rota e tipo de veículo"] },
          { icon: Award, title: "Prestação de Contas", color: "bg-green-500", items: ["Registro de despesas por motorista", "Comprovantes fotográficos", "Aprovação e assinatura digital", "PDF gerado automaticamente"] },
          { icon: BarChart3, title: "Fechamento Mensal", color: "bg-purple-500", items: ["Resumo de transportes por período", "Custo por rota e por motorista", "Exportação para Excel/PDF", "Controle de faturas do cliente"] },
        ].map(({ icon: Icon, title, color, items }) => (
          <div key={title} className="border border-slate-100 rounded-2xl p-6 flex flex-col gap-4">
            <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  <span className="text-slate-600 text-xs leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideModuloMotoristas() {
  return (
    <div className="h-full flex flex-col bg-white px-16 py-12">
      <div className="mb-8">
        <span className="text-orange-500 text-sm font-bold uppercase tracking-widest">Módulo</span>
        <h2 className="text-4xl font-black text-slate-900 mt-2">Gestão Completa<br /><span className="text-orange-500">de Motoristas</span></h2>
      </div>
      <div className="grid grid-cols-2 gap-8 flex-1">
        <div className="space-y-4">
          {[
            { t: "Cadastro Completo", d: "CPF, CNH, tipo de contrato (PJ/CLT/Agregado), endereço e fotos de documentos" },
            { t: "Aprovação de Documentos", d: "Fluxo de aprovação com status: pendente → aprovado → apto" },
            { t: "Sistema de Avaliação", d: "Critérios configuráveis com pesos por gravidade (leve, médio, grave)" },
            { t: "Ranking de Desempenho", d: "Classificação dos motoristas por pontuação de avaliações" },
            { t: "Contratos Digitais", d: "Editor de contratos com envio por e-mail e assinatura digital" },
          ].map(({ t, d }) => (
            <div key={t} className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{t}</p>
                <p className="text-slate-500 text-xs mt-0.5">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-4 w-4 text-orange-400" />
              <span className="font-bold text-sm">Notificação Push</span>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <p>🔔 <strong className="text-white">Nova rota disponível!</strong></p>
              <p>São Paulo → Campinas</p>
              <p>Distância: 98 km · 1 veículo</p>
              <p>Saída: amanhã às 08:00</p>
            </div>
            <div className="flex gap-2 mt-4">
              <div className="flex-1 bg-green-500 rounded-lg py-2 text-center text-xs font-bold">Aceitar</div>
              <div className="flex-1 bg-slate-700 rounded-lg py-2 text-center text-xs text-slate-400">Recusar</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 p-5">
            <p className="font-bold text-slate-900 text-sm mb-3">Filtro Geográfico de Motoristas</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Envie notificações apenas para motoristas dentro de um raio configurável ao redor da origem da rota. 
              Maximiza as chances de resposta rápida e reduz custos de deslocamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideRastreamento() {
  return (
    <div className="h-full flex flex-col bg-slate-950 px-16 py-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #f97316 0%, transparent 70%)" }} />
      <div className="relative z-10 mb-10">
        <span className="text-orange-400 text-sm font-bold uppercase tracking-widest">Tráfego em Tempo Real</span>
        <h2 className="text-4xl font-black text-white mt-2">Visibilidade Total<br /><span className="text-orange-400">de Toda a Operação</span></h2>
      </div>
      <div className="relative z-10 grid grid-cols-3 gap-6 flex-1">
        <div className="col-span-2 rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold">Mapa de Operações</span>
            <div className="flex gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs">Ao Vivo</span>
            </div>
          </div>
          <div className="flex-1 rounded-xl bg-slate-800 relative overflow-hidden" style={{ minHeight: 200 }}>
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            {[
              { x: "20%", y: "40%", label: "Montadora A", color: "bg-blue-400" },
              { x: "50%", y: "30%", label: "Pátio SP", color: "bg-orange-400" },
              { x: "75%", y: "55%", label: "Cliente", color: "bg-green-400" },
            ].map(({ x, y, label, color }) => (
              <div key={label} className="absolute" style={{ left: x, top: y }}>
                <div className={`h-4 w-4 rounded-full ${color} border-2 border-white shadow-lg`} />
                <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded">{label}</div>
              </div>
            ))}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-5 w-5 rounded-full bg-yellow-400 border-2 border-white animate-pulse" />
              <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded">🚛 Em Trânsito</div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { label: "Transportes Ativos", value: "24", color: "text-orange-400" },
            { label: "Coletas em Andamento", value: "8", color: "text-blue-400" },
            { label: "Veículos no Pátio", value: "137", color: "text-green-400" },
            { label: "Entregas Hoje", value: "12", color: "text-purple-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-white/5 border border-white/10 p-4">
              <p className="text-slate-400 text-xs mb-1">{label}</p>
              <p className={`text-3xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlidePortalCliente() {
  return (
    <div className="h-full flex bg-white overflow-hidden">
      <div className="w-1/2 bg-gradient-to-br from-teal-600 to-teal-800 p-12 flex flex-col justify-between">
        <div>
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-6">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <span className="text-teal-200 text-sm font-bold uppercase tracking-widest">Portal do Cliente</span>
          <h2 className="text-4xl font-black text-white mt-2 leading-tight">Acesso Exclusivo<br />para Clientes</h2>
          <p className="text-teal-100 mt-4 leading-relaxed">Seus clientes acompanham o estoque, histórico de entregas e solicitam transportes diretamente pelo portal.</p>
        </div>
        <div className="space-y-3">
          {["Consulta de estoque em tempo real", "Jornada completa do chassi (histórico)", "Solicitação de transporte de veículos", "Acompanhamento do status de coletas"].map(f => (
            <div key={f} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-teal-300 shrink-0" />
              <span className="text-teal-100 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="w-1/2 p-12 flex flex-col justify-center gap-5">
        <h3 className="text-slate-700 font-bold">O cliente visualiza:</h3>
        <div className="space-y-3">
          {[
            { icon: Package, t: "Estoque Atual", d: "Lista de veículos com chassi, status e data de entrada", c: "bg-teal-50 border-teal-200" },
            { icon: MapPin, t: "Coletas em Andamento", d: "Veículos sendo coletados para o cliente", c: "bg-blue-50 border-blue-200" },
            { icon: Truck, t: "Transportes", d: "Solicitações de entrega e seus status", c: "bg-orange-50 border-orange-200" },
            { icon: FileText, t: "Jornada do Veículo", d: "Histórico completo por chassi com fotos", c: "bg-green-50 border-green-200" },
          ].map(({ icon: Icon, t, d, c }) => (
            <div key={t} className={`border rounded-xl p-4 flex gap-3 ${c}`}>
              <Icon className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 text-sm">{t}</p>
                <p className="text-slate-500 text-xs">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideKPIs() {
  return (
    <div className="h-full flex flex-col bg-white px-16 py-12">
      <div className="mb-8">
        <span className="text-orange-500 text-sm font-bold uppercase tracking-widest">Indicadores</span>
        <h2 className="text-4xl font-black text-slate-900 mt-2">Decisões Baseadas<br /><span className="text-orange-500">em Dados Reais</span></h2>
      </div>
      <div className="grid grid-cols-4 gap-5 mb-6">
        {[
          { kpi: "OTD", full: "On Time Delivery", value: "94.2%", trend: "+2.1%", color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { kpi: "OTIF", full: "On Time In Full", value: "91.8%", trend: "+1.5%", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { kpi: "Lead Time", full: "Tempo Médio", value: "2.3 dias", trend: "-0.4d", color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
          { kpi: "Avarias", full: "Sem Avarias", value: "97.6%", trend: "+0.8%", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
        ].map(({ kpi, full, value, trend, color, bg }) => (
          <div key={kpi} className={`border rounded-2xl p-5 ${bg}`}>
            <p className="text-slate-500 text-xs mb-1">{full}</p>
            <p className={`font-black text-sm ${color}`}>{kpi}</p>
            <p className={`text-3xl font-black ${color} my-2`}>{value}</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-600 text-xs font-medium">{trend} este mês</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-5 flex-1">
        <div className="border border-slate-100 rounded-2xl p-5">
          <p className="font-bold text-slate-900 mb-4 text-sm">Entregas por Mês</p>
          <div className="flex items-end gap-2 h-20">
            {[45, 62, 58, 71, 80, 76, 92].map((v, i) => (
              <div key={i} className="flex-1 rounded-t-sm bg-orange-400 opacity-70 hover:opacity-100 transition-opacity" style={{ height: `${(v / 92) * 100}%` }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {["Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map(m => (
              <span key={m} className="text-[9px] text-slate-400">{m}</span>
            ))}
          </div>
        </div>
        <div className="border border-slate-100 rounded-2xl p-5">
          <p className="font-bold text-slate-900 mb-4 text-sm">Outros Indicadores</p>
          <div className="space-y-3">
            {[
              { label: "Motoristas Ativos", value: "38 motoristas", w: "70%" },
              { label: "Pátios Cadastrados", value: "5 pátios", w: "45%" },
              { label: "Clientes Ativos", value: "12 clientes", w: "55%" },
              { label: "Veículos Este Mês", value: "92 veículos", w: "90%" },
            ].map(({ label, value, w }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900">{value}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full">
                  <div className="h-1.5 bg-orange-400 rounded-full" style={{ width: w }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideTecnologia() {
  return (
    <div className="h-full flex flex-col bg-slate-900 px-16 py-12">
      <div className="mb-10">
        <span className="text-orange-400 text-sm font-bold uppercase tracking-widest">Infraestrutura</span>
        <h2 className="text-4xl font-black text-white mt-2">Tecnologia Moderna<br /><span className="text-orange-400">e Escalável</span></h2>
      </div>
      <div className="grid grid-cols-3 gap-6 flex-1">
        {[
          { title: "Frontend", icon: Monitor, color: "bg-blue-500", items: ["React + TypeScript", "Design responsivo (mobile-first)", "Tailwind CSS + Shadcn/UI", "Mapas interativos Google Maps"] },
          { title: "Backend", icon: Database, color: "bg-green-500", items: ["Node.js + Express", "Banco PostgreSQL + PostGIS", "Autenticação JWT segura", "API RESTful documentada"] },
          { title: "Integrações", icon: Globe, color: "bg-purple-500", items: ["Firebase — Push Notifications", "Google Maps — Rotas e distâncias", "Autentique — Assinatura digital", "SMTP — Envio de e-mails"] },
          { title: "Segurança", icon: Lock, color: "bg-red-500", items: ["Controle de acesso por perfis", "Tokens JWT com rotação", "LGPD — Exclusão de dados", "Logs de auditoria completos"] },
          { title: "Mobile", icon: Smartphone, color: "bg-yellow-500", items: ["App nativo para motoristas", "Check-in/out fotográfico", "Notificações push em tempo real", "Funcionamento offline parcial"] },
          { title: "Armazenamento", icon: Shield, color: "bg-teal-500", items: ["Fotos na nuvem escalável", "Backup automático diário", "Restauração seletiva por módulo", "Exportação de dados completa"] },
        ].map(({ title, icon: Icon, color, items }) => (
          <div key={title} className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">{title}</span>
            </div>
            <div className="space-y-1.5">
              {items.map(item => (
                <div key={item} className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-slate-500 shrink-0" />
                  <span className="text-slate-400 text-xs">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideBeneficios() {
  return (
    <div className="h-full flex flex-col bg-white px-16 py-12">
      <div className="mb-10">
        <span className="text-orange-500 text-sm font-bold uppercase tracking-widest">Por que KMC Logistics?</span>
        <h2 className="text-4xl font-black text-slate-900 mt-2">Resultados Reais<br /><span className="text-orange-500">para o Seu Negócio</span></h2>
      </div>
      <div className="grid grid-cols-3 gap-6 flex-1">
        {[
          { icon: TrendingUp, n: "↑ 30%", label: "Mais eficiência operacional", desc: "Redução de tempo gasto em controles manuais e retrabalho.", color: "bg-green-500" },
          { icon: Clock, n: "↓ 40%", label: "Menos atrasos de entrega", desc: "Rastreamento em tempo real e notificações automáticas evitam gargalos.", color: "bg-blue-500" },
          { icon: Shield, n: "↓ 25%", label: "Menos avarias não registradas", desc: "Check-in/out fotográfico cria evidências irrefutáveis do estado do veículo.", color: "bg-purple-500" },
          { icon: BarChart3, n: "100%", label: "Visibilidade da operação", desc: "Todos os dados disponíveis em dashboards e relatórios exportáveis.", color: "bg-orange-500" },
          { icon: FileText, n: "Zero", label: "Papelada física", desc: "Contratos, prestação de contas e aprovações 100% digitais.", color: "bg-teal-500" },
          { icon: Star, n: "+NPS", label: "Satisfação do cliente", desc: "Portal do cliente e rastreabilidade total aumentam a confiança.", color: "bg-yellow-500" },
        ].map(({ icon: Icon, n, label, desc, color }) => (
          <div key={label} className="border border-slate-100 rounded-2xl p-6 flex flex-col gap-3">
            <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="text-3xl font-black text-slate-900">{n}</div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{label}</p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideCTA() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 px-16 py-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-orange-900 blur-3xl -translate-x-1/3 translate-y-1/3" />
      </div>
      <div className="relative z-10 text-center max-w-3xl">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <span className="text-white font-bold text-2xl">KMC Logistics</span>
        </div>
        <h2 className="text-5xl font-black text-white mb-6">Pronto para transformar<br />sua operação?</h2>
        <p className="text-orange-100 text-xl mb-10 leading-relaxed">
          Implemente o sistema completo de gestão de entregas de veículos e tenha controle total da sua logística.
        </p>
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            <div className="bg-white rounded-2xl px-8 py-4 flex items-center gap-2">
              <Play className="h-5 w-5 text-orange-600" />
              <span className="font-bold text-orange-600">Solicitar Demonstração</span>
            </div>
            <div className="border-2 border-white/50 rounded-2xl px-8 py-4 flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-white" />
              <span className="font-bold text-white">Falar com Consultor</span>
            </div>
          </div>
          <p className="text-orange-100 text-sm mt-2">
            Implementação rápida · Treinamento incluso · Suporte dedicado
          </p>
        </div>
      </div>
    </div>
  );
}

const slideComponents: Record<string, () => JSX.Element> = {
  cover: SlideCover,
  problema: SlideProblema,
  solucao: SlideSolucao,
  funcionalidades: SlideFuncionalidades,
  "modulo-coletas": SlideModuloColetas,
  "modulo-transportes": SlideModuloTransportes,
  "modulo-financeiro": SlideModuloFinanceiro,
  "modulo-motoristas": SlideModuloMotoristas,
  rastreamento: SlideRastreamento,
  "portal-cliente": SlidePortalCliente,
  kpis: SlideKPIs,
  tecnologia: SlideTecnologia,
  beneficios: SlideBeneficios,
  cta: SlideCTA,
};

const slideLabels: Record<string, string> = {
  cover: "Capa",
  problema: "O Problema",
  solucao: "A Solução",
  funcionalidades: "Módulos",
  "modulo-coletas": "Coletas",
  "modulo-transportes": "Transportes",
  "modulo-financeiro": "Financeiro",
  "modulo-motoristas": "Motoristas",
  rastreamento: "Rastreamento",
  "portal-cliente": "Portal Cliente",
  kpis: "Indicadores",
  tecnologia: "Tecnologia",
  beneficios: "Benefícios",
  cta: "Próximos Passos",
};

export function Apresentacao() {
  const [current, setCurrent] = useState(0);

  const goTo = (index: number) => {
    if (index >= 0 && index < slides.length) setCurrent(index);
  };

  const SlideComponent = slideComponents[slides[current].id];

  return (
    <div className="min-h-screen bg-slate-800 flex flex-col items-center justify-center p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Slide container — 16:9 */}
      <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
        <SlideComponent />
        {/* Navigation arrows */}
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 flex items-center justify-center text-white disabled:opacity-0 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => goTo(current + 1)}
          disabled={current === slides.length - 1}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 flex items-center justify-center text-white disabled:opacity-0 transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {/* Slide number */}
        <div className="absolute bottom-3 right-4 text-white/50 text-xs">
          {current + 1} / {slides.length}
        </div>
      </div>

      {/* Thumbnail navigation */}
      <div className="mt-4 flex gap-1.5 flex-wrap justify-center max-w-5xl">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => goTo(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              i === current
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
            }`}
          >
            {slideLabels[slide.id]}
          </button>
        ))}
      </div>
    </div>
  );
}
