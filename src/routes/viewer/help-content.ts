import type { keyConfig, ModifierKey, Mode, Operation } from './controller';

// コマンド一覧に表示するカテゴリ (配列順に表示する)
export const HELP_CATEGORIES = [
  'ナビゲーション',
  'ブックマーク',
  '表示レイアウト',
  '回転',
  '編集モード',
  'ズームモード',
  'タグ・ファイル',
  'その他',
] as const;

export type HelpCategory = (typeof HELP_CATEGORIES)[number];

// 各操作のカテゴリと説明 (カテゴリ内ではこの定義順に表示する)
const operationHelps: Record<Operation, { category: HelpCategory; description: string }> = {
  next: { category: 'ナビゲーション', description: '次の画像' },
  prev: { category: 'ナビゲーション', description: '前の画像' },
  nextJump: { category: 'ナビゲーション', description: '先へジャンプ' },
  prevJump: { category: 'ナビゲーション', description: '前へジャンプ' },
  randomJump: { category: 'ナビゲーション', description: 'ランダムジャンプ' },
  goto: { category: 'ナビゲーション', description: '番号を指定して移動' },
  prevHistory: { category: 'ナビゲーション', description: '履歴を戻る' },
  nextHistory: { category: 'ナビゲーション', description: '履歴を進む' },
  bookmark: { category: 'ブックマーク', description: 'ブックマーク切り替え' },
  gotoBookmark: { category: 'ブックマーク', description: '次のブックマークへ' },
  incrementRows: { category: '表示レイアウト', description: '行を増やす' },
  decrementRows: { category: '表示レイアウト', description: '行を減らす' },
  incrementCols: { category: '表示レイアウト', description: '列を増やす' },
  decrementCols: { category: '表示レイアウト', description: '列を減らす' },
  toggleFlip: { category: '表示レイアウト', description: 'フリップ切り替え' },
  toggleAdjacent: { category: '表示レイアウト', description: '隣接表示切り替え' },
  toggleImageInfo: { category: '表示レイアウト', description: 'ファイル情報表示切り替え' },
  rotateGlobalRight: { category: '回転', description: '全体を右回転' },
  rotateGlobalLeft: { category: '回転', description: '全体を左回転' },
  rotateLocalRight: { category: '回転', description: '表示中の画像を右回転' },
  rotateLocalLeft: { category: '回転', description: '表示中の画像を左回転' },
  enterEditMode: { category: '編集モード', description: '編集モード開始' },
  exitEditMode: { category: '編集モード', description: '編集モード終了' },
  scaleUp: { category: '編集モード', description: '拡大' },
  scaleDown: { category: '編集モード', description: '縮小' },
  resetTransform: { category: '編集モード', description: '変形をリセット' },
  enterZoomMode: { category: 'ズームモード', description: 'ズームモード開始' },
  exitZoomMode: { category: 'ズームモード', description: 'ズームモード終了' },
  zoomIn: { category: 'ズームモード', description: '拡大' },
  zoomOut: { category: 'ズームモード', description: '縮小' },
  nextPage: { category: 'ナビゲーション', description: '次のページ (表示枚数分)' },
  prevPage: { category: 'ナビゲーション', description: '前のページ (表示枚数分)' },
  editTags: { category: 'タグ・ファイル', description: 'タグ編集' },
  filterByTag: { category: 'タグ・ファイル', description: 'タグで絞り込み' },
  delete: { category: 'タグ・ファイル', description: 'ゴミ箱へ移動' },
  showHelp: { category: 'その他', description: 'コマンド一覧' },
};

export type HelpItem = {
  description: string;
  keys: string[];
};

export type HelpSection = {
  category: HelpCategory;
  items: HelpItem[];
};

const modeLabels: Record<Mode, string> = {
  View: '通常モード',
  Edit: '編集モード',
  Zoom: 'ズームモード',
};

export function getModeLabel(mode: Mode): string {
  return modeLabels[mode];
}

const keyLabels: Record<string, string> = {
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowDown: '↓',
  WheelUp: 'ホイール↑',
  WheelDown: 'ホイール↓',
  LeftClick: '左クリック',
  RightClick: '右クリック',
  MiddleClick: '中クリック',
  Escape: 'Esc',
};

const modifierOrder: ModifierKey[] = ['ctrl', 'shift', 'alt'];
const modifierLabels: Record<ModifierKey, string> = {
  ctrl: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
};

/**
 * キー設定を表示用の文字列に変換する (例: Ctrl+Shift+E, →, ホイール↓)
 */
export function formatKey(key: string, modifierKeys: ModifierKey[]): string {
  // '?' のような記号は Shift 込みで入力されるため Shift を表記しない
  const isSymbol = key.length === 1 && !/[a-z0-9]/i.test(key);
  const modifiers = modifierOrder
    .filter(modifier => modifierKeys.includes(modifier))
    .filter(modifier => !(isSymbol && modifier === 'shift'))
    .map(modifier => modifierLabels[modifier]);
  const label = keyLabels[key] ?? (key.length === 1 ? key.toUpperCase() : key);
  return [...modifiers, label].join('+');
}

/**
 * キー設定からカテゴリ別のコマンド一覧を組み立てる
 * 同じ操作に割り当てられたキーは 1 行にまとめる
 */
export function buildHelpSections(configs: keyConfig[]): HelpSection[] {
  const keysByOperation = new Map<Operation, string[]>();
  configs.forEach(({ key, operation, modifierKeys }) => {
    const keys = keysByOperation.get(operation) ?? [];
    keys.push(formatKey(key, modifierKeys));
    keysByOperation.set(operation, keys);
  });

  const operations = Object.keys(operationHelps) as Operation[];
  return HELP_CATEGORIES.map(category => ({
    category,
    items: operations
      .filter(operation => operationHelps[operation].category === category)
      .filter(operation => keysByOperation.has(operation))
      .map(operation => ({
        description: operationHelps[operation].description,
        keys: keysByOperation.get(operation) ?? [],
      })),
  })).filter(section => section.items.length > 0);
}
