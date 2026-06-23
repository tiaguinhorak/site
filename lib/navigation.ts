export const marketingNav = [
  { label: "Modos", href: "/modos", i18nKey: "modes" },
  { label: "Plataforma", href: "/plataforma", i18nKey: "platform" },
  { label: "Servidores", href: "/servidores", i18nKey: "servers" },
  { label: "Ranking", href: "/ranking", i18nKey: "ranking" },
  { label: "Premium", href: "/premium", i18nKey: "premium" },
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
      "Anticheat oficial, leve e compatível com VAC. Obrigatório apenas no modo rankeado.",
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
    i18nKey: "overview",
  },
  {
    label: "Jogar",
    href: "/dashboard/lobby",
    icon: "Gamepad2",
    title: "Jogar",
    description: "Escolha entre o warmup casual e o modo rankeado.",
    i18nKey: "play",
    children: [
      {
        label: "Lobby",
        href: "/dashboard/lobby",
        icon: "Users",
        title: "Lobby",
        description: "Warmup casual em salas abertas gerenciadas pelo sistema.",
        i18nKey: "lobby",
      },
      {
        label: "Rankeado",
        href: "/dashboard/ranked",
        icon: "Trophy",
        title: "Modo rankeado",
        description: "Monte seu time 5x5, desafie outros times e suba de ELO (Premium/Elite).",
        i18nKey: "ranked",
      },
    ],
  },
  {
    label: "Perfil",
    href: "/dashboard/perfil",
    icon: "UserRound",
    title: "Perfil",
    description: "Suas estatísticas, plano e configurações.",
    i18nKey: "profile",
  },
  {
    label: "Notificações",
    href: "/dashboard/notificacoes",
    icon: "Bell",
    title: "Notificações",
    description: "Atualizações, partidas e alertas da conta.",
    i18nKey: "notifications",
  },
  {
    label: "Notícias",
    href: "/dashboard/noticias",
    icon: "Newspaper",
    title: "Central de notícias",
    description: "Patches, eventos e novidades da rede.",
    i18nKey: "news",
  },
  {
    label: "Loja",
    href: "/dashboard/loja",
    icon: "ShoppingBag",
    title: "Loja",
    description: "Skins, agentes e cosméticos exclusivos.",
    i18nKey: "store",
  },
  {
    label: "Inventário",
    href: "/dashboard/inventario",
    icon: "Package",
    title: "Inventário",
    description: "Suas skins, facas, luvas e agentes equipados.",
    i18nKey: "inventory",
  },
  {
    label: "Anticheat",
    href: "/dashboard/anticheat",
    icon: "ShieldCheck",
    title: "Anticheat",
    description: "Download e status — obrigatório apenas no modo rankeado.",
    i18nKey: "anticheat",
  },
  {
    label: "Premium",
    href: "/dashboard/premium",
    icon: "Crown",
    title: "Premium",
    description: "Upgrade de plano e benefícios.",
    i18nKey: "premium",
  },
  {
    label: "Suporte",
    href: "/dashboard/suporte",
    icon: "Headphones",
    title: "Suporte",
    description: "Canais de ajuda e atendimento.",
    i18nKey: "support",
  },
] as const;

export type DashboardNavChild = {
  label: string;
  href: string;
  icon: string;
  title: string;
  description: string;
  i18nKey: string;
};

export type DashboardNavItem = DashboardNavChild & {
  children?: readonly DashboardNavChild[];
};

export function getDashboardPageMeta(pathname: string): DashboardNavChild {
  for (const item of dashboardNav as readonly DashboardNavItem[]) {
    if (pathname === item.href && !item.children) return item;
    const child = item.children?.find((c) => pathname === c.href);
    if (child) return child;
  }
  const direct = (dashboardNav as readonly DashboardNavItem[]).find(
    (n) => pathname === n.href,
  );
  return direct ?? dashboardNav[0];
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
    label: "Skins CS:GO",
    href: "/admin/skins",
    icon: "Sparkles",
    title: "Catálogo de skins",
    description: "Adicionar paintkits, imagens (CSGO-API) e controlar o inventário.",
  },
  {
    label: "Infra CS:GO",
    href: "/admin/infra-csgo",
    icon: "CloudCog",
    title: "Infra CS:GO",
    description: "Subir, derrubar servidores e cancelar partidas de teste na VPS.",
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

export type AdminNavItem = {
  label: string;
  href: string;
  icon: string;
  title: string;
  description: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  icon: string;
  items: AdminNavItem[];
};

export const adminOverview: AdminNavItem = adminNav[0];

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "community",
    label: "Comunidade",
    icon: "Users",
    items: [adminNav[1], adminNav[2], adminNav[3]],
  },
  {
    id: "content",
    label: "Conteúdo",
    icon: "Newspaper",
    items: [adminNav[7], adminNav[8], adminNav[9]],
  },
  {
    id: "infra",
    label: "Infra",
    icon: "Server",
    items: [adminNav[4], adminNav[5], adminNav[6]],
  },
  {
    id: "system",
    label: "Sistema",
    icon: "ScrollText",
    items: [adminNav[10]],
  },
];

export function getAdminPageMeta(pathname: string): AdminNavItem {
  const direct = adminNav.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return direct ?? adminOverview;
}
