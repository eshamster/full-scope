import { ImageInfo } from './image-info';
import { Semaphore }  from 'await-semaphore';

export class ImageInfoManager {
  private list: ImageInfo[] = $state([]);
  private pathSet: Set<string> = new Set();
  private semaphore = new Semaphore(1);
  private caret: number = $state(0);

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

  public getCaret(): number {
    return this.caret;
  }
  private setCaret(value: number): void {
    this.caret = Math.max(0, Math.min(this.list.length - 1, value));
  }

  // --- 移動関連 --- //

  public gotoNext(step: number = 1): void {
    console.log(this.caret);
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
    this.setCaret(Math.floor(Math.random() * this.list.length));
  }
  public gotoAt(value: number): void {
    this.setCaret(value);
  }

  // --- ファイル操作関連 --- //

  public deleteCurrent(): void {
    const current = this.getCurrent();
    this.list = this.list.filter((image) => image !== current);
    this.pathSet.delete(current.path);
    this.setCaret(this.caret);
  }
}
