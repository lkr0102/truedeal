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
    explore_checkin_done: 'Check-ins done',
    explore_streak: 'Current Streak',
    explore_how_to_earn: 'How to earn Shakes',
    explore_claim_soon: 'Claim soon',
    explore_top_ranking: 'Monthly ranking and prizes',
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
    explore_checkin_done: 'Check-ins realizados',
    explore_streak: 'Streak atual',
    explore_how_to_earn: 'Como ganhar Shakes',
    explore_claim_soon: 'Claim em breve',
    explore_top_ranking: 'Ranking e prêmios',
  }
}

export function t(key: keyof typeof translations.en, lang: Language) {
  return translations[lang][key] || translations['en'][key] || key
}
