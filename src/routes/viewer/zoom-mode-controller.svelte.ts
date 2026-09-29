import { ZoomGroup } from './zoom-group';

// 拡大率の初期値・刻み幅・上下限 (パーセント)
const DEFAULT_ZOOM_PERCENT = 100;
const ZOOM_STEP_PERCENT = 20;
// 一段階だけ縮小できるようにし、ページ送りのつもりで下スクロールしたときにズームモード中だと気付けるようにする
const MIN_ZOOM_PERCENT = 80;
const MAX_ZOOM_PERCENT = 1000;

/**
 * ズームモード状態管理
 *
 * グリッド全体を一つのキャンバスとして拡大・縮小・移動する。
 * 各画像の変形 (編集モード) とは独立しており、キャンバスの変形はページ遷移・モード終了時にリセットする。
 */
export class ZoomModeController {
  private active = $state(false);
  private group: ZoomGroup | null = null;

  private scalePercent = $state(DEFAULT_ZOOM_PERCENT);
  // キャンバス中心の画面中心からのずれ (px)
  private offsetX = $state(0);
  private offsetY = $state(0);

  /**
   * ズームモードを開始する。組の区切りは開始時の先頭位置で決める
   */
  public enter(startIndex: number, cells: number): void {
    this.group = new ZoomGroup(startIndex, cells);
    this.resetTransform();
    this.active = true;
  }

  public exit(): void {
    this.active = false;
    this.group = null;
    this.resetTransform();
  }

  public isActive(): boolean {
    return this.active;
  }

  /**
   * モード中の組の区切り (モード外では null)
   */
  public getGroup(): ZoomGroup | null {
    return this.group;
  }

  // --- キャンバスの変形 --- //

  public zoomIn(): void {
    this.setScalePercent(this.scalePercent + ZOOM_STEP_PERCENT);
  }

  public zoomOut(): void {
    this.setScalePercent(this.scalePercent - ZOOM_STEP_PERCENT);
  }

  // 画面中央に映っている点が動かないように、ずれも拡大率に合わせて伸縮する
  private setScalePercent(percent: number): void {
    const next = Math.max(MIN_ZOOM_PERCENT, Math.min(MAX_ZOOM_PERCENT, percent));
    const ratio = next / this.scalePercent;
    this.offsetX *= ratio;
    this.offsetY *= ratio;
    this.scalePercent = next;
  }

  /**
   * カーソルの移動量に応じてキャンバスを逆方向へ動かす (移動範囲の制限はしない)
   */
  public move(deltaX: number, deltaY: number): void {
    this.offsetX -= deltaX;
    this.offsetY -= deltaY;
  }

  public resetTransform(): void {
    this.scalePercent = DEFAULT_ZOOM_PERCENT;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  public getScalePercent(): number {
    return this.scalePercent;
  }

  public getOffsetX(): number {
    return this.offsetX;
  }

  public getOffsetY(): number {
    return this.offsetY;
  }

  /**
   * キャンバス (グリッド) に適用する CSS transform
   */
  public getCanvasTransform(): string {
    return `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scalePercent / 100})`;
  }
}
