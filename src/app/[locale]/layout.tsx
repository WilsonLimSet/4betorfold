import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, type Locale } from '../../i18n'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params

  const metadata: Record<string, { title: string; description: string; keywords: string; ogTitle: string; ogDescription: string; siteName: string; ogLocale: string }> = {
    en: {
      title: '4 Bet or Fold - Home Game Tracker & Poker Buy-in Manager',
      description: '4 Bet or Fold Home Game Tracker - Free poker game manager by Wilson Lim. Track buy-ins, cash-outs, and player balances with automatic verification. Perfect for home poker games, tournaments, and cash games.',
      keywords: 'home game tracker, poker tracker, home game manager, poker buy-in tracker, poker cash out calculator, home poker game, poker balance tracker, poker game manager, home game calculator, 4 bet or fold',
      ogTitle: 'Home Game Tracker - Poker Buy-in Manager',
      ogDescription: 'Free poker home game tracker. Track buy-ins, cash-outs, and player balances automatically.',
      siteName: 'Home Game Tracker',
      ogLocale: 'en_US'
    },
    es: {
      title: '4 Bet or Fold - Rastreador de Partidas de Póquer y Gestor de Compras',
      description: '4 Bet or Fold - Rastreador gratuito de partidas de póquer por Wilson Lim. Rastrea las compras, retiros y saldos de jugadores con verificación automática. Perfecto para partidas caseras de póquer, torneos y juegos de dinero.',
      keywords: 'rastreador de partidas caseras, rastreador de póquer, gestor de partidas caseras, rastreador de compras de póquer, calculadora de retiros de póquer, partida casera de póquer, rastreador de saldo de póquer, gestor de partidas de póquer, calculadora de partidas caseras, 4 bet or fold',
      ogTitle: 'Rastreador de Partidas Caseras - Gestor de Compras de Póquer',
      ogDescription: 'Rastreador gratuito de partidas caseras de póquer. Rastrea las compras, retiros y saldos de jugadores automáticamente.',
      siteName: 'Rastreador de Partidas Caseras',
      ogLocale: 'es_ES'
    },
    zh: {
      title: '4 Bet or Fold - 家庭扑克游戏追踪器和买入管理器',
      description: '4 Bet or Fold 家庭游戏追踪器 - Wilson Lim 制作的免费扑克游戏管理器。自动验证追踪买入、兑现和玩家余额。适用于家庭扑克游戏、锦标赛和现金游戏。',
      keywords: '家庭游戏追踪器, 扑克追踪器, 家庭游戏管理器, 扑克买入追踪器, 扑克兑现计算器, 家庭扑克游戏, 扑克余额追踪器, 扑克游戏管理器, 家庭游戏计算器, 4 bet or fold',
      ogTitle: '家庭游戏追踪器 - 扑克买入管理器',
      ogDescription: '免费扑克家庭游戏追踪器。自动追踪买入、兑现和玩家余额。',
      siteName: '家庭游戏追踪器',
      ogLocale: 'zh_CN'
    },
    pt: {
      title: '4 Bet or Fold - Rastreador de Jogos de Pôquer e Gestor de Buy-ins',
      description: '4 Bet or Fold - Rastreador gratuito de jogos de pôquer por Wilson Lim. Rastreie buy-ins, cash-outs e saldos de jogadores com verificação automática. Perfeito para jogos de pôquer em casa, torneios e cash games.',
      keywords: 'rastreador de jogos em casa, rastreador de pôquer, gestor de jogos em casa, rastreador de buy-in de pôquer, calculadora de cash-out de pôquer, jogo de pôquer em casa, rastreador de saldo de pôquer, gestor de jogos de pôquer, calculadora de jogos em casa, 4 bet or fold',
      ogTitle: 'Rastreador de Jogos em Casa - Gestor de Buy-ins de Pôquer',
      ogDescription: 'Rastreador gratuito de jogos de pôquer em casa. Rastreie buy-ins, cash-outs e saldos de jogadores automaticamente.',
      siteName: 'Rastreador de Jogos em Casa',
      ogLocale: 'pt_BR'
    },
    ru: {
      title: '4 Bet or Fold - Трекер домашних покерных игр и менеджер бай-инов',
      description: '4 Bet or Fold - Бесплатный менеджер покерных игр от Wilson Lim. Отслеживайте бай-ины, кэш-ауты и балансы игроков с автоматической проверкой. Идеально для домашних покерных игр, турниров и кэш-игр.',
      keywords: 'трекер домашних игр, трекер покера, менеджер домашних игр, трекер бай-инов покера, калькулятор кэш-аутов покера, домашняя покерная игра, трекер баланса покера, менеджер покерных игр, калькулятор домашних игр, 4 bet or fold',
      ogTitle: 'Трекер домашних игр - Менеджер бай-инов покера',
      ogDescription: 'Бесплатный трекер домашних покерных игр. Автоматическое отслеживание бай-инов, кэш-аутов и балансов игроков.',
      siteName: 'Трекер домашних игр',
      ogLocale: 'ru_RU'
    },
    fr: {
      title: '4 Bet or Fold - Suivi de parties de poker et gestionnaire de buy-ins',
      description: '4 Bet or Fold - Gestionnaire de parties de poker gratuit par Wilson Lim. Suivez les buy-ins, cash-outs et soldes des joueurs avec vérification automatique. Parfait pour les parties de poker à domicile, tournois et cash games.',
      keywords: 'suivi de parties à domicile, suivi de poker, gestionnaire de parties à domicile, suivi de buy-ins de poker, calculateur de cash-out de poker, partie de poker à domicile, suivi de solde de poker, gestionnaire de parties de poker, calculateur de parties à domicile, 4 bet or fold',
      ogTitle: 'Suivi de parties à domicile - Gestionnaire de buy-ins de poker',
      ogDescription: 'Suivi gratuit de parties de poker à domicile. Suivez automatiquement les buy-ins, cash-outs et soldes des joueurs.',
      siteName: 'Suivi de parties à domicile',
      ogLocale: 'fr_FR'
    },
    de: {
      title: '4 Bet or Fold - Poker-Heimspiel-Tracker und Buy-in-Manager',
      description: '4 Bet or Fold - Kostenloser Poker-Spiel-Manager von Wilson Lim. Verfolgen Sie Buy-ins, Cash-outs und Spieler-Guthaben mit automatischer Verifizierung. Perfekt für Poker-Heimspiele, Turniere und Cash Games.',
      keywords: 'heimspiel-tracker, poker-tracker, heimspiel-manager, poker-buy-in-tracker, poker-cash-out-rechner, poker-heimspiel, poker-guthaben-tracker, poker-spiel-manager, heimspiel-rechner, 4 bet or fold',
      ogTitle: 'Heimspiel-Tracker - Poker-Buy-in-Manager',
      ogDescription: 'Kostenloser Poker-Heimspiel-Tracker. Verfolgen Sie automatisch Buy-ins, Cash-outs und Spieler-Guthaben.',
      siteName: 'Heimspiel-Tracker',
      ogLocale: 'de_DE'
    },
    ja: {
      title: '4 Bet or Fold - ホームゲームトラッカーとポーカーバイイン管理',
      description: '4 Bet or Fold ホームゲームトラッカー - Wilson Lim による無料ポーカーゲーム管理ツール。自動検証でバイイン、キャッシュアウト、プレイヤー残高を追跡。ホームポーカーゲーム、トーナメント、キャッシュゲームに最適。',
      keywords: 'ホームゲームトラッカー, ポーカートラッカー, ホームゲーム管理, ポーカーバイイントラッカー, ポーカーキャッシュアウト計算, ホームポーカーゲーム, ポーカー残高トラッカー, ポーカーゲーム管理, ホームゲーム計算, 4 bet or fold',
      ogTitle: 'ホームゲームトラッカー - ポーカーバイイン管理',
      ogDescription: '無料ポーカーホームゲームトラッカー。バイイン、キャッシュアウト、プレイヤー残高を自動追跡。',
      siteName: 'ホームゲームトラッカー',
      ogLocale: 'ja_JP'
    },
    ko: {
      title: '4 Bet or Fold - 홈게임 추적기 및 포커 바이인 관리자',
      description: '4 Bet or Fold 홈게임 추적기 - Wilson Lim의 무료 포커 게임 관리자. 자동 확인으로 바이인, 캐시아웃, 플레이어 잔액 추적. 홈 포커 게임, 토너먼트, 캐시 게임에 적합.',
      keywords: '홈게임 추적기, 포커 추적기, 홈게임 관리자, 포커 바이인 추적기, 포커 캐시아웃 계산기, 홈 포커 게임, 포커 잔액 추적기, 포커 게임 관리자, 홈게임 계산기, 4 bet or fold',
      ogTitle: '홈게임 추적기 - 포커 바이인 관리자',
      ogDescription: '무료 포커 홈게임 추적기. 바이인, 캐시아웃, 플레이어 잔액을 자동으로 추적.',
      siteName: '홈게임 추적기',
      ogLocale: 'ko_KR'
    },
    it: {
      title: '4 Bet or Fold - Tracker partite poker e gestore buy-in',
      description: '4 Bet or Fold - Gestore di partite di poker gratuito di Wilson Lim. Traccia buy-in, cash-out e saldi giocatori con verifica automatica. Perfetto per partite di poker casalinghe, tornei e cash game.',
      keywords: 'tracker partite casalinghe, tracker poker, gestore partite casalinghe, tracker buy-in poker, calcolatore cash-out poker, partita poker casalinga, tracker saldo poker, gestore partite poker, calcolatore partite casalinghe, 4 bet or fold',
      ogTitle: 'Tracker partite casalinghe - Gestore buy-in poker',
      ogDescription: 'Tracker gratuito per partite di poker casalinghe. Traccia automaticamente buy-in, cash-out e saldi giocatori.',
      siteName: 'Tracker partite casalinghe',
      ogLocale: 'it_IT'
    },
    hi: {
      title: '4 Bet or Fold - होम गेम ट्रैकर और पोकर बाय-इन प्रबंधक',
      description: '4 Bet or Fold होम गेम ट्रैकर - Wilson Lim द्वारा निःशुल्क पोकर गेम प्रबंधक। स्वचालित सत्यापन के साथ बाय-इन, कैश-आउट और खिलाड़ी शेष राशि को ट्रैक करें। होम पोकर गेम, टूर्नामेंट और कैश गेम के लिए बिल्कुल सही।',
      keywords: 'होम गेम ट्रैकर, पोकर ट्रैकर, होम गेम प्रबंधक, पोकर बाय-इन ट्रैकर, पोकर कैश-आउट कैलकुलेटर, होम पोकर गेम, पोकर बैलेंस ट्रैकर, पोकर गेम प्रबंधक, होम गेम कैलकुलेटर, 4 bet or fold',
      ogTitle: 'होम गेम ट्रैकर - पोकर बाय-इन प्रबंधक',
      ogDescription: 'निःशुल्क पोकर होम गेम ट्रैकर। स्वचालित रूप से बाय-इन, कैश-आउट और खिलाड़ी शेष राशि को ट्रैक करें।',
      siteName: 'होम गेम ट्रैकर',
      ogLocale: 'hi_IN'
    },
    id: {
      title: '4 Bet or Fold - Pelacak permainan poker dan pengelola buy-in',
      description: '4 Bet or Fold - Pengelola permainan poker gratis oleh Wilson Lim. Lacak buy-in, cash-out, dan saldo pemain dengan verifikasi otomatis. Sempurna untuk permainan poker rumahan, turnamen, dan cash game.',
      keywords: 'pelacak permainan rumahan, pelacak poker, pengelola permainan rumahan, pelacak buy-in poker, kalkulator cash-out poker, permainan poker rumahan, pelacak saldo poker, pengelola permainan poker, kalkulator permainan rumahan, 4 bet or fold',
      ogTitle: 'Pelacak permainan rumahan - Pengelola buy-in poker',
      ogDescription: 'Pelacak permainan poker rumahan gratis. Lacak buy-in, cash-out, dan saldo pemain secara otomatis.',
      siteName: 'Pelacak permainan rumahan',
      ogLocale: 'id_ID'
    },
    th: {
      title: '4 Bet or Fold - เครื่องมือติดตามเกมโป๊กเกอร์และตัวจัดการซื้อชิป',
      description: '4 Bet or Fold - ตัวจัดการเกมโป๊กเกอร์ฟรีโดย Wilson Lim ติดตามการซื้อชิป เบิกเงิน และยอดเงินของผู้เล่นด้วยการตรวจสอบอัตโนมัติ เหมาะสำหรับเกมโป๊กเกอร์ที่บ้าน ทัวร์นาเมนต์ และแคชเกม',
      keywords: 'เครื่องมือติดตามเกมที่บ้าน, เครื่องมือติดตามโป๊กเกอร์, ตัวจัดการเกมที่บ้าน, เครื่องมือติดตามซื้อชิปโป๊กเกอร์, เครื่องคำนวณเบิกเงินโป๊กเกอร์, เกมโป๊กเกอร์ที่บ้าน, เครื่องมือติดตามยอดเงินโป๊กเกอร์, ตัวจัดการเกมโป๊กเกอร์, เครื่องคำนวณเกมที่บ้าน, 4 bet or fold',
      ogTitle: 'เครื่องมือติดตามเกมที่บ้าน - ตัวจัดการซื้อชิปโป๊กเกอร์',
      ogDescription: 'เครื่องมือติดตามเกมโป๊กเกอร์ที่บ้านฟรี ติดตามการซื้อชิป เบิกเงิน และยอดเงินของผู้เล่นโดยอัตโนมัติ',
      siteName: 'เครื่องมือติดตามเกมที่บ้าน',
      ogLocale: 'th_TH'
    },
    vi: {
      title: '4 Bet or Fold - Công cụ theo dõi trò chơi poker và quản lý mua chip',
      description: '4 Bet or Fold - Công cụ quản lý trò chơi poker miễn phí của Wilson Lim. Theo dõi mua chip, rút tiền và số dư người chơi với xác minh tự động. Hoàn hảo cho trò chơi poker tại nhà, giải đấu và cash game.',
      keywords: 'công cụ theo dõi trò chơi tại nhà, công cụ theo dõi poker, công cụ quản lý trò chơi tại nhà, công cụ theo dõi mua chip poker, máy tính rút tiền poker, trò chơi poker tại nhà, công cụ theo dõi số dư poker, công cụ quản lý trò chơi poker, máy tính trò chơi tại nhà, 4 bet or fold',
      ogTitle: 'Công cụ theo dõi trò chơi tại nhà - Quản lý mua chip poker',
      ogDescription: 'Công cụ theo dõi trò chơi poker tại nhà miễn phí. Tự động theo dõi mua chip, rút tiền và số dư người chơi.',
      siteName: 'Công cụ theo dõi trò chơi tại nhà',
      ogLocale: 'vi_VN'
    },
    tr: {
      title: '4 Bet or Fold - Poker ev oyunu takipçisi ve buy-in yöneticisi',
      description: '4 Bet or Fold - Wilson Lim tarafından ücretsiz poker oyun yöneticisi. Otomatik doğrulamayla buy-in, cash-out ve oyuncu bakiyelerini takip edin. Poker ev oyunları, turnuvalar ve cash oyunlar için mükemmel.',
      keywords: 'ev oyunu takipçisi, poker takipçisi, ev oyunu yöneticisi, poker buy-in takipçisi, poker cash-out hesaplayıcısı, poker ev oyunu, poker bakiye takipçisi, poker oyun yöneticisi, ev oyunu hesaplayıcısı, 4 bet or fold',
      ogTitle: 'Ev oyunu takipçisi - Poker buy-in yöneticisi',
      ogDescription: 'Ücretsiz poker ev oyunu takipçisi. Buy-in, cash-out ve oyuncu bakiyelerini otomatik olarak takip edin.',
      siteName: 'Ev oyunu takipçisi',
      ogLocale: 'tr_TR'
    },
    tl: {
      title: '4 Bet or Fold - Poker home game tracker at buy-in manager',
      description: '4 Bet or Fold - Libreng poker game manager ni Wilson Lim. Subaybayan ang buy-ins, cash-outs, at balanse ng players na may awtomatikong verification. Perpekto para sa poker home games, tournaments, at cash games.',
      keywords: 'home game tracker, poker tracker, home game manager, poker buy-in tracker, poker cash-out calculator, home poker game, poker balance tracker, poker game manager, home game calculator, 4 bet or fold',
      ogTitle: 'Home game tracker - Poker buy-in manager',
      ogDescription: 'Libreng poker home game tracker. Awtomatikong subaybayan ang buy-ins, cash-outs, at balanse ng players.',
      siteName: 'Home game tracker',
      ogLocale: 'tl_PH'
    },
    pl: {
      title: '4 Bet or Fold - Tracker gier domowych i menedżer buy-inów pokerowych',
      description: '4 Bet or Fold - Darmowy menedżer gier pokerowych autorstwa Wilson Lim. Śledź buy-iny, cash-outy i salda graczy z automatyczną weryfikacją. Idealny do domowych gier pokerowych, turniejów i cash games.',
      keywords: 'tracker gier domowych, tracker pokera, menedżer gier domowych, tracker buy-inów pokerowych, kalkulator cash-outów pokerowych, domowa gra pokerowa, tracker salda pokerowego, menedżer gier pokerowych, kalkulator gier domowych, 4 bet or fold',
      ogTitle: 'Tracker gier domowych - Menedżer buy-inów pokerowych',
      ogDescription: 'Darmowy tracker domowych gier pokerowych. Automatyczne śledzenie buy-inów, cash-outów i sald graczy.',
      siteName: 'Tracker gier domowych',
      ogLocale: 'pl_PL'
    },
    nl: {
      title: '4 Bet or Fold - Poker thuisspel tracker en buy-in manager',
      description: '4 Bet or Fold - Gratis poker game manager door Wilson Lim. Volg buy-ins, cash-outs en spelerssaldi met automatische verificatie. Perfect voor poker thuisspellen, toernooien en cash games.',
      keywords: 'thuisspel tracker, poker tracker, thuisspel manager, poker buy-in tracker, poker cash-out calculator, poker thuisspel, poker saldo tracker, poker game manager, thuisspel calculator, 4 bet or fold',
      ogTitle: 'Thuisspel tracker - Poker buy-in manager',
      ogDescription: 'Gratis poker thuisspel tracker. Volg automatisch buy-ins, cash-outs en spelerssaldi.',
      siteName: 'Thuisspel tracker',
      ogLocale: 'nl_NL'
    },
    sv: {
      title: '4 Bet or Fold - Poker hemspel-spårare och buy-in manager',
      description: '4 Bet or Fold - Gratis poker spelhanterare av Wilson Lim. Spåra buy-ins, cash-outs och spelarsaldon med automatisk verifiering. Perfekt för poker hemspel, turneringar och cash games.',
      keywords: 'hemspel-spårare, poker-spårare, hemspel-hanterare, poker buy-in spårare, poker cash-out kalkylator, poker hemspel, poker saldo-spårare, poker spelhanterare, hemspel kalkylator, 4 bet or fold',
      ogTitle: 'Hemspel-spårare - Poker buy-in manager',
      ogDescription: 'Gratis poker hemspel-spårare. Spåra automatiskt buy-ins, cash-outs och spelarsaldon.',
      siteName: 'Hemspel-spårare',
      ogLocale: 'sv_SE'
    },
    cs: {
      title: '4 Bet or Fold - Sledovač domácích pokerových her a správce buy-inů',
      description: '4 Bet or Fold - Bezplatný správce pokerových her od Wilson Lim. Sledujte buy-iny, cash-outy a zůstatky hráčů s automatickým ověřením. Ideální pro domácí pokerové hry, turnaje a cash games.',
      keywords: 'sledovač domácích her, sledovač pokeru, správce domácích her, sledovač buy-inů pokeru, kalkulačka cash-outů pokeru, domácí pokerová hra, sledovač zůstatku pokeru, správce pokerových her, kalkulačka domácích her, 4 bet or fold',
      ogTitle: 'Sledovač domácích her - Správce buy-inů pokeru',
      ogDescription: 'Bezplatný sledovač domácích pokerových her. Automatické sledování buy-inů, cash-outů a zůstatků hráčů.',
      siteName: 'Sledovač domácích her',
      ogLocale: 'cs_CZ'
    },
    ar: {
      title: '4 Bet or Fold - متتبع ألعاب البوكر المنزلية ومدير الشراء',
      description: '4 Bet or Fold - مدير ألعاب البوكر المجاني من Wilson Lim. تتبع عمليات الشراء والسحب النقدي وأرصدة اللاعبين مع التحقق التلقائي. مثالي لألعاب البوكر المنزلية والبطولات وألعاب النقد.',
      keywords: 'متتبع الألعاب المنزلية, متتبع البوكر, مدير الألعاب المنزلية, متتبع شراء البوكر, حاسبة السحب النقدي للبوكر, لعبة البوكر المنزلية, متتبع رصيد البوكر, مدير ألعاب البوكر, حاسبة الألعاب المنزلية, 4 bet or fold',
      ogTitle: 'متتبع الألعاب المنزلية - مدير شراء البوكر',
      ogDescription: 'متتبع ألعاب البوكر المنزلية المجاني. تتبع عمليات الشراء والسحب النقدي وأرصدة اللاعبين تلقائيًا.',
      siteName: 'متتبع الألعاب المنزلية',
      ogLocale: 'ar_SA'
    },
    uk: {
      title: '4 Bet or Fold - Трекер домашніх покерних ігор та менеджер бай-інів',
      description: '4 Bet or Fold - Безкоштовний менеджер покерних ігор від Wilson Lim. Відстежуйте бай-іни, кеш-аути та баланси гравців з автоматичною перевіркою. Ідеально для домашніх покерних ігор, турнірів та кеш-ігор.',
      keywords: 'трекер домашніх ігор, трекер покеру, менеджер домашніх ігор, трекер бай-інів покеру, калькулятор кеш-аутів покеру, домашня покерна гра, трекер балансу покеру, менеджер покерних ігор, калькулятор домашніх ігор, 4 bet or fold',
      ogTitle: 'Трекер домашніх ігор - Менеджер бай-інів покеру',
      ogDescription: 'Безкоштовний трекер домашніх покерних ігор. Автоматичне відстеження бай-інів, кеш-аутів та балансів гравців.',
      siteName: 'Трекер домашніх ігор',
      ogLocale: 'uk_UA'
    },
    he: {
      title: '4 Bet or Fold - עוקב משחקי פוקר ביתיים ומנהל כניסות',
      description: '4 Bet or Fold - מנהל משחקי פוקר חינמי מאת Wilson Lim. עקוב אחר כניסות, יציאות ויתרות שחקנים עם אימות אוטומטי. מושלם למשחקי פוקר ביתיים, טורנירים ומשחקי מזומן.',
      keywords: 'עוקב משחקים ביתיים, עוקב פוקר, מנהל משחקים ביתיים, עוקב כניסות פוקר, מחשבון יציאות פוקר, משחק פוקר ביתי, עוקב יתרת פוקר, מנהל משחקי פוקר, מחשבון משחקים ביתיים, 4 bet or fold',
      ogTitle: 'עוקב משחקים ביתיים - מנהל כניסות פוקר',
      ogDescription: 'עוקב משחקי פוקר ביתיים חינמי. עקוב אחר כניסות, יציאות ויתרות שחקנים באופן אוטומטי.',
      siteName: 'עוקב משחקים ביתיים',
      ogLocale: 'he_IL'
    },
    ro: {
      title: '4 Bet or Fold - Tracker jocuri de poker și manager buy-in',
      description: '4 Bet or Fold - Manager gratuit pentru jocuri de poker de Wilson Lim. Urmărește buy-in-uri, cash-out-uri și solduri jucători cu verificare automată. Perfect pentru jocuri de poker de acasă, turnee și cash games.',
      keywords: 'tracker jocuri de acasă, tracker poker, manager jocuri de acasă, tracker buy-in poker, calculator cash-out poker, joc poker de acasă, tracker sold poker, manager jocuri poker, calculator jocuri de acasă, 4 bet or fold',
      ogTitle: 'Tracker jocuri de acasă - Manager buy-in poker',
      ogDescription: 'Tracker gratuit pentru jocuri de poker de acasă. Urmărește automat buy-in-uri, cash-out-uri și solduri jucători.',
      siteName: 'Tracker jocuri de acasă',
      ogLocale: 'ro_RO'
    },
    el: {
      title: '4 Bet or Fold - Tracker οικιακών παιχνιδιών πόκερ και διαχειριστής buy-in',
      description: '4 Bet or Fold - Δωρεάν διαχειριστής παιχνιδιών πόκερ από τον Wilson Lim. Παρακολουθήστε buy-ins, cash-outs και υπόλοιπα παικτών με αυτόματη επαλήθευση. Ιδανικό για οικιακά παιχνίδια πόκερ, τουρνουά και cash games.',
      keywords: 'tracker οικιακών παιχνιδιών, tracker πόκερ, διαχειριστής οικιακών παιχνιδιών, tracker buy-in πόκερ, υπολογιστής cash-out πόκερ, οικιακό παιχνίδι πόκερ, tracker υπολοίπου πόκερ, διαχειριστής παιχνιδιών πόκερ, υπολογιστής οικιακών παιχνιδιών, 4 bet or fold',
      ogTitle: 'Tracker οικιακών παιχνιδιών - Διαχειριστής buy-in πόκερ',
      ogDescription: 'Δωρεάν tracker οικιακών παιχνιδιών πόκερ. Αυτόματη παρακολούθηση buy-ins, cash-outs και υπολοίπων παικτών.',
      siteName: 'Tracker οικιακών παιχνιδιών',
      ogLocale: 'el_GR'
    },
    hu: {
      title: '4 Bet or Fold - Házi póker játék követő és buy-in kezelő',
      description: '4 Bet or Fold - Ingyenes póker játék kezelő Wilson Lim-től. Kövesd a buy-in-okat, cash-out-okat és játékos egyenlegeket automatikus ellenőrzéssel. Tökéletes házi póker játékokhoz, tornákhoz és cash game-ekhez.',
      keywords: 'házi játék követő, póker követő, házi játék kezelő, póker buy-in követő, póker cash-out kalkulátor, házi póker játék, póker egyenleg követő, póker játék kezelő, házi játék kalkulátor, 4 bet or fold',
      ogTitle: 'Házi játék követő - Póker buy-in kezelő',
      ogDescription: 'Ingyenes házi póker játék követő. Automatikusan kövesd a buy-in-okat, cash-out-okat és játékos egyenlegeket.',
      siteName: 'Házi játék követő',
      ogLocale: 'hu_HU'
    },
    fi: {
      title: '4 Bet or Fold - Kotipelien pokerin seuranta ja buy-in hallinta',
      description: '4 Bet or Fold - Ilmainen pokerin pelienhallinta Wilson Lim:ltä. Seuraa buy-ineja, cash-outeja ja pelaajien saldoja automaattisella tarkistuksella. Täydellinen kotipelien pokeriin, turnaukiin ja cash-peleihin.',
      keywords: 'kotipelien seuranta, pokerin seuranta, kotipelien hallinta, pokerin buy-in seuranta, pokerin cash-out laskuri, kotipelien pokeri, pokerin saldo seuranta, pokerin pelihallinta, kotipelien laskuri, 4 bet or fold',
      ogTitle: 'Kotipelien seuranta - Pokerin buy-in hallinta',
      ogDescription: 'Ilmainen kotipelien pokerin seuranta. Automaattinen buy-inien, cash-outien ja pelaajien saldojen seuranta.',
      siteName: 'Kotipelien seuranta',
      ogLocale: 'fi_FI'
    },
    da: {
      title: '4 Bet or Fold - Poker hjemmespil tracker og buy-in manager',
      description: '4 Bet or Fold - Gratis poker spil manager af Wilson Lim. Spor buy-ins, cash-outs og spillersaldi med automatisk verifikation. Perfekt til poker hjemmespil, turneringer og cash games.',
      keywords: 'hjemmespil tracker, poker tracker, hjemmespil manager, poker buy-in tracker, poker cash-out beregner, poker hjemmespil, poker saldo tracker, poker spil manager, hjemmespil beregner, 4 bet or fold',
      ogTitle: 'Hjemmespil tracker - Poker buy-in manager',
      ogDescription: 'Gratis poker hjemmespil tracker. Automatisk sporing af buy-ins, cash-outs og spillersaldi.',
      siteName: 'Hjemmespil tracker',
      ogLocale: 'da_DK'
    },
    ms: {
      title: '4 Bet or Fold - Penjejak permainan poker rumah dan pengurus buy-in',
      description: '4 Bet or Fold - Pengurus permainan poker percuma oleh Wilson Lim. Jejaki buy-ins, cash-outs dan baki pemain dengan pengesahan automatik. Sempurna untuk permainan poker rumah, turnamen dan cash games.',
      keywords: 'penjejak permainan rumah, penjejak poker, pengurus permainan rumah, penjejak buy-in poker, kalkulator cash-out poker, permainan poker rumah, penjejak baki poker, pengurus permainan poker, kalkulator permainan rumah, 4 bet or fold',
      ogTitle: 'Penjejak permainan rumah - Pengurus buy-in poker',
      ogDescription: 'Penjejak permainan poker rumah percuma. Jejaki buy-ins, cash-outs dan baki pemain secara automatik.',
      siteName: 'Penjejak permainan rumah',
      ogLocale: 'ms_MY'
    },
    bn: {
      title: '4 Bet or Fold - হোম গেম ট্র্যাকার এবং পোকার বাই-ইন ম্যানেজার',
      description: '4 Bet or Fold - Wilson Lim এর বিনামূল্যে পোকার গেম ম্যানেজার। স্বয়ংক্রিয় যাচাইকরণ সহ বাই-ইন, ক্যাশ-আউট এবং খেলোয়াড় ব্যালেন্স ট্র্যাক করুন। হোম পোকার গেম, টুর্নামেন্ট এবং ক্যাশ গেমের জন্য পারফেক্ট।',
      keywords: 'হোম গেম ট্র্যাকার, পোকার ট্র্যাকার, হোম গেম ম্যানেজার, পোকার বাই-ইন ট্র্যাকার, পোকার ক্যাশ-আউট ক্যালকুলেটর, হোম পোকার গেম, পোকার ব্যালেন্স ট্র্যাকার, পোকার গেম ম্যানেজার, হোম গেম ক্যালকুলেটর, 4 bet or fold',
      ogTitle: 'হোম গেম ট্র্যাকার - পোকার বাই-ইন ম্যানেজার',
      ogDescription: 'বিনামূল্যে পোকার হোম গেম ট্র্যাকার। স্বয়ংক্রিয়ভাবে বাই-ইন, ক্যাশ-আউট এবং খেলোয়াড় ব্যালেন্স ট্র্যাক করুন।',
      siteName: 'হোম গেম ট্র্যাকার',
      ogLocale: 'bn_BD'
    },
    no: {
      title: '4 Bet or Fold - Poker hjemmespill-sporer og buy-in manager',
      description: '4 Bet or Fold - Gratis poker spillhåndterer av Wilson Lim. Spor buy-ins, cash-outs og spillersaldoer med automatisk verifisering. Perfekt for poker hjemmespill, turneringer og cash games.',
      keywords: 'hjemmespill-sporer, poker-sporer, hjemmespill-håndterer, poker buy-in sporer, poker cash-out kalkulator, poker hjemmespill, poker saldo-sporer, poker spillhåndterer, hjemmespill kalkulator, 4 bet or fold',
      ogTitle: 'Hjemmespill-sporer - Poker buy-in manager',
      ogDescription: 'Gratis poker hjemmespill-sporer. Spor automatisk buy-ins, cash-outs og spillersaldoer.',
      siteName: 'Hjemmespill-sporer',
      ogLocale: 'no_NO'
    },
    sk: {
      title: '4 Bet or Fold - Sledovač domácich pokerových hier a správca buy-inov',
      description: '4 Bet or Fold - Bezplatný správca pokerových hier od Wilson Lim. Sledujte buy-iny, cash-outy a zostatky hráčov s automatickým overením. Ideálny pre domáce pokerové hry, turnaje a cash games.',
      keywords: 'sledovač domácich hier, sledovač pokeru, správca domácich hier, sledovač buy-inov pokeru, kalkulátor cash-outov pokeru, domáca pokerová hra, sledovač zostatku pokeru, správca pokerových hier, kalkulátor domácich hier, 4 bet or fold',
      ogTitle: 'Sledovač domácich hier - Správca buy-inov pokeru',
      ogDescription: 'Bezplatný sledovač domácich pokerových hier. Automatické sledovanie buy-inov, cash-outov a zostatkov hráčov.',
      siteName: 'Sledovač domácich hier',
      ogLocale: 'sk_SK'
    },
    sr: {
      title: '4 Bet or Fold - Praćenje kućnih poker igara i buy-in menadžer',
      description: '4 Bet or Fold - Besplatan poker menadžer igara od Wilson Lim. Pratite buy-in-ove, cash-out-ove i stanja igrača sa automatskom verifikacijom. Savršeno za kućne poker igre, turnire i cash igre.',
      keywords: 'praćenje kućnih igara, praćenje pokera, menadžer kućnih igara, praćenje buy-in-ova pokera, kalkulator cash-out-ova pokera, kućna poker igra, praćenje stanja pokera, menadžer poker igara, kalkulator kućnih igara, 4 bet or fold',
      ogTitle: 'Praćenje kućnih igara - Buy-in menadžer pokera',
      ogDescription: 'Besplatno praćenje kućnih poker igara. Automatsko praćenje buy-in-ova, cash-out-ova i stanja igrača.',
      siteName: 'Praćenje kućnih igara',
      ogLocale: 'sr_RS'
    },
    hr: {
      title: '4 Bet or Fold - Praćenje kućnih poker igara i buy-in menadžer',
      description: '4 Bet or Fold - Besplatan poker menadžer igara od Wilson Lim. Pratite buy-in-ove, cash-out-ove i stanja igrača s automatskom provjerom. Savršeno za kućne poker igre, turnire i cash igre.',
      keywords: 'praćenje kućnih igara, praćenje pokera, menadžer kućnih igara, praćenje buy-in-ova pokera, kalkulator cash-out-ova pokera, kućna poker igra, praćenje stanja pokera, menadžer poker igara, kalkulator kućnih igara, 4 bet or fold',
      ogTitle: 'Praćenje kućnih igara - Buy-in menadžer pokera',
      ogDescription: 'Besplatno praćenje kućnih poker igara. Automatsko praćenje buy-in-ova, cash-out-ova i stanja igrača.',
      siteName: 'Praćenje kućnih igara',
      ogLocale: 'hr_HR'
    },
    bg: {
      title: '4 Bet or Fold - Тракер за домашни покер игри и buy-in мениджър',
      description: '4 Bet or Fold - Безплатен мениджър за покер игри от Wilson Lim. Следете buy-in-ове, cash-out-ове и баланси на играчи с автоматична проверка. Перфектен за домашни покер игри, турнири и cash игри.',
      keywords: 'тракер за домашни игри, тракер за покер, мениджър за домашни игри, тракер за buy-in-ове за покер, калкулатор за cash-out-ове за покер, домашна покер игра, тракер за баланс за покер, мениджър за покер игри, калкулатор за домашни игри, 4 bet or fold',
      ogTitle: 'Тракер за домашни игри - Buy-in мениджър за покер',
      ogDescription: 'Безплатен тракер за домашни покер игри. Автоматично следене на buy-in-ове, cash-out-ове и баланси на играчи.',
      siteName: 'Тракер за домашни игри',
      ogLocale: 'bg_BG'
    },
    fa: {
      title: '4 Bet or Fold - ردیاب بازی‌های پوکر خانگی و مدیریت buy-in',
      description: '4 Bet or Fold - مدیر رایگان بازی‌های پوکر توسط Wilson Lim. خرید، برداشت و موجودی بازیکنان را با تأیید خودکار پیگیری کنید. عالی برای بازی‌های پوکر خانگی، تورنمنت‌ها و بازی‌های نقدی.',
      keywords: 'ردیاب بازی‌های خانگی, ردیاب پوکر, مدیر بازی‌های خانگی, ردیاب buy-in پوکر, ماشین حساب برداشت پوکر, بازی پوکر خانگی, ردیاب موجودی پوکر, مدیر بازی‌های پوکر, ماشین حساب بازی‌های خانگی, 4 bet or fold',
      ogTitle: 'ردیاب بازی‌های خانگی - مدیر buy-in پوکر',
      ogDescription: 'ردیاب رایگان بازی‌های پوکر خانگی. پیگیری خودکار خرید، برداشت و موجودی بازیکنان.',
      siteName: 'ردیاب بازی‌های خانگی',
      ogLocale: 'fa_IR'
    },
    ur: {
      title: '4 Bet or Fold - ہوم گیم ٹریکر اور پوکر بائی ان مینیجر',
      description: '4 Bet or Fold - Wilson Lim کا مفت پوکر گیم مینیجر۔ خودکار تصدیق کے ساتھ بائی انز، کیش آؤٹس اور کھلاڑی بیلنس کو ٹریک کریں۔ ہوم پوکر گیمز، ٹورنامنٹس اور کیش گیمز کے لیے بہترین۔',
      keywords: 'ہوم گیم ٹریکر, پوکر ٹریکر, ہوم گیم مینیجر, پوکر بائی ان ٹریکر, پوکر کیش آؤٹ کیلکولیٹر, ہوم پوکر گیم, پوکر بیلنس ٹریکر, پوکر گیم مینیجر, ہوم گیم کیلکولیٹر, 4 bet or fold',
      ogTitle: 'ہوم گیم ٹریکر - پوکر بائی ان مینیجر',
      ogDescription: 'مفت پوکر ہوم گیم ٹریکر۔ خودکار طور پر بائی انز، کیش آؤٹس اور کھلاڑی بیلنس کو ٹریک کریں۔',
      siteName: 'ہوم گیم ٹریکر',
      ogLocale: 'ur_PK'
    },
    lt: {
      title: '4 Bet or Fold - Namų pokerio žaidimų sekimas ir buy-in valdymas',
      description: '4 Bet or Fold - Nemokamas pokerio žaidimų valdymas nuo Wilson Lim. Sekite buy-in-us, cash-out-us ir žaidėjų balansus su automatiniu patikrinimu. Puikiai tinka namų pokerio žaidimams, turnyrams ir cash žaidimams.',
      keywords: 'namų žaidimų sekimas, pokerio sekimas, namų žaidimų valdymas, pokerio buy-in sekimas, pokerio cash-out skaičiuotuvas, namų pokerio žaidimas, pokerio balanso sekimas, pokerio žaidimų valdymas, namų žaidimų skaičiuotuvas, 4 bet or fold',
      ogTitle: 'Namų žaidimų sekimas - Pokerio buy-in valdymas',
      ogDescription: 'Nemokamas namų pokerio žaidimų sekimas. Automatinis buy-in-ų, cash-out-ų ir žaidėjų balansų sekimas.',
      siteName: 'Namų žaidimų sekimas',
      ogLocale: 'lt_LT'
    },
    af: {
      title: '4 Bet or Fold - Tuisspeletjie-naspeurder en poker buy-in bestuurder',
      description: '4 Bet or Fold - Gratis poker speletjie-bestuurder deur Wilson Lim. Spoor buy-ins, cash-outs en speler-balanse met outomatiese verifikasie. Perfek vir poker tuisspeletjies, toernooie en cash games.',
      keywords: 'tuisspeletjie-naspeurder, poker-naspeurder, tuisspeletjie-bestuurder, poker buy-in naspeurder, poker cash-out sakrekenaar, poker tuisspeletjie, poker balans-naspeurder, poker speletjie-bestuurder, tuisspeletjie sakrekenaar, 4 bet or fold',
      ogTitle: 'Tuisspeletjie-naspeurder - Poker buy-in bestuurder',
      ogDescription: 'Gratis poker tuisspeletjie-naspeurder. Outomatiese naspooring van buy-ins, cash-outs en speler-balanse.',
      siteName: 'Tuisspeletjie-naspeurder',
      ogLocale: 'af_ZA'
    },
    ca: {
      title: '4 Bet or Fold - Seguiment de partides de pòquer i gestor de buy-ins',
      description: '4 Bet or Fold - Gestor gratuït de partides de pòquer de Wilson Lim. Segueix buy-ins, cash-outs i saldos de jugadors amb verificació automàtica. Perfecte per a partides de pòquer caseres, torneigs i cash games.',
      keywords: 'seguiment de partides caseres, seguiment de pòquer, gestor de partides caseres, seguiment de buy-ins de pòquer, calculadora de cash-outs de pòquer, partida de pòquer casolana, seguiment de saldo de pòquer, gestor de partides de pòquer, calculadora de partides caseres, 4 bet or fold',
      ogTitle: 'Seguiment de partides caseres - Gestor de buy-ins de pòquer',
      ogDescription: 'Seguiment gratuït de partides de pòquer caseres. Segueix automàticament buy-ins, cash-outs i saldos de jugadors.',
      siteName: 'Seguiment de partides caseres',
      ogLocale: 'ca_ES'
    }
  }

  const meta = metadata[locale] || metadata['en']

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    authors: [{ name: 'WilsonLimSet', url: 'https://wilsonlimsetiawan.com' }],
    creator: 'WilsonLimSet',
    publisher: 'WilsonLimSet',
    robots: 'index, follow',
    openGraph: {
      title: meta.ogTitle,
      description: meta.ogDescription,
      type: 'website',
      locale: meta.ogLocale,
      siteName: meta.siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.ogTitle,
      description: meta.ogDescription,
    },
    category: 'games',
  }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
