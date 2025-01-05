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

  public gotoNext(): void {
    if (this.caret + 1 >= this.list.length) {
      this.setCaret(0);
    } else {
      this.setCaret(this.caret + 1);
    }
  }
  public gotoPrev(): void {
    if (this.caret - 1 < 0) {
      this.setCaret(this.list.length - 1);
    } else {
      this.setCaret(this.caret - 1);
    }
  }
  public goto(value: number): void {
    this.setCaret(value);
  }
}
