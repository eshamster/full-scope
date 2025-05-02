const MAX_ROWS = 10;
const MAX_COLS = 10;

export class ViewerController {
  // グリッド表示の行列数管理
  private rows: number = $state(1);
  private cols: number = $state(1);

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
}
