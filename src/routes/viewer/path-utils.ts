/**
 * ファイルパス関連のユーティリティ関数
 */

/**
 * ファイルパスからディレクトリパスを抽出します
 * @param filePath ファイルのフルパス
 * @returns ディレクトリパス（末尾にスラッシュを含む）
 */
export function getDirPath(filePath: string): string {
  return filePath.replace(/[^\\/]*$/, '');
}

/**
 * ファイルパスからファイル名を抽出します
 * @param filePath ファイルのフルパス
 * @returns ファイル名（パスを除く）
 */
export function getFileName(filePath: string): string {
  return filePath.replace(/^.*[\\/]/, '');
}
