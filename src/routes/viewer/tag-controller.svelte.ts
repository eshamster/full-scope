import { loadTagsInDir, saveTags } from '@/lib/api/tags';
import { ToastController } from './toast-controller.svelte';
import { SvelteMap } from 'svelte/reactivity';
import { getDirPath, getFileName } from './path-utils';

export class TagController {
  private tagsCache = new SvelteMap<string, Record<string, string[]>>();

  constructor(private toastController: ToastController) {}

  /**
   * 指定した画像ファイルのタグを取得します
   * @param imagePath 画像ファイルのフルパス
   * @returns タグの配列
   */
  public async getImageTags(imagePath: string): Promise<string[]> {
    const dirPath = getDirPath(imagePath);
    const fileName = getFileName(imagePath);

    try {
      // キャッシュがあればそれを使用、なければAPIから取得
      if (!this.tagsCache.has(dirPath)) {
        const tagsMap = await loadTagsInDir(dirPath);
        this.tagsCache.set(dirPath, tagsMap);
      }

      const tagsMap = this.tagsCache.get(dirPath)!;
      return tagsMap[fileName] || [];
    } catch (error) {
      console.error('Failed to load tags:', error);
      this.toastController.showToast('タグの読み込みに失敗しました');
      return [];
    }
  }

  /**
   * 指定したディレクトリのタグマップを取得します
   * @param dirPath ディレクトリパス
   * @returns ファイル名をキーとしたタグマップ
   */
  public async loadTagsInDir(dirPath: string): Promise<Record<string, string[]>> {
    try {
      // キャッシュがあればそれを使用、なければAPIから取得
      if (!this.tagsCache.has(dirPath)) {
        const tagsMap = await loadTagsInDir(dirPath);
        this.tagsCache.set(dirPath, tagsMap);
      }

      return this.tagsCache.get(dirPath)!;
    } catch (error) {
      console.error('Failed to load tags in directory:', error);
      this.toastController.showToast('ディレクトリのタグ読み込みに失敗しました');
      return {};
    }
  }

  /**
   * 指定した画像ファイルのタグを保存します
   * @param imagePath 画像ファイルのフルパス
   * @param tags 保存するタグの配列
   */
  public async saveImageTags(imagePath: string, tags: string[]): Promise<void> {
    // 入力値検証
    const validationError = this.validateTags(tags);
    if (validationError) {
      this.toastController.showToast(validationError);
      throw new Error(validationError);
    }

    try {
      await saveTags(imagePath, tags);

      // キャッシュを更新
      const dirPath = getDirPath(imagePath);
      const fileName = getFileName(imagePath);

      if (this.tagsCache.has(dirPath)) {
        const tagsMap = this.tagsCache.get(dirPath)!;
        tagsMap[fileName] = tags;
      }

      this.toastController.showToast('タグを保存しました');
    } catch (error) {
      console.error('Failed to save tags:', error);
      this.toastController.showToast('タグの保存に失敗しました');
      throw error;
    }
  }

  /**
   * 指定したディレクトリのタグキャッシュをクリアします
   * @param dirPath ディレクトリパス
   */
  public clearCache(dirPath: string): void {
    this.tagsCache.delete(dirPath);
  }

  /**
   * 全てのタグキャッシュをクリアします
   */
  public clearAllCache(): void {
    this.tagsCache.clear();
  }

  /**
   * タグの入力値検証
   * @param tags 検証するタグの配列
   * @returns エラーメッセージ（検証成功時はnull）
   */
  private validateTags(tags: string[]): string | null {
    // タグ数制限
    if (tags.length > 50) {
      return 'タグの数が多すぎます（最大50個）';
    }

    for (const tag of tags) {
      // 空のタグはスキップ（フィルタ済み想定）
      if (tag.length === 0) continue;

      // 長さ制限
      if (tag.length > 100) {
        return `タグが長すぎます（最大100文字）: "${tag.substring(0, 20)}..."`;
      }

      // 禁止文字チェック
      if (tag.includes('\t') || tag.includes('\n') || tag.includes('\r')) {
        return `タグに禁止文字が含まれています: "${tag}"`;
      }

      // 制御文字チェック
      for (let i = 0; i < tag.length; i++) {
        const charCode = tag.charCodeAt(i);
        if ((charCode >= 0 && charCode <= 31) || charCode === 127) {
          return `タグに制御文字が含まれています: "${tag}"`;
        }
      }

      // 先頭末尾空白チェック（ユーザビリティ向上）
      if (tag !== tag.trim()) {
        return `タグの先頭・末尾に空白があります: "${tag}"`;
      }
    }

    return null;
  }

  // TODO: キャッシュサイズ制限実装（将来のパフォーマンス改善用）
  // 大量のディレクトリを訪問した際のメモリ使用量を制限するため、
  // LRU (Least Recently Used) キャッシュまたはTTLベースの自動削除機能を実装する。
  // 想定実装：
  // - 最大キャッシュエントリ数: 100ディレクトリ
  // - TTL: 30分
  // - アクセス頻度に基づくLRU削除
}
