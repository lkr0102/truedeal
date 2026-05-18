import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'en' | 'pt'

interface LanguageStore {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'en', // Default to English for judges
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'truedeal-language',
    }
  )
)

export const translations = {
  en: {
    // Nav
    nav_home: 'Home',
    nav_deals: 'Deals',
    nav_explore: 'Explore',
    nav_wallet: 'Wallet',
    nav_profile: 'Profile',
    nav_logout: 'Logout',

    // Dashboard / Home
    dash_welcome: 'Welcome,',
    dash_total_pot: 'Total Pot',
    dash_active_deals: 'Active Deals',
    dash_pending_deals: 'Forming',
    dash_integrity: 'Integrity',
    dash_integrity_desc: 'Full Reputation',
    dash_all_deals: 'All Deals',
    dash_my_deals: 'My Deals',
    dash_search_placeholder: 'Search deal by name...',
    dash_no_deals: 'No deals found',
    dash_create_first: 'Create my first Deal',
    dash_financial_summary: 'Financial Summary',
    dash_total_at_stake: 'Total at stake',
    dash_potential_win: 'Potential win',
    dash_in_current_pos: 'in current position',
    dash_new_deal: 'New Deal',

    // Create Deal
    create_title: 'Create Deal',
    create_subtitle: 'Configure everything and start',
    create_name_label: 'Deal Name',
    create_name_placeholder: 'Ex: Fitness Challenge 30 days',
    create_category_label: 'Category',
    create_channel_label: 'Channel',
    create_rule_label: 'Rule',
    create_meta_label: 'Goal',
    create_period_label: 'Period',
    create_payment_label: 'Payment',
    create_visibility_label: 'Visibility',
    create_review_button: 'REVIEW DEAL',
    create_confirm_title: 'Confirm Deal',
    create_confirm_subtitle: 'Review details before confirming',
    create_pay_button: 'PAY ENTRY AND START DEAL',
    create_entry_fee: 'Entry',
    create_initial_pot: 'Initial Pot',
    create_duration: 'Duration',
    create_distribution: 'Distribution',
    create_fee_info: '3% fee charged only if there is a loser. If everyone complies, the full amount is returned.',

    // Categories & Channels
    cat_social: 'Social',
    cat_fitness: 'Fitness',
    cat_gaming: 'Gaming',
    cat_learning: 'Learning',
    cat_onchain: 'On-Chain',
    cat_free: 'Free',
    
    // Privacy
    priv_private: 'Private',
    priv_public: 'Public',
    priv_private_desc: 'Access by creator approval',
    priv_public_desc: 'Open access',

    // Actions
    action_create: 'Create Deal',
    action_finish: 'Finish Deal',
    action_join: 'Join Deal',
    action_details: 'View Details',
    action_back: 'Back',
    action_edit: 'Edit',
    action_close: 'Close',
    
    // Status
    status_active: 'In Game',
    status_pending: 'Forming',
    status_finalized: 'Finalized',
    status_preparing: 'Preparing',
    status_closed: 'Closed',

    // Explore
    explore_title: 'Explore',
    explore_subtitle: 'Shakes and global ranking',
    explore_tab_points: 'Points',
    explore_tab_hof: 'Hall of Fame',
    explore_checkin_title: 'Daily Check-in',
    explore_checkin_done: 'check-ins done',
    explore_streak: 'Current streak',
    explore_how_to_earn: 'How to earn Shakes',
    explore_claim_soon: 'Claim soon',
    explore_top_ranking: 'Monthly ranking and prizes',
    explore_your_shakes: 'Your Shakes',
    explore_checkins_label: 'Check-ins',
    explore_referrals: 'Referrals',
    explore_day_1: 'Day 1',
    explore_day_7plus: 'Day 7+',
    explore_next_checkin: 'Next check-in in',
    explore_available_now: 'Available now!',
    explore_do_checkin: 'Check In',
    explore_checked_in: 'Checked in!',
    explore_unavail: 'Check-in unavailable',
    explore_saving: 'Saving...',
    explore_repair_streak: 'Repair streak — 2,500 🤝',
    explore_label_unavailable: 'UNAVAILABLE',
    explore_shakes_ranking: 'Shakes Ranking',
    explore_see_all: 'See all',
    hof_search: 'Search by name or @username...',
    hof_no_results: 'No results found',
    hof_deals: 'Deals',
    hof_wins: 'Wins',
    hof_losses: 'Losses',
    hof_win_rate: 'Win Rate',
    hof_pnl: 'PnL',
    hof_filter_deals: 'Most Deals',
    hof_filter_wins: 'Most Wins',
    hof_filter_winrate: 'Win Rate',
    hof_filter_pnl: 'Best PnL',
    hof_you: 'You',

    // Create — extended
    create_category_title: 'Choose Category',
    create_category_sub: 'Select the type of deal',
    create_channel_title: 'Choose Channel',
    create_meta_title: 'Goal',
    create_meta_sub: 'Set your target',
    meta_pace_label: 'Pace per day',
    meta_qty_label: 'Target quantity',
    meta_pace_help: 'Distribute your goal across the days of the deal',
    meta_warning: 'Everyone must reach the goal or loses their stake',
    create_period_title: 'Period',
    create_period_sub: 'Set start and end date',
    date_start: 'Start',
    date_end: 'End',
    date_auto_start: 'Deal starts automatically at 00h GMT-3',
    date_timezone: 'GMT-3 (Brasília)',
    date_days: '{count} days',
    create_pay_title: 'Payment',
    create_pay_sub: 'Entry value per person',
    pay_per_person: 'per person',
    pay_other: 'Other',
    pay_custom: 'custom',
    err_min_val: 'Minimum value is R$10',
    pay_pot_estimate: 'Estimated pot (10 players)',
    pay_prize_title: 'Prize distribution',
    create_visibility_title: 'Visibility',
    create_visibility_sub: 'Who can join this deal?',
    btn_review: 'REVIEW DEAL',
    err_fields: 'Fill in all required fields',
    deal_label: 'Deal',
    deal_no_name: 'Untitled',
    stat_entry: 'Entry',
    stat_pot: 'Pot',
    stat_duration: 'Duration',
    stat_prize: 'Distribution',
    btn_processing: 'Processing...',
    btn_pay_start: 'PAY ENTRY AND START DEAL',
    fee_disclaimer: '{rate}% fee charged only if there is a loser. If everyone complies, the full amount is returned.',
    badge_soon: 'Soon',
  },
  pt: {
    // Nav
    nav_home: 'Home',
    nav_deals: 'Deals',
    nav_explore: 'Explorar',
    nav_wallet: 'Wallet',
    nav_profile: 'Perfil',
    nav_logout: 'Sair',

    // Dashboard / Home
    dash_welcome: 'Bem-vindo,',
    dash_total_pot: 'Pot Total',
    dash_active_deals: 'Deals Ativos',
    dash_pending_deals: 'Em Formação',
    dash_integrity: 'Integridade',
    dash_integrity_desc: 'Reputação Total',
    dash_all_deals: 'Todos os Deals',
    dash_my_deals: 'Meus Deals',
    dash_search_placeholder: 'Buscar deal pelo nome...',
    dash_no_deals: 'Nenhum deal encontrado',
    dash_create_first: 'Criar meu primeiro Deal',
    dash_financial_summary: 'Resumo financeiro',
    dash_total_at_stake: 'Total em jogo',
    dash_potential_win: 'Potencial de ganho',
    dash_in_current_pos: 'na posição atual',
    dash_new_deal: 'Novo Deal',

    // Create Deal
    create_title: 'Criar Deal',
    create_subtitle: 'Configure tudo e inicie',
    create_name_label: 'Nome do Deal',
    create_name_placeholder: 'Ex: Desafio Fitness 30 dias',
    create_category_label: 'Categoria',
    create_channel_label: 'Canal',
    create_rule_label: 'Regra',
    create_meta_label: 'Meta',
    create_period_label: 'Período',
    create_payment_label: 'Pagamento',
    create_visibility_label: 'Visibilidade',
    create_review_button: 'REVISAR DEAL',
    create_confirm_title: 'Confirmar Deal',
    create_confirm_subtitle: 'Revise os detalhes antes de confirmar',
    create_pay_button: 'PAGAR ENTRADA E INICIAR O DEAL',
    create_entry_fee: 'Entrada',
    create_initial_pot: 'Pot Inicial',
    create_duration: 'Duração',
    create_distribution: 'Premiação',
    create_fee_info: 'Taxa de 3% cobrada apenas se houver perdedor. Se todos cumprirem, o valor integral é devolvido.',

    // Categories & Channels
    cat_social: 'Social',
    cat_fitness: 'Fitness',
    cat_gaming: 'Gaming',
    cat_learning: 'Learning',
    cat_onchain: 'On-Chain',
    cat_free: 'Free',

    // Privacy
    priv_private: 'Privado',
    priv_public: 'Público',
    priv_private_desc: 'Acesso por aprovação do criador',
    priv_public_desc: 'Acesso livre',

    // Actions
    action_create: 'Criar Deal',
    action_finish: 'Finalizar Acordo',
    action_join: 'Participar',
    action_details: 'Ver Detalhes',
    action_back: 'Voltar',
    action_edit: 'Editar',
    action_close: 'Fechar',

    // Status
    status_active: 'Em Jogo',
    status_pending: 'Formação',
    status_finalized: 'Finalizado',
    status_preparing: 'Em preparação',
    status_closed: 'Encerrado',

    // Explore
    explore_title: 'Explorar',
    explore_subtitle: 'Shakes e ranking global',
    explore_tab_points: 'Points',
    explore_tab_hof: 'Hall of Fame',
    explore_checkin_title: 'Check-in Diário',
    explore_checkin_done: 'check-ins realizados',
    explore_streak: 'Streak atual',
    explore_how_to_earn: 'Como ganhar Shakes',
    explore_claim_soon: 'Claim em breve',
    explore_top_ranking: 'Ranking e prêmios',
    explore_your_shakes: 'Seus Shakes',
    explore_checkins_label: 'Check-ins',
    explore_referrals: 'Indicações',
    explore_day_1: 'Dia 1',
    explore_day_7plus: 'Dia 7+',
    explore_next_checkin: 'Próximo check-in em',
    explore_available_now: 'Disponível agora!',
    explore_do_checkin: 'Fazer Check-in',
    explore_checked_in: 'Check-in feito!',
    explore_unavail: 'Check-in indisponível',
    explore_saving: 'Registrando...',
    explore_repair_streak: 'Reparar streak — 2.500 🤝',
    explore_label_unavailable: 'INDISPONÍVEL',
    explore_shakes_ranking: 'Ranking de Shakes',
    explore_see_all: 'Ver tudo',
    hof_search: 'Buscar por nome ou @username...',
    hof_no_results: 'Nenhum resultado encontrado',
    hof_deals: 'Deals',
    hof_wins: 'Vitórias',
    hof_losses: 'Derrotas',
    hof_win_rate: 'Win Rate',
    hof_pnl: 'PnL',
    hof_filter_deals: 'Mais Deals',
    hof_filter_wins: 'Mais Vitórias',
    hof_filter_winrate: 'Win Rate',
    hof_filter_pnl: 'Melhor PnL',
    hof_you: 'Você',

    // Create — extended
    create_category_title: 'Escolha a Categoria',
    create_category_sub: 'Selecione o tipo de acordo',
    create_channel_title: 'Escolha o Canal',
    create_meta_title: 'Meta',
    create_meta_sub: 'Defina seu objetivo',
    meta_pace_label: 'Pace por dia',
    meta_qty_label: 'Quantidade alvo',
    meta_pace_help: 'Distribua sua meta pelos dias do deal',
    meta_warning: 'Todos devem atingir a meta ou perdem o valor apostado',
    create_period_title: 'Período',
    create_period_sub: 'Defina data de início e fim',
    date_start: 'Início',
    date_end: 'Fim',
    date_auto_start: 'Deal inicia automaticamente às 00h GMT-3',
    date_timezone: 'GMT-3 (Brasília)',
    date_days: '{count} dias',
    create_pay_title: 'Pagamento',
    create_pay_sub: 'Valor de entrada por pessoa',
    pay_per_person: 'por pessoa',
    pay_other: 'Outro',
    pay_custom: 'personalizado',
    err_min_val: 'Valor mínimo é R$10',
    pay_pot_estimate: 'Pot estimado (10 jogadores)',
    pay_prize_title: 'Distribuição do prêmio',
    create_visibility_title: 'Visibilidade',
    create_visibility_sub: 'Quem pode entrar neste deal?',
    btn_review: 'REVISAR DEAL',
    err_fields: 'Preencha todos os campos obrigatórios',
    deal_label: 'Deal',
    deal_no_name: 'Sem título',
    stat_entry: 'Entrada',
    stat_pot: 'Pot',
    stat_duration: 'Duração',
    stat_prize: 'Premiação',
    btn_processing: 'Processando...',
    btn_pay_start: 'PAGAR ENTRADA E INICIAR O DEAL',
    fee_disclaimer: 'Taxa de {rate}% cobrada apenas se houver perdedor. Se todos cumprirem, o valor integral é devolvido.',
    badge_soon: 'Em breve',
  }
}

export function t(key: string, lang: Language, vars?: Record<string, unknown>): string {
  let str: string =
    (translations[lang] as Record<string, string>)[key] ||
    (translations.en as Record<string, string>)[key] ||
    key
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    })
  }
  return str
}
