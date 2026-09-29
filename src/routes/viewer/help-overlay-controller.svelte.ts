/**
 * コマンド一覧オーバーレイの表示状態を管理する
 */
export class HelpOverlayController {
  private show = $state(false);

  public open(): void {
    this.show = true;
  }

  public close(): void {
    this.show = false;
  }

  public isShow(): boolean {
    return this.show;
  }
}
