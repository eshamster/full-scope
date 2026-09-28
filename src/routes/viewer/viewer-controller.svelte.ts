const MAX_ROWS = 10;
const MAX_COLS = 10;
const CELL_NUMBERS_DISPLAY_MS = 500;

export type HorizontalAlign = 'center' | 'left' | 'right';

export class ViewerController {
  // グリッド表示の行列数管理
  private rows: number = $state(1);
  private cols: number = $state(1);
  // 複数枚表示時の並び順を左右反転するか
  private flipped: boolean = $state(false);
  // 奇数列を右寄せ・偶数列を左寄せにして隣り合う画像を隣接させるか
  private adjacent: boolean = $state(false);
  // フリップ直後に各セルの連番を一時表示するか
  private cellNumbersVisible: boolean = $state(false);
  private cellNumbersTimerId: number | null = null;

  private setRows(rows: number): void {
    this.rows = Math.max(1, Math.min(rows, MAX_ROWS));
  }

  private setCols(cols: number): void {
    this.cols = Math.max(1, Math.min(cols, MAX_COLS));
  }

  public incrementRows(): void {
    this.setRows(this.rows + 1);
  }
  public decrementRows(): void {
    this.setRows(this.rows - 1);
  }
  public incrementCols(): void {
    this.setCols(this.cols + 1);
  }
  public decrementCols(): void {
    this.setCols(this.cols - 1);
  }

  public getRows(): number {
    return this.rows;
  }
  public getCols(): number {
    return this.cols;
  }

  public toggleFlip(): void {
    this.flipped = !this.flipped;
  }
  public isFlipped(): boolean {
    return this.flipped;
  }

  // セルの並び順を把握しやすくするため、連番を短時間表示する (1セルのみの場合は並び順の情報にならないため表示しない)
  public showCellNumbers(): void {
    if (this.getCells() < 2) {
      return;
    }
    this.cellNumbersVisible = true;

    if (this.cellNumbersTimerId) {
      window.clearTimeout(this.cellNumbersTimerId);
    }
    this.cellNumbersTimerId = window.setTimeout(() => {
      this.cellNumbersVisible = false;
    }, CELL_NUMBERS_DISPLAY_MS);
  }
  public isCellNumbersVisible(): boolean {
    return this.cellNumbersVisible;
  }

  public toggleAdjacent(): void {
    this.adjacent = !this.adjacent;
  }
  public isAdjacent(): boolean {
    return this.adjacent;
  }

  // セル内での画像の水平方向の寄せ方を返す
  // 隣接表示時はグリッド全体の通し番号 (1始まり) の奇数セルを右寄せ、偶数セルを左寄せにする (フリップ時は逆)
  public getHorizontalAlign(cellIndex: number): HorizontalAlign {
    if (!this.adjacent) {
      return 'center';
    }
    const isOddCell = cellIndex % 2 === 0;
    return isOddCell !== this.flipped ? 'right' : 'left';
  }

  public getCells(): number {
    return this.rows * this.cols;
  }
}
