/**
 * ズームモード中のページ (表示する画像の組) の区切りを計算する
 *
 * 組の区切りはモード開始時の先頭位置で決まり、モード中はその区切りを維持する。
 * 例. 2枚組で 2 枚目 (index 1) から開始した場合: [0], [1-2], [3-4], ...
 * 先頭・末尾の半端な組は半端なまま扱う。
 */
export class ZoomGroup {
  // 区切りのずれ量 (0 <= offset < cells)
  private readonly offset: number;

  constructor(
    startIndex: number,
    private readonly cells: number
  ) {
    if (cells < 1) {
      throw new Error('Invalid cells');
    }
    this.offset = startIndex % cells;
  }

  /**
   * index を含む組の先頭位置を返す
   */
  public align(index: number): number {
    if (index < this.offset) {
      return 0;
    }
    return this.offset + Math.floor((index - this.offset) / this.cells) * this.cells;
  }

  /**
   * start から始まる組に含まれる枚数を返す
   */
  public countFrom(start: number, length: number): number {
    const end = start < this.offset ? this.offset : start + this.cells;
    return Math.min(end, length) - start;
  }

  /**
   * 次の組の先頭位置を返す (末尾の組からは先頭の組へ折り返す)
   */
  public next(start: number, length: number): number {
    const end = start + this.countFrom(start, length);
    return end >= length ? 0 : end;
  }

  /**
   * 前の組の先頭位置を返す (先頭の組からは末尾の組へ折り返す)
   */
  public prev(start: number, length: number): number {
    return start <= 0 ? this.align(length - 1) : this.align(start - 1);
  }
}
