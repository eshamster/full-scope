import { ImageInfo } from './image-info';
import { Semaphore } from 'await-semaphore';
import { ImageShowHistory } from './image-show-history';
import { SvelteSet, SvelteMap } from 'svelte/reactivity';
import type { TagController } from './tag-controller.svelte';
import { getDirPath, getFileName } from './path-utils';

// NOTE: 一度に閲覧する画像の総数はタカが知れている想定なので
// 探索が必要な場合はリストをリニアになめることとする
// （多くても5桁前半ぐらいの想定）

export class ImageInfoManager {
  private originalList: ImageInfo[] = $state([]);
  private filteredList: ImageInfo[] = $state([]);
  private pathSet = new SvelteSet<string>();
  private semaphore = new Semaphore(1);
  private caret: number = $state(0);
  private history: ImageShowHistory = new ImageShowHistory();
  private showImageInfo: boolean = $state(false);
  private activeFilterTags = new SvelteSet<string>();
  private isFiltered: boolean = $state(false);
  private tagController: TagController | null = null;
  private globalRotation: number = $state(0); // グローバル回転角度

  public setTagController(tagController: TagController): void {
    this.tagController = tagController;
  }

  public async addImages(images: ImageInfo[]): Promise<void> {
    // await this.semaphore.use(async () => {
    for (const image of images) {
      if (!this.pathSet.has(image.path)) {
        this.originalList.push(image);
        this.pathSet.add(image.path);
      }
    }
    this.updateDisplayList();
    // })
  }

  public getList(): ImageInfo[] {
    return this.filteredList;
  }

  public getListLength(): number {
    return this.filteredList.length;
  }
  public getCurrent(): ImageInfo {
    if (this.filteredList.length === 0) {
      throw new Error('No images');
    }
    return this.filteredList[this.caret];
  }
  public getCurrentList(count: number): ImageInfo[] {
    if (this.filteredList.length === 0) {
      throw new Error('No images');
    }
    if (count < 1) {
      throw new Error('Invalid count');
    }
    const start = this.caret;
    const end = Math.min(this.filteredList.length, start + count);
    return this.filteredList.slice(start, end);
  }

  public getCaret(): number {
    return this.caret;
  }
  private setCaret(value: number, addsHistory: boolean = false): void {
    const next = Math.max(0, Math.min(this.filteredList.length - 1, value));
    if (addsHistory && this.caret !== next) {
      this.addHistory(this.caret, next);
    }
    this.caret = next;
  }

  // --- 移動関連 --- //

  public gotoNext(step: number = 1): void {
    if (this.caret === this.filteredList.length - 1) {
      this.setCaret(0);
    } else if (this.caret + step >= this.filteredList.length) {
      this.setCaret(this.filteredList.length - 1);
    } else {
      this.setCaret(this.caret + step);
    }
  }
  public gotoPrev(step: number = 1): void {
    if (this.caret === 0) {
      this.setCaret(this.filteredList.length - 1);
    } else if (this.caret - step < 0) {
      this.setCaret(0);
    } else {
      this.setCaret(this.caret - step);
    }
  }
  public gotoRandom(): void {
    if (this.filteredList.length <= 1) {
      return;
    }
    // 現在位置を避けつつランダムに移動
    let next = Math.floor(Math.random() * this.filteredList.length - 1);
    if (next >= this.caret) {
      next++;
    }
    this.setCaret(next, true);
  }
  public gotoAt(imageNumber: number): void {
    // 1ベースのインデックスを0ベースに変換
    const index = imageNumber - 1;
    this.setCaret(index, true);
  }

  public gotoNextBookmark(): void {
    const start = this.caret;
    for (let i = 1; i <= this.filteredList.length; i++) {
      const index = (start + i) % this.filteredList.length;
      if (this.filteredList[index].isBookmarked()) {
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
        this.setCaret(this.filteredList.indexOf(image));
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
        this.setCaret(this.filteredList.indexOf(image));
        return;
      }
    }
  }

  // --- ファイル操作関連 --- //

  public deleteCurrent(): void {
    const current = this.getCurrent();
    this.originalList = this.originalList.filter(image => image !== current);
    this.pathSet.delete(current.path);
    this.updateDisplayList();
    this.setCaret(this.caret);
  }

  // --- 未分類 --- //

  public bookmarkCurrent(): void {
    this.getCurrent().bookmark();
  }
  public countBookmarked(): number {
    return this.filteredList.filter(image => image.isBookmarked()).length;
  }

