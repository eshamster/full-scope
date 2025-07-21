import { invoke } from '@tauri-apps/api/core';

/**
 * ファイル操作に関するラッパーをまとめたモジュール
 */

/**
 * ドラッグ＆ドロップされたファイルパスを送信します
 */
export async function dropPaths(paths: string[]): Promise<void> {
  return invoke('drop', { paths });
}

/**
 * 以前に読み込んだ画像パス一覧を取得します
 */
export async function getPrevImagePaths(): Promise<{ id: number; paths: string[] }> {
  return invoke('get_prev_image_paths', {});
}

/**
 * 指定したファイルを削除します
 */
export async function deleteFile(path: string): Promise<void> {
  return invoke('delete_file', { path });
}
