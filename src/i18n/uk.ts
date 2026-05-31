import type { Card, CardColor } from '../types/game';

export interface Translations {
  cardLabel: (card: Card) => string;
  log: {
    colorName: (color: CardColor) => string;
    gameStarted: (cardName: string) => string;
    startingSkip: (playerName: string) => string;
    startingReverseSkip: string;
    directionReversedFirst: (playerName: string) => string;
    startingDraw2: (playerName: string) => string;
    unoPenalty: (playerName: string) => string;
    cardPlayed: (playerName: string, cardName: string) => string;
    playerWins: (playerName: string) => string;
    playerSkipped: (playerName: string) => string;
    directionReversed: string;
    playsAgain: (playerName: string) => string;
    playerDrawsSkipped: (playerName: string, count: number) => string;
    colorChosen: (playerName: string, colorName: string) => string;
    drawPileReshuffled: string;
    playerDrawsCard: (playerName: string) => string;
    playerCannotPlay: (playerName: string) => string;
    playerPasses: (playerName: string) => string;
    unoCalled: (playerName: string) => string;
    drawPileEmpty: string;
  };
  home: {
    solo: string;
    soloSub: string;
    together: string;
    togetherSub: string;
    install: string;
    installed: string;
  };
  setup: {
    title: string;
    back: string;
    createTab: string;
    joinTab: string;
    nameLabel: string;
    namePlaceholder: string;
    codeLabel: string;
    creating: string;
    joining: string;
    createBtn: string;
    joinBtn: string;
  };
  lobby: {
    title: string;
    roomCode: string;
    shareHint: string;
    players: string;
    ready: string;
    disconnected: string;
    waitingForHost: string;
    startGame: string;
    leave: string;
  };
  game: {
    yourTurn: string;
    sTurn: (name: string) => string;
    clockwise: string;
    counterClockwise: string;
    drawPile: (n: number) => string;
    discard: string;
    yourHand: (n: number) => string;
    uno: string;
    pass: string;
    drawCard: string;
    noPlayableCard: string;
    leave: string;
    left: string;
    drawnHint: (card: string) => string;
    timer: (s: number) => string;
    youWin: string;
    winsTitle: (name: string) => string;
    congrats: string;
    betterLuck: string;
    cardsRemaining: string;
    you: string;
    backHome: string;
    cards: (n: number) => string;
    newGame: string;
    thinking: string;
  };
  passDevice: {
    title: (playerName: string) => string;
    instruction: (playerName: string) => string;
    reveal: string;
  };
  confirm: {
    leaveTitle: string;
    leaveBody: string;
    cancel: string;
    leave: string;
  };
}

const UK_COLORS: Record<string, string> = { red: 'червона', green: 'зелена', blue: 'синя', yellow: 'жовта' };
const UK_VALUES: Partial<Record<string, string>> = { skip: 'Пропуск', reverse: 'Реверс', draw2: '+2', wild: 'Дика', wild4: 'Дика +4' };
const UK_COLOR_NAMES: Record<string, string> = { red: 'червоний', green: 'зелений', blue: 'синій', yellow: 'жовтий', wild: '' };

export const uk: Translations = {
  cardLabel: (card) => {
    const value = UK_VALUES[card.value] ?? card.value;
    return card.color !== 'wild' ? `${UK_COLORS[card.color]} ${value}` : value;
  },
  log: {
    colorName: (color) => UK_COLOR_NAMES[color] ?? color,
    gameStarted: (cardName) => `Гра почалась! Перша карта: ${cardName}`,
    startingSkip: (name) => `${name} пропускається стартовою картою!`,
    startingReverseSkip: 'Реверс з 2 гравцями = Пропуск — перший гравець пропускається!',
    directionReversedFirst: (name) => `Напрямок змінено! ${name} ходить першим.`,
    startingDraw2: (name) => `Стартова карта +2! ${name} бере 2 та пропускається.`,
    unoPenalty: (name) => `${name} забув УНО! Бере 2 штрафні карти.`,
    cardPlayed: (name, cardName) => `${name} зіграв ${cardName}`,
    playerWins: (name) => `🎉 ${name} виграє гру!`,
    playerSkipped: (name) => `${name} пропускається!`,
    directionReversed: 'Напрямок змінено!',
    playsAgain: (name) => `Реверс! ${name} ходить знову.`,
    playerDrawsSkipped: (name, n) => `${name} бере ${n} та пропускається!`,
    colorChosen: (name, colorName) => `${name} обирає ${colorName}`,
    drawPileReshuffled: 'Колода вичерпана — стопка скидів перемішана.',
    playerDrawsCard: (name) => `${name} бере карту`,
    playerCannotPlay: (name) => `${name} не може зіграти та пасує`,
    playerPasses: (name) => `${name} пасує`,
    unoCalled: (name) => `${name} каже УНО!`,
    drawPileEmpty: 'Більше карток немає!',
  },
  home: {
    solo: 'Один / Місцева',
    soloSub: 'проти ШІ або передай пристрій',
    together: 'Грати разом',
    togetherSub: 'локальна WiFi або інтернет',
    install: '📲 Встановити додаток',
    installed: '✅ Додаток встановлено',
  },
  setup: {
    title: 'Грати разом',
    back: '← Назад',
    createTab: 'Створити кімнату',
    joinTab: 'Приєднатися',
    nameLabel: "Ваше ім'я",
    namePlaceholder: "Введіть ваше ім'я",
    codeLabel: 'Код кімнати',
    creating: 'Створення…',
    joining: 'Приєднання…',
    createBtn: 'Створити кімнату',
    joinBtn: 'Приєднатися',
  },
  lobby: {
    title: 'Зал очікування',
    roomCode: 'Код кімнати',
    shareHint: 'Поділіться кодом з друзями',
    players: 'Гравці',
    ready: 'Готовий',
    disconnected: 'Відключився',
    waitingForHost: 'Очікуємо хоста для початку гри…',
    startGame: 'Почати гру',
    leave: 'Вийти',
  },
  game: {
    yourTurn: 'Ваш хід',
    sTurn: (name) => `Хід ${name}`,
    clockwise: '▶ За годинниковою',
    counterClockwise: '◀ Проти годинникової',
    drawPile: (n) => `Взяти (${n})`,
    discard: 'Відбій',
    yourHand: (n) => `Ваші карти (${n})`,
    uno: 'УНО!',
    pass: 'Пропустити (залишити карту)',
    drawCard: 'Взяти карту',
    noPlayableCard: 'Зіграйте карту',
    leave: 'Вийти',
    left: '(пішов)',
    drawnHint: (card) => `Ви взяли ${card}. Зіграйте або пропустіть.`,
    timer: (s) => `${s}с`,
    youWin: 'Ви виграли!',
    winsTitle: (name) => `${name} виграє!`,
    congrats: 'Вітаємо!',
    betterLuck: 'Наступного разу пощастить!',
    cardsRemaining: 'Карти що залишились',
    you: 'Ви',
    backHome: 'На головну',
    newGame: 'Нова гра',
    thinking: 'Думає…',
    cards: (n) => n === 1 ? '1 карта' : `${n} карт`,
  },
  passDevice: {
    title: (name) => `Хід ${name}`,
    instruction: (name) => `Передайте пристрій ${name}, потім торкніться щоб показати карти.`,
    reveal: 'Показати мої карти',
  },
  confirm: {
    leaveTitle: 'Вийти з гри?',
    leaveBody: 'Ви втратите поточну гру.',
    cancel: 'Скасувати',
    leave: 'Вийти',
  },
};
