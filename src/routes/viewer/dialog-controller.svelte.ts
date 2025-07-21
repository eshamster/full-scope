type dialogCallback = (result: boolean) => void;

export class DialogController {
  private show: boolean = $state(false);
  private message: string = $state('');
  private callback: dialogCallback | null = null;

  public showDialog(message: string, callback: dialogCallback): void {
    this.show = true;
    this.message = message;
    this.callback = callback;
  }

  public handleDialogNotify(result: boolean): void {
    if (this.callback) {
      this.callback(result);
    }
    this.show = false;
    this.message = '';
    this.callback = null;
  }

  public isShow(): boolean {
    return this.show;
  }
  public getMessage(): string {
    return this.message;
  }
}
