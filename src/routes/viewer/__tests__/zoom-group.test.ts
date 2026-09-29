import { describe, it, expect } from 'vitest';
import { ZoomGroup } from '../zoom-group';

describe('ZoomGroup', () => {
  it('表示枚数が 1 未満の場合はエラー', () => {
    expect(() => new ZoomGroup(0, 0)).toThrow('Invalid cells');
  });

  describe('区切りのずれがない場合 (2枚組: 1-2, 3-4, ...)', () => {
    const group = new ZoomGroup(2, 2);

    it('align は組の先頭を返す', () => {
      expect([0, 1, 2, 3, 4].map(i => group.align(i))).toEqual([0, 0, 2, 2, 4]);
    });

    it('countFrom は末尾の半端な組を半端なまま数える', () => {
      expect(group.countFrom(0, 5)).toBe(2);
      expect(group.countFrom(4, 5)).toBe(1);
    });

    it('next は組単位で進み、末尾の組から先頭へ折り返す', () => {
      expect(group.next(0, 5)).toBe(2);
      expect(group.next(2, 5)).toBe(4);
      expect(group.next(4, 5)).toBe(0);
    });

    it('prev は組単位で戻り、先頭の組から末尾の組へ折り返す', () => {
      expect(group.prev(4, 5)).toBe(2);
      expect(group.prev(2, 5)).toBe(0);
      expect(group.prev(0, 5)).toBe(4);
    });
  });

  describe('区切りがずれている場合 (2枚組: 1, 2-3, 4-5, ...)', () => {
    const group = new ZoomGroup(3, 2);

    it('align は先頭の半端な組を含めて組の先頭を返す', () => {
      expect([0, 1, 2, 3, 4, 5].map(i => group.align(i))).toEqual([0, 1, 1, 3, 3, 5]);
    });

    it('countFrom は先頭・末尾の半端な組を半端なまま数える', () => {
      expect(group.countFrom(0, 6)).toBe(1);
      expect(group.countFrom(1, 6)).toBe(2);
      expect(group.countFrom(5, 6)).toBe(1);
    });

    it('next / prev は半端な組も 1 ページとして扱う', () => {
      expect(group.next(0, 6)).toBe(1);
      expect(group.next(3, 6)).toBe(5);
      expect(group.next(5, 6)).toBe(0);
      expect(group.prev(1, 6)).toBe(0);
      expect(group.prev(0, 6)).toBe(5);
    });
  });

  it('1枚表示では 1 枚ずつ進む', () => {
    const group = new ZoomGroup(3, 1);
    expect(group.align(3)).toBe(3);
    expect(group.countFrom(3, 5)).toBe(1);
    expect(group.next(3, 5)).toBe(4);
    expect(group.prev(3, 5)).toBe(2);
  });

  it('全体が 1 組に収まる場合は同じ組に留まる', () => {
    const group = new ZoomGroup(0, 4);
    expect(group.countFrom(0, 3)).toBe(3);
    expect(group.next(0, 3)).toBe(0);
    expect(group.prev(0, 3)).toBe(0);
  });
});
