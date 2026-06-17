# clutchclube — Rede de Servidores CS2

Landing page completa para uma rede de servidores de Counter-Strike 2, com login, registro e download de anticheat. Visual esports premium com estética acrílica (glassmorphism), tema roxo/preto e modo dark/light.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** (tokens via CSS, dark mode por classe)
- **Motion** (Framer Motion) para animações
- **next-themes** para alternância dark/light
- **lucide-react** para ícones
- Fontes: **Chakra Petch** (display) + **Manrope** (texto)

## Páginas

| Rota | Descrição |
| --- | --- |
| `/` | Landing: hero, modos de jogo, plataforma, servidores ao vivo, ranking, planos e CTA |
| `/login` | Entrar (Steam + e-mail) |
| `/register` | Criar conta |
| `/anticheat` | Download e instalação do anticheat |

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção
npm run start    # servir build
```

## Design system

Os tokens de cor, glassmorphism e animações ficam em `app/globals.css`:

- `glass` / `glass-strong` — superfícies acrílicas com blur
- `text-gradient` — texto com degradê roxo
- `glow-ring` — brilho roxo nas bordas
- `bg-grid` — grade decorativa de fundo

As cores reagem automaticamente ao tema (variáveis `--background`, `--foreground`, `--primary`, etc.).

> Não afiliado à Valve Corporation. Counter-Strike é marca da Valve. Conteúdo (jogadores, servidores, skins) é fictício/demonstrativo.
# csPage
