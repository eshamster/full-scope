export class ImageInfo {
  private tempBookmark: boolean = false;

  constructor(
    public path: string,
  ) { }

  public bookmark(): void {
    this.tempBookmark = !this.tempBookmark;
  }
  public isBookmarked(): boolean {
    return this.tempBookmark;
  }
}
