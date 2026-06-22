import type { ConfirmOptions } from "@/components/providers/confirm-provider";

export const confirmPresets = {
  logout: {
    title: "Sair da conta?",
    description:
      "Você será desconectado e precisará entrar novamente para acessar o dashboard.",
    confirmLabel: "Sair",
    cancelLabel: "Continuar logado",
    tone: "danger" as const,
  },
  editProfile: {
    title: "Salvar alterações do perfil?",
    description:
      "Suas informações básicas serão atualizadas na clutchclube.",
    confirmLabel: "Salvar",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  },
  enableMfa: {
    title: "Ativar autenticação em dois fatores?",
    description:
      "Você precisará do código do app autenticador ao fazer login em novos dispositivos.",
    confirmLabel: "Ativar",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  },
  disableMfa: {
    title: "Desativar autenticação em dois fatores?",
    description:
      "Sua conta ficará menos protegida. Recomendamos manter o 2FA ativo.",
    confirmLabel: "Desativar",
    cancelLabel: "Manter ativo",
    tone: "danger" as const,
  },
  changePassword: {
    title: "Alterar senha?",
    description: "Você precisará entrar novamente em todos os dispositivos conectados.",
    confirmLabel: "Alterar senha",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  },
  removeAvatar: {
    title: "Remover foto de perfil?",
    description: "Sua foto será removida e as iniciais do nome serão exibidas.",
    confirmLabel: "Remover",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  },
  unlinkSteam: {
    title: "Desvincular conta Steam?",
    description:
      "Você não poderá jogar nos servidores até vincular uma conta Steam novamente.",
    confirmLabel: "Desvincular",
    cancelLabel: "Cancelar",
    tone: "danger" as const,
  },
  switchSteam: {
    title: "Trocar conta Steam?",
    description:
      "Você será redirecionado à Steam para conectar outra conta. Os dados já preenchidos neste formulário serão mantidos.",
    confirmLabel: "Trocar Steam",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  },
  useAnotherAccount: {
    title: "Usar outra conta?",
    description:
      "Você sairá desta sessão e poderá entrar ou criar uma conta diferente. O progresso salvo neste cadastro ficará nesta conta incompleta.",
    confirmLabel: "Continuar",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  },
  markAllRead: {
    title: "Marcar todas como lidas?",
    description: "Todas as notificações serão marcadas como lidas. Esta ação não pode ser desfeita.",
    confirmLabel: "Marcar todas",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  },
  connectServer: (serverName: string, mode: string) => ({
    title: `Conectar a ${serverName}?`,
    description: `Você entrará no modo ${mode}. O CS:GO Legacy será iniciado automaticamente quando disponível.`,
    confirmLabel: "Conectar",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  }),
  joinQueue: (serverName: string) => ({
    title: `Entrar na fila de ${serverName}?`,
    description:
      "O servidor está cheio. Você entrará na fila e será conectado quando houver slot.",
    confirmLabel: "Entrar na fila",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  }),
  createLobbyRoom: {
    title: "Criar nova sala?",
    description:
      "Sua sala ficará visível no lobby para outros jogadores entrarem. Você poderá configurar mapa e modo depois.",
    confirmLabel: "Criar sala",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  },
  autoLobby: (roomName: string, modeName: string) => ({
    title: "Entrar via Auto lobby?",
    description: `Encontramos a melhor sala disponível: ${roomName} (${modeName}). Você será conectado automaticamente.`,
    confirmLabel: "Entrar agora",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  }),
  joinRankedQueue: {
    title: "Entrar na fila ranqueada?",
    description:
      "Você buscará uma partida 5x5 com ELO. Assinatura Premium ou Elite é necessária.",
    confirmLabel: "GO",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  },
  leaveRankedQueue: {
    title: "Sair da fila ranqueada?",
    description: "Sua busca por partida será cancelada e você perderá a posição na fila.",
    confirmLabel: "Sair da fila",
    cancelLabel: "Continuar buscando",
    tone: "warning" as const,
  },
  downloadAnticheat: {
    title: "Baixar anticheat?",
    description:
      "O instalador será baixado para o seu computador. Requer Windows 10/11 e permissão de administrador.",
    confirmLabel: "Baixar",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  },
  subscribePremium: (plan = "Premium") => ({
    title: `Assinar plano ${plan}?`,
    description:
      "Você será redirecionado para finalizar a assinatura. Cancele quando quiser, sem fidelidade.",
    confirmLabel: "Continuar",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  }),
  purchaseItem: (itemName: string, price: string) => ({
    title: `Comprar ${itemName}?`,
    description: `Confirme a compra de ${price}. O item será adicionado ao seu inventário nos servidores clutchclube.`,
    confirmLabel: "Comprar",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  }),
  openSupport: (channel: string) => ({
    title: `Abrir ${channel}?`,
    description:
      "Você será redirecionado ao canal de suporte selecionado. Mantenha seus dados de conta em segurança.",
    confirmLabel: "Continuar",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  }),
  equipSkin: (itemName: string) => ({
    title: `Equipar ${itemName}?`,
    description:
      "A skin será aplicada nos servidores clutchclube. Você pode trocar quando quiser no inventário.",
    confirmLabel: "Equipar",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  }),
  quickConnect: {
    title: "Conectar ao melhor servidor?",
    description:
      "O Quick Connect escolhe automaticamente o servidor com melhor ping e ocupação para você.",
    confirmLabel: "Conectar",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  },
  deleteAction: (what: string) => ({
    title: `Excluir ${what}?`,
    description: "Esta ação é permanente e não pode ser desfeita.",
    confirmLabel: "Excluir",
    cancelLabel: "Cancelar",
    tone: "danger" as const,
  }),
  deleteUser: (nickname: string) => ({
    title: `Excluir ${nickname}?`,
    description:
      "A conta e todos os dados vinculados serão removidos permanentemente.",
    confirmLabel: "Excluir usuário",
    cancelLabel: "Cancelar",
    tone: "danger" as const,
  }),
  applyPunishment: (type: string, nickname: string) => ({
    title: `Aplicar ${type} a ${nickname}?`,
    description: "A punição será registrada e aplicada conforme as regras da plataforma.",
    confirmLabel: "Aplicar",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  }),
  revokePunishment: (type: string) => ({
    title: `Revogar ${type}?`,
    description: "A punição será marcada como revogada no histórico.",
    confirmLabel: "Revogar",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  }),
  broadcastNotification: {
    title: "Enviar notificação global?",
    description:
      "Todos os usuários com perfil completo receberão esta notificação.",
    confirmLabel: "Enviar broadcast",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  },
  unlinkSteamAdmin: (nickname: string) => ({
    title: `Desvincular Steam de ${nickname}?`,
    description: "O usuário precisará vincular uma nova conta Steam para jogar.",
    confirmLabel: "Desvincular",
    cancelLabel: "Cancelar",
    tone: "danger" as const,
  }),
  csgoStartServer: (serverName: string, mapLabel: string) => ({
    title: `Subir ${serverName}?`,
    description: `O processo CS:GO será iniciado na VPS com o mapa ${mapLabel}.`,
    confirmLabel: "Subir servidor",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  }),
  csgoChangeMap: (serverName: string, mapLabel: string) => ({
    title: `Trocar mapa de ${serverName}?`,
    description: `Tenta RCON changelevel; se falhar, derruba e sobe novamente em ${mapLabel}.`,
    confirmLabel: "Trocar mapa",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  }),
  csgoStopServer: (serverName: string) => ({
    title: `Derrubar ${serverName}?`,
    description:
      "O processo CS:GO será encerrado na VPS. Jogadores conectados serão desconectados.",
    confirmLabel: "Derrubar",
    cancelLabel: "Cancelar",
    tone: "danger" as const,
  }),
  csgoDeleteServer: (serverName: string) => ({
    title: `Remover registro de ${serverName}?`,
    description:
      "Para o servidor se estiver online e remove o cadastro da API CS:GO. Não apaga arquivos na VPS.",
    confirmLabel: "Remover registro",
    cancelLabel: "Cancelar",
    tone: "danger" as const,
  }),
  csgoRegisterServer: (serverName: string) => ({
    title: `Registrar ${serverName}?`,
    description: "Adiciona o servidor na API CS:GO para controle remoto (ainda offline até subir).",
    confirmLabel: "Registrar",
    cancelLabel: "Cancelar",
    tone: "default" as const,
  }),
  csgoCancelMatch: (matchId: string) => ({
    title: "Cancelar partida?",
    description: `A partida ${matchId.slice(0, 8)}… será cancelada e liberará o fluxo de teste.`,
    confirmLabel: "Cancelar partida",
    cancelLabel: "Voltar",
    tone: "warning" as const,
  }),
  csgoEndMatch: (matchId: string) => ({
    title: "Encerrar partida ao vivo?",
    description: `Finaliza a partida ${matchId.slice(0, 8)}… como concluída na API CS:GO.`,
    confirmLabel: "Encerrar",
    cancelLabel: "Voltar",
    tone: "danger" as const,
  }),
  rankedSimulateMatch: {
    title: "Simular partida ranked?",
    description:
      "Cria 9 bots, monta 2 lobbies 5v5 (você na party A), aceita desafio, confirma 10/10, vota mapa e tenta subir o servidor. Cancela partidas antigas na API CS:GO e apaga estado ranked local antes.",
    confirmLabel: "Simular E2E",
    cancelLabel: "Cancelar",
    tone: "warning" as const,
  },
  rankedCancelMatch: {
    title: "Cancelar partida?",
    description:
      "Encerra esta partida rankeada e libera seu lobby. Se houver registro na API CS:GO, a partida também será cancelada lá.",
    confirmLabel: "Cancelar partida",
    cancelLabel: "Voltar",
    tone: "danger" as const,
  },
};
