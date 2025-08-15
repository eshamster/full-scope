/**
 * 編集モード状態管理
 *
 * 画像の拡大・縮小・平行移動機能の編集モード状態を管理する。
 * 編集モード中は通常のナビゲーション操作を無効化し、
 * 変形操作のみを有効にする。
 */
export class EditModeController {
  private isEditMode = $state(false);

  /**
   * 編集モードを開始する
   */
  public enterEditMode(): void {
    this.isEditMode = true;
  }

  /**
   * 編集モードを終了する
   */
  public exitEditMode(): void {
    this.isEditMode = false;
  }

  /**
   * 現在編集モード中かどうかを返す
   */
  public isInEditMode(): boolean {
    return this.isEditMode;
  }

  /**
   * 編集モードの表示テキストを返す
   */
  public getEditModeDisplayText(): string {
    return '編集モード - ドラッグ:移動 ホイール:拡大縮小 Ctrl+R:リセット Esc:終了';
  }
}
