import { invoke } from '@tauri-apps/api/core';

/**
 * タグ操作に関するラッパーをまとめたモジュール
 */

/**
 * 指定されたディレクトリのタグ情報をロードします
 *
 * @param dirPath ディレクトリのパス
 * @returns ファイル名 -> タグ配列 のマップ
 */
export async function loadTagsInDir(dirPath: string): Promise<Record<string, string[]>> {
  return invoke('load_tags_in_dir', { dirPath });
}

/**
 * 指定された画像ファイルのタグ情報を保存します
 *
 * @param imgPath 画像ファイルのパス
 * @param tags タグの配列
 */
export async function saveTags(imgPath: string, tags: string[]): Promise<void> {
  return invoke('save_tags', { imgPath, tags });
}
