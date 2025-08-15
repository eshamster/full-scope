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
    const radians = (rotation * Math.PI) / 180;

    // 回転を考慮した座標変換（スケール補正は行わない）
    const adjustedDeltaX = deltaX * Math.cos(-radians) - deltaY * Math.sin(-radians);
    const adjustedDeltaY = deltaX * Math.sin(-radians) + deltaY * Math.cos(-radians);

    this.positionX += adjustedDeltaX;
    this.positionY += adjustedDeltaY;
  }

  public resetTransform(): void {
    this.scalePercent = 100;
    this.positionX = 0;
    this.positionY = 0;
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
