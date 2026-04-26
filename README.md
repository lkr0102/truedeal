# True Deal

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?style=for-the-badge&logo=tailwind-css)
![Shadcn UI](https://img.shields.io/badge/Shadcn_UI-Latest-black?style=for-the-badge)

**True Deal** é uma aplicação web para gerenciamento de promoções e deals, permitindo que usuários criem, acompanhem e configurem promoções de forma intuitiva.

</div>

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Getting Started](#getting-started)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Contribuição](#contribuição)
- [Licença](#licença)

## 📖 Sobre o Projeto

True Deal é uma plataforma completa para gerenciamento de promoções e deals. O projeto foi desenvolvido com foco em experiência do usuário, utilizando as mais modernas tecnologias web.

## ✨ Funcionalidades

- 🔐 **Sistema de Autenticação** - Login seguro com NextAuth
- 📝 **Criação de Deals** - Interface intuitiva para criar novas promoções
- ⚙️ **Configuração** - Painel de configurações personalizáveis
- 📊 **Acompanhamento** - Dashboard para tracking de promoções
- 📱 **Design Responsivo** - Interface adaptável para todos os dispositivos

## 🛠 Tecnologias

### Frontend
- [Next.js 14](https://nextjs.org/) - Framework React full-stack
- [TypeScript](https://www.typescriptlang.org/) - Tipagem estática
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilitário
- [Shadcn UI](https://ui.shadcn.com/) - Componentes UI acessíveis

### Backend
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/api-routes) - API integrada
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions) - Ações server-side

## 🚀 Getting Started

### Pré-requisitos

- Node.js 18+ 
- pnpm (gerenciador de pacotes)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/lkr0102/truedeal.git

# Entre no diretório
cd truedeal

# Instale as dependências
pnpm install

# Inicie o servidor de desenvolvimento
pnpm dev
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000)

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Exemplo de variáveis (ajuste conforme necessário)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📁 Estrutura do Projeto

```
├── app/                    # Next.js App Router
│   ├── configure/         # Página de configuração
│   ├── create/           # Página de criação de deals
│   ├── login/            # Página de login
│   ├── result/           # Página de resultados
│   ├── tracking/         # Página de tracking
│   ├── layout.tsx       # Layout principal
│   └── page.tsx         # Página inicial
├── components/           # Componentes React
│   ├── ui/              # Componentes UI (Shadcn)
│   └── theme-provider.tsx
├── hooks/               # Custom React Hooks
├── lib/                 # Utilitários
├── public/              # Arquivos estáticos
└── styles/             # Estilos globais
```

## 🤝 Contribuição

Contribuições são bem-vindas! Siga os passos abaixo:

1. Fork este repositório
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

Desenvolvido com ❤️ por [Lukas Rocha](https://github.com/lkr0102)

</div>