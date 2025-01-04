import { ImageInfo } from './image-info';
import { Semaphore }  from 'await-semaphore';

export class ImageInfoManager {
  private list: ImageInfo[] = $state([]);
  private pathSet: Set<string> = new Set();
  private semaphore = new Semaphore(1);

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
    console.log(this.list);
    return this.list;
  }
}
