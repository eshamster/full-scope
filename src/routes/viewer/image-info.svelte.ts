export class ImageInfo {
  private tempBookmark: boolean = false;
  private localRotation: number = $state(0); // ローカル回転角度（0, 90, 180, 270度）

  constructor(public path: string) {}

  public bookmark(): void {
    this.tempBookmark = !this.tempBookmark;
  }
  public isBookmarked(): boolean {
    return this.tempBookmark;
  }

  public rotateLocalRight(): void {
    this.localRotation = (this.localRotation + 90) % 360;
  }

  public rotateLocalLeft(): void {
    this.localRotation = (this.localRotation - 90 + 360) % 360;
  }

  public getLocalRotation(): number {
    return this.localRotation;
  }
}
