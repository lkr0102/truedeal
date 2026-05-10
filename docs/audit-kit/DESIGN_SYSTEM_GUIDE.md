# 🎨 Guia de Design System: TrueDeal Premium UI

Este guia documenta os princípios visuais e componentes criados por Lukas para garantir que qualquer expansão do TrueDeal mantenha a estética de **Alta Fidelidade e Glassmorphism**.

---

## 1. Princípios de Design
- **Transparência e Confiança**: Uso extensivo de superfícies de vidro (`backdrop-filter: blur`).
- **Feedback Vibrante**: Cores fortes para status (Verde Sucesso, Âmbar Formação).
- **Modernismo Clean**: Fontes sem serifa (Inter) e bordas arredondadas (14px padrão).

---

## 2. Componentes Principais (`td-ui.tsx`)

### GlassCard
O contêiner padrão para qualquer informação no app.
- **Blur**: 30px.
- **Saturação**: 200%.
- **Uso**: Cartões de deal, perfis de usuário e cards de estatísticas.
- **Accent**: Aceita uma cor lateral (ex: `accent="#16A34A"`) para indicar status ou categoria.

### PrimaryBtn
Botão de ação principal.
- **Gradiente**: `#16A34A` para `#22C55E`.
- **Sombra**: Sombra verde suave (`0 8px 24px rgba(22,163,74,0.35)`) que dá a sensação de flutuação.
- **Uso**: "Criar Deal", "Participar", "Confirmar".

### TDStatusBadge
Indicação visual do estado do contrato.
- **Em Jogo**: Verde suave.
- **Formação**: Laranja/Âmbar.
- **Encerrado**: Cinza neutro.

---

## 3. Guia de Cores (Paleta AETHEL)

| Cor | Hex | Aplicação |
| :--- | :--- | :--- |
| **Brand Green** | `#16A34A` | Logotipo, Botões de Ação, Sucesso. |
| **Background Dark** | `#0B0B10` | Fundo principal do modo escuro. |
| **Glass White** | `rgba(255,255,255,0.42)` | Fundo dos cards (com blur). |
| **Alert Red** | `#EF4444` | Erros, Fraudes (Risk Guardian). |

---

## 4. Estilos Globais e Tipografia
- **Font-Family**: `Inter, system-ui, sans-serif`.
- **Text Sizing**:
    - Títulos: `tracking-tighter`, `font-bold`.
    - Labels: `text-[10px]`, `font-bold`, `uppercase`.

---

## 5. Como Estender a UI
Para criar uma nova tela:
1. Comece com um layout centrado e limpo.
2. Use o componente `GlassCard` para agrupar informações relacionadas.
3. Utilize os ícones customizados (`TDIcon`) para reforçar a marca.
4. Mantenha os paddings generosos (`padding: 13px 24px` em botões).

---
**"A estética premium não é luxo; é o sinal visual de que o código por trás é seguro."** 🖖
