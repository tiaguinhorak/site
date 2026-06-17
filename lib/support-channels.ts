import {
  MessageCircle,
  Headphones,
  FileText,
  Activity,
  type LucideIcon,
} from "lucide-react";

export type SupportChannel = {
  id: string;
  title: string;
  description: string;
  action: string;
  href: string;
  icon: LucideIcon;
  accent: string;
};

export const supportChannels: SupportChannel[] = [
  {
    id: "discord",
    title: "Discord",
    description: "Suporte ao vivo com a equipe e comunidade. Resposta em minutos.",
    action: "Abrir Discord",
    href: "https://discord.com",
    icon: MessageCircle,
    accent: "from-indigo-500 to-violet-600",
  },
  {
    id: "ticket",
    title: "Abrir ticket",
    description: "Problemas com conta, banimento ou pagamento. Ticket em até 24h.",
    action: "Criar ticket",
    href: "/dashboard/suporte",
    icon: FileText,
    accent: "from-violet-500 to-purple-600",
  },
  {
    id: "live",
    title: "Chat ao vivo",
    description: "Fale com um atendente em horário comercial (9h–22h BRT).",
    action: "Iniciar chat",
    href: "/dashboard/suporte",
    icon: Headphones,
    accent: "from-fuchsia-500 to-violet-600",
  },
  {
    id: "status",
    title: "Status dos serviços",
    description: "Verifique ping, manutenções e disponibilidade dos servidores.",
    action: "Ver status",
    href: "/servidores",
    icon: Activity,
    accent: "from-purple-500 to-indigo-600",
  },
];
