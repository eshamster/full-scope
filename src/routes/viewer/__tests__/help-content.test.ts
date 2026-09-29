import { describe, it, expect } from 'vitest';
import { buildHelpSections, formatKey, HELP_CATEGORIES } from '../help-content';
import { getKeyConfigs } from '../controller';

describe('formatKey', () => {
  it('英字は大文字で表記する', () => {
    expect(formatKey('x', [])).toBe('X');
  });

  it('特殊キーは記号や日本語で表記する', () => {
    expect(formatKey('ArrowRight', [])).toBe('→');
    expect(formatKey('WheelDown', [])).toBe('ホイール↓');
    expect(formatKey('RightClick', [])).toBe('右クリック');
    expect(formatKey('Escape', [])).toBe('Esc');
  });

  it('修飾キーは Ctrl, Shift, Alt の順で前置する', () => {
    expect(formatKey('e', ['shift', 'ctrl'])).toBe('Ctrl+Shift+E');
    expect(formatKey('WheelUp', ['shift'])).toBe('Shift+ホイール↑');
  });

  it('記号キーでは Shift を表記しない', () => {
    expect(formatKey('?', ['shift'])).toBe('?');
  });
});

describe('buildHelpSections', () => {
  it('同じ操作のキーを 1 行にまとめる', () => {
    const sections = buildHelpSections([
      { key: 'ArrowRight', operation: 'next', modifierKeys: [] },
      { key: 'x', operation: 'next', modifierKeys: [] },
    ]);
    expect(sections).toEqual([
      { category: 'ナビゲーション', items: [{ description: '次の画像', keys: ['→', 'X'] }] },
    ]);
  });

  it('カテゴリの定義順・カテゴリ内の操作の定義順で並べ、キーのない操作とカテゴリは省く', () => {
    const sections = buildHelpSections([
      { key: '?', operation: 'showHelp', modifierKeys: ['shift'] },
      { key: 'z', operation: 'prev', modifierKeys: [] },
      { key: 'x', operation: 'next', modifierKeys: [] },
    ]);
    expect(sections.map(section => section.category)).toEqual(['ナビゲーション', 'その他']);
    expect(sections[0].items.map(item => item.description)).toEqual(['次の画像', '前の画像']);
  });

  it.each(['View', 'Edit', 'Zoom'] as const)('%s モードの全キー設定が一覧に含まれる', mode => {
    const configs = getKeyConfigs(mode);
    const sections = buildHelpSections(configs);
    const keyCount = sections.flatMap(section => section.items).flatMap(item => item.keys).length;
    expect(keyCount).toBe(configs.length);
    sections.forEach(section => expect(HELP_CATEGORIES).toContain(section.category));
  });
});
