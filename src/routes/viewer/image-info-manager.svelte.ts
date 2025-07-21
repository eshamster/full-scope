import { ImageInfo } from './image-info';
import { Semaphore } from 'await-semaphore';
import { ImageShowHistory } from './image-show-history';
import { SvelteSet } from 'svelte/reactivity';

// NOTE: 一度に閲覧する画像の総数はタカが知れている想定なので
// 探索が必要な場合はリストをリニアになめることとする
// （多くても5桁前半ぐらいの想定）

export class ImageInfoManager {
  private list: ImageInfo[] = $state([]);
  private pathSet = new SvelteSet<string>();
  private semaphore = new Semaphore(1);
  private caret: number = $state(0);
  private history: ImageShowHistory = new ImageShowHistory();

  public async addImages(images: ImageInfo[]): Promise<void> {
    // await this.semaphore.use(async () => {
    for (const image of images) {
      if (!this.pathSet.has(image.path)) {
        this.list.push(image);
        this.pathSet.add(image.path);
      }
    }
    // })
  }

  public getList(): ImageInfo[] {
    return this.list;
  }
  public getCurrent(): ImageInfo {
    if (this.list.length === 0) {
      throw new Error('No images');
    }
    return this.list[this.caret];
  }
  public getCurrentList(count: number): ImageInfo[] {
    if (this.list.length === 0) {
      throw new Error('No images');
    }
    if (count < 1) {
      throw new Error('Invalid count');
    }
    const start = this.caret;
    const end = Math.min(this.list.length, start + count);
    return this.list.slice(start, end);
  }

  public getCaret(): number {
    return this.caret;
  }
  private setCaret(value: number, addsHistory: boolean = false): void {
    const next = Math.max(0, Math.min(this.list.length - 1, value));
    if (addsHistory && this.caret !== next) {
      this.addHistory(this.caret, next);
    }
    this.caret = next;
  }

  // --- 移動関連 --- //

  public gotoNext(step: number = 1): void {
    if (this.caret === this.list.length - 1) {
      this.setCaret(0);
    } else if (this.caret + step >= this.list.length) {
      this.setCaret(this.list.length - 1);
    } else {
      this.setCaret(this.caret + step);
    }
  }
  public gotoPrev(step: number = 1): void {
    if (this.caret === 0) {
      this.setCaret(this.list.length - 1);
    } else if (this.caret - step < 0) {
      this.setCaret(0);
    } else {
      this.setCaret(this.caret - step);
    }
  }
  public gotoRandom(): void {
    if (this.list.length <= 1) {
      return;
    }
    // 現在位置を避けつつランダムに移動
    let next = Math.floor(Math.random() * this.list.length - 1);
    if (next >= this.caret) {
      next++;
    }
    this.setCaret(next, true);
  }
  public gotoAt(value: number): void {
    this.setCaret(value);
  }

  public gotoNextBookmark(): void {
    const start = this.caret;
    for (let i = 1; i <= this.list.length; i++) {
      const index = (start + i) % this.list.length;
      if (this.list[index].isBookmarked()) {
        this.setCaret(index);
        return;
      }
    }
  }

  // NOTE: goto(Next|Prev)History は
  // 最悪で O(N*M) (N: 画像数, M: 履歴数) になるが、
  // 履歴を深く辿ることは稀なはず（履歴上の画像が多数削除されているケース）で、
  // 実質的には O(N) とみなして良い
  public gotoNextHistory(): void {
    for (
      let next = this.history.gotoNextPath();
      next !== null;
      next = this.history.gotoNextPath()
    ) {
      const image = this.findImageByPath(next);
      if (image !== null) {
        this.setCaret(this.list.indexOf(image));
        return;
      }
    }
  }
  public gotoPrevHistory(): void {
    for (
      let prev = this.history.gotoPrevPath();
      prev !== null;
      prev = this.history.gotoPrevPath()
    ) {
      const image = this.findImageByPath(prev);
      if (image !== null) {
        this.setCaret(this.list.indexOf(image));
        return;
      }
    }
  }

  // --- ファイル操作関連 --- //

  public deleteCurrent(): void {
    const current = this.getCurrent();
    this.list = this.list.filter(image => image !== current);
    this.pathSet.delete(current.path);
    this.setCaret(this.caret);
  }

  // --- 未分類 --- //

  public bookmarkCurrent(): void {
    this.getCurrent().bookmark();
  }
  public countBookmarked(): number {
    return this.list.filter(image => image.isBookmarked()).length;
  }

  // --- 補助 --- //

  private addHistory(prev: number, next: number): void {
    this.history.add(this.list[prev].path, this.list[next].path);
  }

  private findImageByPath(path: string): ImageInfo | null {
    const index = this.list.findIndex(image => image.path === path);
    return index === -1 ? null : this.list[index];
  }
}
