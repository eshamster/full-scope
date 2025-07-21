class ImageShowHistoryElem {
  constructor(
    private prevPath: string,
    private nextPath: string
  ) {}

  public getPrevPath(): string {
    return this.prevPath;
  }
  public getNextPath(): string {
    return this.nextPath;
  }
}

const maxHistory = 500;

export class ImageShowHistory {
  private history: ImageShowHistoryElem[] = [];
  private current: number = 0;

  public add(prevPath: string, nextPath: string): void {
    this.history = this.history.slice(0, this.current);
    this.history.push(new ImageShowHistoryElem(prevPath, nextPath));
    if (this.history.length > maxHistory) {
      this.history = this.history.slice(1);
    }
    this.current = this.history.length;
  }

  public gotoPrevPath(): string | null {
    if (this.current <= 0) {
      return null;
    }
    this.current--;
    return this.history[this.current].getPrevPath();
  }

  public gotoNextPath(): string | null {
    if (this.current >= this.history.length) {
      return null;
    }
    const result = this.history[this.current].getNextPath();
    this.current++;
    return result;
  }
}
