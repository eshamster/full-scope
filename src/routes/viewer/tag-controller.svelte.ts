import { loadTagsInDir, saveTags } from '@/lib/api/tags';
import { ToastController } from './toast-controller.svelte';

export class TagController {
  private tagsCache = new Map<string, Record<string, string[]>>();
  
  constructor(private toastController: ToastController) {}

  /**
   * 指定した画像ファイルのタグを取得します
   * @param imagePath 画像ファイルのフルパス
   * @returns タグの配列
   */
  public async getImageTags(imagePath: string): Promise<string[]> {
    const dirPath = this.getDirPath(imagePath);
    const fileName = this.getFileName(imagePath);
    
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
   * 指定した画像ファイルのタグを保存します
   * @param imagePath 画像ファイルのフルパス
   * @param tags 保存するタグの配列
   */
  public async saveImageTags(imagePath: string, tags: string[]): Promise<void> {
    try {
      await saveTags(imagePath, tags);
      
      // キャッシュを更新
      const dirPath = this.getDirPath(imagePath);
      const fileName = this.getFileName(imagePath);
      
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

  private getDirPath(filePath: string): string {
    return filePath.replace(/[^\\\/]*$/, '');
  }

  private getFileName(filePath: string): string {
    return filePath.replace(/^.*[\\\/]/, '');
  }
}