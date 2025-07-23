type GotoDialogCallback = (index: number | null) => void;

export class GotoDialogController {
  private show: boolean = $state(false);
  private value: string = $state('');
  private maxIndex: number = $state(1);
  private callback: GotoDialogCallback | null = null;

  public showDialog(maxIndex: number, callback: GotoDialogCallback): void {
    this.show = true;
    this.value = '';
    this.maxIndex = maxIndex;
    this.callback = callback;
  }

  public handleDialogSubmit(inputValue: string): void {
    const index = this.parseAndValidateIndex(inputValue);
    if (this.callback) {
      this.callback(index);
    }
    this.closeDialog();
  }

  public handleDialogCancel(): void {
    if (this.callback) {
      this.callback(null);
    }
    this.closeDialog();
  }

  private closeDialog(): void {
    this.show = false;
    this.value = '';
    this.callback = null;
  }

  private parseAndValidateIndex(inputValue: string): number | null {
    const num = parseInt(inputValue.trim(), 10);
    if (isNaN(num)) {
      return null;
    }

    // エッジケース処理
    if (num < 1) {
      return 1;
    }
    if (num > this.maxIndex) {
      return this.maxIndex;
    }

    return num;
  }

  public isShow(): boolean {
    return this.show;
  }

  public getValue(): string {
    return this.value;
  }

  public setValue(value: string): void {
    this.value = value;
  }

  public getMaxIndex(): number {
    return this.maxIndex;
  }
}
