import { SvelteSet } from 'svelte/reactivity';
import type { ImageInfoManager } from './image-info-manager.svelte.ts';
import type { ToastController } from './toast-controller.svelte.ts';

export class FilterDialogController {
  private show: boolean = $state(false);
  private availableTags: string[] = $state([]);
  private selectedTags = new SvelteSet<string>();
  private bookmarkedOnly: boolean = $state(false);
  private bookmarkFilterAvailable: boolean = $state(false);
  private imageInfoManager: ImageInfoManager;
  private toastController: ToastController;

  constructor(imageInfoManager: ImageInfoManager, toastController: ToastController) {
    this.imageInfoManager = imageInfoManager;
    this.toastController = toastController;
  }

  public async showDialog(): Promise<void> {
    this.selectedTags.clear();
    this.bookmarkedOnly = false;
    this.bookmarkFilterAvailable = this.imageInfoManager.hasBookmarkedImage();
    this.show = true;
    this.availableTags = await this.imageInfoManager.getAvailableTags();
  }

  public hideDialog(): void {
    this.show = false;
    this.selectedTags.clear();
    this.bookmarkedOnly = false;
  }

  public toggleTag(tag: string): void {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
    } else {
      this.selectedTags.add(tag);
    }
  }

  public toggleBookmarkedOnly(): void {
    if (!this.bookmarkFilterAvailable) {
      return;
    }
    this.bookmarkedOnly = !this.bookmarkedOnly;
  }

  public async executeFilter(): Promise<void> {
    const selectedTagsArray = Array.from(this.selectedTags);
    const bookmarkedOnly = this.bookmarkedOnly;
    this.hideDialog();
    const applied = await this.imageInfoManager.applyFilter(selectedTagsArray, bookmarkedOnly);
    if (!applied) {
      this.toastController.showToast('該当する画像がありません');
    }
  }

  public isShow(): boolean {
    return this.show;
  }

  public getAvailableTags(): string[] {
    return this.availableTags;
  }

  public isTagSelected(tag: string): boolean {
    return this.selectedTags.has(tag);
  }

  public getSelectedTags(): string[] {
    return Array.from(this.selectedTags);
  }

  public isBookmarkedOnly(): boolean {
    return this.bookmarkedOnly;
  }

  public isBookmarkFilterAvailable(): boolean {
    return this.bookmarkFilterAvailable;
  }
}
