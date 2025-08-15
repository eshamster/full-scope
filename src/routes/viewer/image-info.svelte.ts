export class ImageInfo {
  private tempBookmark: boolean = false;
  private localRotation: number = $state(0); // ローカル回転角度（0, 90, 180, 270度）

  // 変形状態（パーセント単位）
  private scalePercent: number = $state(100); // デフォルト100%
  private positionX: number = $state(0);
  private positionY: number = $state(0);

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

  // 変形操作
  public scaleUp(): void {
    this.scalePercent = Math.min(this.scalePercent + 10, 1000); // 上限1000%
  }

  public scaleDown(): void {
    this.scalePercent = Math.max(this.scalePercent - 10, 10); // 下限10%
  }

  public movePosition(deltaX: number, deltaY: number, rotation: number): void {
    // 画面上のドラッグ方向にそのまま移動（回転補正なし）
    // これにより最も直感的な操作感を実現
    this.positionX += deltaX;
    this.positionY += deltaY;
  }

  public resetTransform(): void {
    this.scalePercent = 100;
    this.positionX = 0;
    this.positionY = 0;
    this.localRotation = 0;
  }

  // ゲッター
  public getScalePercent(): number {
    return this.scalePercent;
  }

  public getScaleRatio(): number {
    return this.scalePercent / 100;
  }

  public getPositionX(): number {
    return this.positionX;
  }

  public getPositionY(): number {
    return this.positionY;
  }
}
