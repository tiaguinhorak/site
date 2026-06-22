import "dotenv/config";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth/password";

async function main() {
  await prisma.notification.deleteMany();
  await prisma.csgoPlayerSkin.deleteMany();
  await prisma.userInventoryItem.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.csgoSkinCatalog.deleteMany();
  await prisma.gameModeRoom.deleteMany();
  await prisma.gameMode.deleteMany();
  await prisma.newsArticle.deleteMany();
  await prisma.storeItem.deleteMany();
  await prisma.publicServer.deleteMany();
  await prisma.leaderboardEntry.deleteMany();
  await prisma.marketingFeature.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.siteStat.deleteMany();
  await prisma.user.deleteMany();

  const demoPassword = await hashPassword("Test1234!");

  const henry = await prisma.user.create({
    data: {
      email: "admin@clutchclube.com",
      passwordHash: demoPassword,
      nickname: "ADMIN",
      firstName: "Admin",
      lastName: "Admin",
      phone: "+55 (11) 98765-4321",
      country: "BR",
      bio: "Administrador do sistema.",
      plan: "FREE",
      isAdmin: true,
    },
  });

  const notifications = [
    { title: "Season 8 em andamento", body: "O ranking global foi resetado.", type: "SYSTEM" as const },
    { title: "Servidor RIFLE #08 lotado", body: "Slot reservado Premium disponível.", type: "PROMO" as const },
    { title: "Zk1 te desafiou", body: "Duelo 1v1 em de_mirage.", type: "SOCIAL" as const, read: true },
    { title: "Partida ranqueada concluída", body: "Você ganhou +24 ELO.", type: "MATCH" as const, read: true },
    { title: "Anticheat desatualizado", body: "Versão 3.2.1 disponível.", type: "SYSTEM" as const },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: { userId: henry.id, ...n },
    });
  }

  const gameModes = [
    {
      slug: "retakes",
      name: "Retakes",
      accent: "from-violet-500 to-fuchsia-500",
      tagline: "Decisão sob pressão",
      description: "Situações reais de pós-plant.",
      iconKey: "Crosshair",
      sortOrder: 0,
      rooms: [
        { name: "RIFLE #08", map: "de_mirage", players: 9, slots: 10, ping: 12 },
        { name: "RIFLE #02", map: "de_inferno", players: 6, slots: 10, ping: 13 },
        { name: "RIFLE #05", map: "de_nuke", players: 10, slots: 10, ping: 11 },
      ],
    },
    {
      slug: "deathmatch",
      name: "Deathmatch",
      accent: "from-purple-500 to-violet-600",
      tagline: "Mira sem pausa",
      description: "Respawn instantâneo e combate contínuo.",
      iconKey: "Swords",
      sortOrder: 1,
      rooms: [
        { name: "RIFLE #01", map: "de_mirage", players: 14, slots: 16, ping: 15 },
        { name: "AWP #01", map: "awp_lego", players: 11, slots: 16, ping: 17 },
        { name: "PISTOL #02", map: "de_dust2", players: 8, slots: 16, ping: 14 },
      ],
    },
    {
      slug: "forfun",
      name: "ForFun",
      accent: "from-fuchsia-500 to-purple-500",
      tagline: "Do seu jeito",
      description: "Modos descontraídos com a comunidade.",
      iconKey: "PartyPopper",
      sortOrder: 2,
      rooms: [
        { name: "PODERES #01", map: "de_inferno", players: 20, slots: 24, ping: 18 },
        { name: "ZOEIRA #03", map: "de_mirage", players: 15, slots: 24, ping: 16 },
      ],
    },
    {
      slug: "duels",
      name: "Duels",
      accent: "from-indigo-500 to-violet-500",
      tagline: "1v1",
      description: "Duelos rápidos.",
      iconKey: "Crosshair",
      sortOrder: 3,
      rooms: [
        { name: "DUELS #03", map: "de_nuke", players: 8, slots: 10, ping: 14 },
        { name: "DUELS #01", map: "de_mirage", players: 4, slots: 10, ping: 12 },
      ],
    },
    {
      slug: "wingman",
      name: "Wingman 2x2",
      accent: "from-violet-600 to-purple-600",
      tagline: "2x2",
      description: "Wingman competitivo.",
      iconKey: "Swords",
      sortOrder: 4,
      rooms: [
        { name: "2X2 #02", map: "de_inferno", players: 4, slots: 4, ping: 11 },
        { name: "2X2 #01", map: "de_nuke", players: 3, slots: 4, ping: 13 },
      ],
    },
    {
      slug: "competitive",
      name: "Competitivo 5x5",
      accent: "from-purple-600 to-fuchsia-600",
      tagline: "5x5",
      description: "Competitivo ranqueado.",
      iconKey: "Trophy",
      sortOrder: 5,
      rooms: [
        { name: "5X5 #01", map: "de_dust2", players: 9, slots: 10, ping: 16 },
        { name: "5X5 #03", map: "de_mirage", players: 10, slots: 10, ping: 15 },
      ],
    },
  ];

  for (const mode of gameModes) {
    await prisma.gameMode.create({
      data: {
        slug: mode.slug,
        name: mode.name,
        accent: mode.accent,
        tagline: mode.tagline,
        description: mode.description,
        iconKey: mode.iconKey,
        sortOrder: mode.sortOrder,
        rooms: { create: mode.rooms },
      },
    });
  }

  await prisma.newsArticle.createMany({
    data: [
      {
        slug: "patch-3-2-anticheat",
        title: "Patch 3.2 — Anticheat e balanceamento",
        excerpt: "Nova versão do anticheat com detecção melhorada.",
        body: "A versão 3.2 do anticheat clutchclube traz detecção melhorada de cheats em memória, menor uso de CPU e compatibilidade total com a Season 8 do ranking.\n\nTambém ajustamos o balanceamento de rifles e pistolas nos servidores rankeados. Confira a central de notícias para o changelog completo.",
        category: "Atualização",
        imageAccent: "from-violet-600 to-purple-800",
        featured: true,
        publishedAt: new Date("2026-06-14"),
      },
      {
        slug: "torneio-clutchclube-open",
        title: "Torneio clutchclube Open",
        excerpt: "Competitivo 5x5 com premiação em skins.",
        body: "O clutchclube Open é o torneio 5x5 aberto da plataforma com premiação em skins exclusivas. Inscrições abertas para times de até 5 jogadores com ELO mínimo de 1200.\n\nAs fases online começam em julho. Consulte o Discord oficial para regulamento e datas.",
        category: "Evento",
        imageAccent: "from-fuchsia-600 to-violet-700",
        publishedAt: new Date("2026-06-12"),
      },
      {
        slug: "novos-mapas-forfun",
        title: "Novos mapas no ForFun",
        excerpt: "awp_lego e surf_utopia na rotação.",
        body: "Os mapas awp_lego e surf_utopia entram na rotação casual do modo ForFun com salas dedicadas em São Paulo.\n\nIdeal para treino de movimentação e diversão fora do ranked.",
        category: "Conteúdo",
        imageAccent: "from-indigo-600 to-purple-700",
        publishedAt: new Date("2026-06-10"),
      },
      {
        slug: "season-8-elo",
        title: "Season 8 — mudanças no ELO",
        excerpt: "Algoritmo de pontuação revisado.",
        body: "A Season 8 revisa o algoritmo de ELO para reduzir perdas em partidas equilibradas e acelerar o progresso de novos jogadores nas primeiras 20 partidas.\n\nO ranking global foi resetado parcialmente — confira sua posição no dashboard.",
        category: "Ranking",
        imageAccent: "from-purple-700 to-fuchsia-800",
        publishedAt: new Date("2026-06-08"),
      },
    ],
  });

  await prisma.storeItem.createMany({
    data: [
      {
        name: "Pacote Gamma Doppler",
        type: "Skin Collection",
        priceCents: 2490,
        originalCents: 3990,
        badge: "Em alta",
        description: "Faca Karambit Gamma Doppler + luvas Sport Gloves Vice.",
        accent: "from-emerald-500 via-cyan-500 to-violet-600",
        trending: true,
        featured: true,
        sortOrder: 0,
      },
      {
        name: "Agente Phantom",
        type: "Agente",
        priceCents: 1290,
        badge: "Novo",
        description: "Agente exclusivo clutchclube.",
        accent: "from-violet-600 to-fuchsia-600",
        sortOrder: 1,
      },
      {
        name: "Tag Elite Animada",
        type: "Cosmético",
        priceCents: 890,
        badge: "Popular",
        description: "Tag com efeito neon roxo.",
        accent: "from-purple-600 to-indigo-600",
        sortOrder: 2,
      },
    ],
  });

  // Full CS:GO catalog comes from syncCsgoSkinCatalogWithClient below.
  const { syncCsgoSkinCatalogWithClient } = await import("../lib/inventory/sync-csgo-catalog-core");
  const syncResult = await syncCsgoSkinCatalogWithClient(prisma);
  console.log(`[seed] CS:GO catalog synced: ${syncResult.synced} skins`);

  const catalogByInventoryName: Record<string, string> = {
    "Karambit Gamma Doppler": "skin-6bd8a366ec88",
    "AK-47 Inheritance": "skin-82dc98e09ba6",
    "M4A4 Howl": "skin-8aacf99e7f2f",
    "AWP Dragon Lore": "skin-4f8d99d09ded",
    "Desert Eagle Blaze": "skin-e30d23329629",
    "Glock-18 Fade": "skin-da5da69785da",
    "MP9 Starlight": "skin-feae180c4968",
    "Butterfly Knife Fade": "skin-6656ae9270b9",
    "USP-S Kill Confirmed": "skin-cf4c11689014",
    "Sport Gloves Vice": "skin-c1ae7186f829",
    "Driver Gloves King Snake": "skin-ead101bfb2c9",
  };

  const inventoryItems = [
    { name: "Karambit Gamma Doppler", category: "KNIFE", rarity: "MITICO", accent: "from-emerald-500 via-cyan-500 to-violet-600", sortOrder: 0 },
    { name: "Sport Gloves Vice", category: "GLOVES", rarity: "LENDARIO", accent: "from-fuchsia-500 to-violet-600", sortOrder: 1 },
    { name: "AK-47 Inheritance", category: "RIFLE", rarity: "LENDARIO", accent: "from-amber-500 to-orange-600", sortOrder: 2 },
    { name: "M4A4 Howl", category: "RIFLE", rarity: "MITICO", accent: "from-rose-500 to-red-700", sortOrder: 3 },
    { name: "AWP Dragon Lore", category: "RIFLE", rarity: "MITICO", accent: "from-amber-400 to-yellow-600", sortOrder: 4 },
    { name: "Desert Eagle Blaze", category: "PISTOL", rarity: "EPICO", accent: "from-orange-500 to-amber-600", sortOrder: 5 },
    { name: "Glock-18 Fade", category: "PISTOL", rarity: "LENDARIO", accent: "from-violet-400 to-fuchsia-500", sortOrder: 6 },
    { name: "MP9 Starlight", category: "SMG", rarity: "RARO", accent: "from-indigo-500 to-purple-600", sortOrder: 7 },
    { name: "Butterfly Knife Fade", category: "KNIFE", rarity: "MITICO", accent: "from-pink-500 via-purple-500 to-indigo-500", sortOrder: 8 },
    { name: "Driver Gloves King Snake", category: "GLOVES", rarity: "LENDARIO", accent: "from-zinc-400 to-zinc-700", sortOrder: 9 },
    { name: "Agente Phantom", category: "AGENT", rarity: "EPICO", accent: "from-violet-600 to-fuchsia-600", sortOrder: 10 },
    { name: "USP-S Kill Confirmed", category: "PISTOL", rarity: "EPICO", accent: "from-slate-500 to-zinc-700", sortOrder: 11 },
  ];

  const createdItems = [];
  for (const item of inventoryItems) {
    const catalogSkinId = catalogByInventoryName[item.name] ?? null;
    createdItems.push(
      await prisma.inventoryItem.create({
        data: {
          name: item.name,
          category: item.category as "KNIFE",
          rarity: item.rarity as "MITICO",
          accent: item.accent,
          sortOrder: item.sortOrder,
          catalogSkinId,
        },
      }),
    );
  }

  const equippedIds = [0, 1, 2, 5, 10];
  for (let i = 0; i < createdItems.length; i++) {
    await prisma.userInventoryItem.create({
      data: {
        userId: henry.id,
        inventoryItemId: createdItems[i].id,
        equipped: equippedIds.includes(i),
        owned: i !== 11,
      },
    });
  }

  await prisma.publicServer.createMany({
    data: [
      { name: "RIFLE #08", map: "de_mirage", mode: "Retakes", players: 9, slots: 10, ping: 12, sortOrder: 0 },
      { name: "RIFLE #01", map: "de_mirage", mode: "Deathmatch", players: 14, slots: 16, ping: 15, sortOrder: 1 },
      { name: "PODERES #01", map: "de_inferno", mode: "ForFun", players: 20, slots: 24, ping: 18, sortOrder: 2 },
      { name: "DUELS #03", map: "de_nuke", mode: "Duels", players: 8, slots: 10, ping: 14, sortOrder: 3 },
      { name: "2X2 #02", map: "de_inferno", mode: "Wingman", players: 4, slots: 4, ping: 11, sortOrder: 4 },
      { name: "5X5 #01", map: "de_dust2", mode: "Competitivo", players: 9, slots: 10, ping: 16, sortOrder: 5 },
      { name: "SURF #02", map: "surf_utopia", mode: "Movimento", players: 17, slots: 20, ping: 13, sortOrder: 6 },
      { name: "AWP #01", map: "awp_lego", mode: "Deathmatch", players: 11, slots: 16, ping: 17, sortOrder: 7 },
    ],
  });

  await prisma.leaderboardEntry.createMany({
    data: [
      { rank: 1, name: "HENRY", kd: 1.7, points: 99999 },
      { rank: 2, name: "Zk1", kd: 1.41, points: 90758 },
      { rank: 3, name: "voidz", kd: 1.87, points: 88702 },
      { rank: 4, name: "agropesca", kd: 1.9, points: 77381 },
      { rank: 5, name: "m1d", kd: 1.13, points: 71498 },
      { rank: 6, name: "SUPRA_MATZU", kd: 1.36, points: 68963 },
      { rank: 7, name: "RUMPLE", kd: 1.56, points: 66925 },
      { rank: 8, name: "Suomonev", kd: 1.36, points: 59004 },
    ],
  });

  await prisma.marketingFeature.createMany({
    data: [
      { index: "01", title: "Servidores de treino", description: "Retakes, Deathmatch e mapas focados.", iconKey: "Server", sortOrder: 0 },
      { index: "02", title: "Sistema de ranking", description: "Ranking global com ELO.", iconKey: "Trophy", sortOrder: 1 },
      { index: "03", title: "Inventário de skins", description: "Equipe facas, luvas e armas.", iconKey: "Package", sortOrder: 2 },
      { index: "04", title: "Perfil de jogador", description: "Perfil público com estatísticas.", iconKey: "UserRound", sortOrder: 3 },
      { index: "05", title: "Quick Connect", description: "Melhor servidor em um clique.", iconKey: "Zap", sortOrder: 4 },
      { index: "06", title: "Membro Premium", description: "Slot reservado e skins ilimitadas.", iconKey: "Crown", sortOrder: 5 },
    ],
  });

  await prisma.subscriptionPlan.createMany({
    data: [
      {
        slug: "free",
        name: "Free",
        priceCents: 0,
        period: "para sempre",
        highlight: false,
        features: JSON.stringify([
          "Acesso a servidores públicos casuais",
          "Perfil de jogador e ranking global (visualização)",
          "Quick Connect padrão",
          "Deathmatch, Retakes e ForFun sem anticheat",
        ]),
        cta: "Começar grátis",
        sortOrder: 0,
      },
      {
        slug: "premium",
        name: "Premium",
        priceCents: 1900,
        period: "/mês",
        highlight: true,
        badge: "Mais popular",
        features: JSON.stringify([
          "Tudo do plano Free",
          "Acesso à fila ranqueada 5x5 com ELO",
          "Slot reservado em servidores cheios",
          "+10.000 skins liberadas",
          "Tag e agentes exclusivos",
          "Prioridade no Quick Connect",
        ]),
        cta: "Assinar Premium",
        sortOrder: 1,
      },
      {
        slug: "elite",
        name: "Elite",
        priceCents: 3900,
        period: "/mês",
        highlight: false,
        badge: "Pro",
        features: JSON.stringify([
          "Tudo do plano Premium",
          "Estatísticas avançadas",
          "Servidor privado sob demanda",
          "Suporte prioritário 24/7",
        ]),
        cta: "Virar Elite",
        sortOrder: 2,
      },
    ],
  });

  await prisma.siteStat.createMany({
    data: [
      { value: "65+", label: "Servidores ativos", sortOrder: 0 },
      { value: "18ms", label: "Ping médio no Brasil", sortOrder: 1 },
      { value: "10Gbps", label: "Links dedicados", sortOrder: 2 },
      { value: "+10k", label: "Skins liberadas", sortOrder: 3 },
    ],
  });

  console.log("Seed complete. Demo user: admin@clutchclube.com / Test1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
