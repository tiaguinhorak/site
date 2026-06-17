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
    description: `Você entrará no modo ${mode}. O CS2 será iniciado automaticamente quando disponível.`,
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
};
