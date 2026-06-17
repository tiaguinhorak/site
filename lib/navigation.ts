export const marketingNav = [
  { label: "Modos", href: "/modos" },
  { label: "Plataforma", href: "/plataforma" },
  { label: "Servidores", href: "/servidores" },
  { label: "Ranking", href: "/ranking" },
  { label: "Premium", href: "/premium" },
] as const;

export const marketingPages = [
  {
    href: "/modos",
    label: "Modos de jogo",
    title: "Para cada estilo, o modo certo",
    description:
      "Retakes, Deathmatch, ForFun e Movimentação. Escolha como treinar e evolua a cada round.",
    eyebrow: "Modos de jogo",
  },
  {
    href: "/plataforma",
    label: "Plataforma",
    title: "Tudo para evoluir no CS2",
    description:
      "Ranking com ELO, inventário de skins, perfil público, Quick Connect e benefícios Premium.",
    eyebrow: "Plataforma completa",
  },
  {
    href: "/servidores",
    label: "Servidores",
    title: "Alta performance no Brasil",
    description:
      "65 servidores em São Paulo com links dedicados de 10 Gbps e 18ms de ping médio.",
    eyebrow: "Infraestrutura",
  },
  {
    href: "/ranking",
    label: "Ranking",
    title: "Os melhores da temporada",
    description:
      "Ranking global com ELO, K/D e estatísticas detalhadas. Season 8 em andamento.",
    eyebrow: "Season 8",
  },
  {
    href: "/premium",
    label: "Premium",
    title: "Eleve sua experiência",
    description:
      "Slot reservado, skins liberadas, tag exclusiva e prioridade nos servidores.",
    eyebrow: "Planos",
  },
  {
    href: "/anticheat",
    label: "Anticheat",
    title: "Partidas justas, sem trapaça",
    description:
      "Anticheat oficial, leve e compatível com VAC. Obrigatório no modo competitivo.",
    eyebrow: "Segurança",
  },
] as const;

export const dashboardNav = [
  {
    label: "Visão geral",
    href: "/dashboard",
    icon: "LayoutDashboard",
    title: "Dashboard",
    description: "Resumo da sua conta e acesso rápido.",
  },
  {
    label: "Modos de jogo",
    href: "/dashboard/modos",
    icon: "Gamepad2",
    title: "Modos de jogo",
    description: "Escolha um modo e conecte ao melhor servidor.",
  },
  {
    label: "Perfil",
    href: "/dashboard/perfil",
    icon: "UserRound",
    title: "Perfil",
    description: "Suas estatísticas, plano e configurações.",
  },
  {
    label: "Notificações",
    href: "/dashboard/notificacoes",
    icon: "Bell",
    title: "Notificações",
    description: "Atualizações, partidas e alertas da conta.",
  },
  {
    label: "Notícias",
    href: "/dashboard/noticias",
    icon: "Newspaper",
    title: "Central de notícias",
    description: "Patches, eventos e novidades da rede.",
  },
  {
    label: "Loja",
    href: "/dashboard/loja",
    icon: "ShoppingBag",
    title: "Loja",
    description: "Skins, agentes e cosméticos exclusivos.",
  },
  {
    label: "Inventário",
    href: "/dashboard/inventario",
    icon: "Package",
    title: "Inventário",
    description: "Suas skins, facas, luvas e agentes equipados.",
  },
  {
    label: "Anticheat",
    href: "/dashboard/anticheat",
    icon: "ShieldCheck",
    title: "Anticheat",
    description: "Download e status da proteção.",
  },
  {
    label: "Premium",
    href: "/dashboard/premium",
    icon: "Crown",
    title: "Premium",
    description: "Upgrade de plano e benefícios.",
  },
  {
    label: "Suporte",
    href: "/dashboard/suporte",
    icon: "Headphones",
    title: "Suporte",
    description: "Canais de ajuda e atendimento.",
  },
] as const;

export type DashboardNavIcon = typeof dashboardNav[number]["icon"];

export function getDashboardPageMeta(pathname: string) {
  const item = dashboardNav.find((n) => pathname === n.href);
  return item ?? dashboardNav[0];
}

export const adminNav = [
  {
    label: "Overview",
    href: "/admin",
    icon: "LayoutDashboard",
    title: "Admin",
    description: "Métricas, saúde da plataforma e atividade recente.",
  },
  {
    label: "Usuários",
    href: "/admin/usuarios",
    icon: "Users",
    title: "Usuários",
    description: "Gerenciar contas, editar dados e aplicar punições.",
  },
  {
    label: "Punições",
    href: "/admin/punicoes",
    icon: "Gavel",
    title: "Punições",
    description: "Banimentos, advertências e histórico de moderação.",
  },
  {
    label: "Notificações",
    href: "/admin/notificacoes",
    icon: "Bell",
    title: "Notificações",
    description: "Enviar alertas individuais ou broadcast para todos.",
  },
  {
    label: "Servidores",
    href: "/admin/servidores",
    icon: "Server",
    title: "Servidores",
    description: "CRUD de servidores públicos exibidos na plataforma.",
  },
  {
    label: "Notícias",
    href: "/admin/noticias",
    icon: "Newspaper",
    title: "Notícias",
    description: "Gerenciar artigos da central de notícias.",
  },
  {
    label: "Loja",
    href: "/admin/loja",
    icon: "ShoppingBag",
    title: "Loja",
    description: "Itens, preços e destaques da loja virtual.",
  },
  {
    label: "Modos",
    href: "/admin/modos",
    icon: "Gamepad2",
    title: "Modos de jogo",
    description: "Modos e salas exibidos no dashboard.",
  },
  {
    label: "Auditoria",
    href: "/admin/auditoria",
    icon: "ScrollText",
    title: "Auditoria",
    description: "Log de ações administrativas para rastreabilidade.",
  },
] as const;
