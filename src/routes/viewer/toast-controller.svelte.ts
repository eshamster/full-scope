export class ToastController {
  private show: boolean = $state(false);
  private message: string = $state('');
  private closeTimerId: number | null = null;

  public showToast(message: string): void {
    this.show = true;
    this.message = message;

    if (this.closeTimerId) {
      window.clearTimeout(this.closeTimerId);
    }
    this.closeTimerId = window.setTimeout(() => {
      this.show = false;
    }, 1000);
  }

  public isShow(): boolean {
    return this.show;
  }
  public getMessage(): string {
    return this.message;
  }
}