  // --- 補助 --- //

  private addHistory(prev: number, next: number): void {
    this.history.add(this.filteredList[prev].path, this.filteredList[next].path);
  }

  private findImageByPath(path: string): ImageInfo | null {
    const index = this.filteredList.findIndex(image => image.path === path);
    return index === -1 ? null : this.filteredList[index];
  }

  // --- 画像情報表示 --- //

  public toggleImageInfoDisplay(): void {
    this.showImageInfo = !this.showImageInfo;
  }

  public isImageInfoDisplayed(): boolean {
    return this.showImageInfo;
  }

  // --- タグフィルタ関連 --- //

  public async applyTagFilter(tags: string[]): Promise<void> {
    if (tags.length === 0) {
      this.clearFilter();
      return;
    }

    if (!this.tagController) {
      throw new Error('TagController not set');
    }

    // タグ情報を効率的に取得（ディレクトリ単位でキャッシュ活用）
    const imageTagsMap = await this.getImageTagsMap();

    // OR条件で絞り込み
    this.filteredList = this.originalList.filter(img => {
      const imageTags = imageTagsMap.get(img.path) || [];
      return tags.some(filterTag => imageTags.includes(filterTag));
    });

    this.activeFilterTags.clear();
    tags.forEach(tag => this.activeFilterTags.add(tag));
    this.isFiltered = true;
    this.setCaret(0);
  }

  public clearFilter(): void {
    this.filteredList = [...this.originalList];
    this.activeFilterTags.clear();
    this.isFiltered = false;
    this.setCaret(0);
  }

  public async getAvailableTags(): Promise<string[]> {
    if (!this.tagController) {
      return [];
    }

    // 全画像のユニークなタグを収集
    const imageTagsMap = await this.getImageTagsMap();
    const allTags = new SvelteSet<string>();

    imageTagsMap.forEach(tags => {
      tags.forEach(tag => allTags.add(tag));
    });

    return Array.from(allTags).sort();
  }

  private updateDisplayList(): void {
    if (this.isFiltered) {
      // フィルタが有効な場合は再適用
      const activeTagsArray = Array.from(this.activeFilterTags);
      this.applyTagFilter(activeTagsArray);
    } else {
      // フィルタが無効な場合はそのままコピー
      this.filteredList = [...this.originalList];
    }
  }

  private async getImageTagsMap(): Promise<SvelteMap<string, string[]>> {
    if (!this.tagController) {
      return new SvelteMap();
    }

    // ディレクトリごとにグループ化してバッチ取得
    const dirGroups = new SvelteMap<string, ImageInfo[]>();

    this.originalList.forEach(img => {
      const dirPath = getDirPath(img.path);
      if (!dirGroups.has(dirPath)) {
        dirGroups.set(dirPath, []);
      }
      dirGroups.get(dirPath)!.push(img);
    });

    const imageTagsMap = new SvelteMap<string, string[]>();

    // ディレクトリ単位で並行取得
    await Promise.all(
      Array.from(dirGroups.entries()).map(async ([dirPath, images]) => {
        const tagsMap = await this.tagController!.loadTagsInDir(dirPath);
        images.forEach(img => {
          const fileName = getFileName(img.path);
          imageTagsMap.set(img.path, tagsMap[fileName] || []);
        });
      })
    );

    return imageTagsMap;
  }

  // --- 回転機能関連 --- //

  // グローバル回転操作
  public rotateGlobalRight(): void {
    this.globalRotation = (this.globalRotation + 90) % 360;
  }

  public rotateGlobalLeft(): void {
    this.globalRotation = (this.globalRotation - 90 + 360) % 360;
  }

  public getGlobalRotation(): number {
    return this.globalRotation;
  }

  // グリッド表示対応のローカル回転操作
  public rotateVisibleLocalRight(visibleCount: number): void {
    const visibleImages = this.getCurrentList(visibleCount);
    visibleImages.forEach(image => image.rotateLocalRight());
  }

  public rotateVisibleLocalLeft(visibleCount: number): void {
    const visibleImages = this.getCurrentList(visibleCount);
    visibleImages.forEach(image => image.rotateLocalLeft());
  }

  // 合成回転角度の取得
  public getTotalRotation(imageInfo: ImageInfo): number {
    return (this.globalRotation + imageInfo.getLocalRotation()) % 360;
  }
}
