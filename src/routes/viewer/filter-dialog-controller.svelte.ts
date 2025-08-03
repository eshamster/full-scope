import { SvelteSet } from 'svelte/reactivity';
import type { ImageInfoManager } from './image-info-manager.svelte.ts';

export class FilterDialogController {
  private show: boolean = $state(false);
  private availableTags: string[] = $state([]);
  private selectedTags = new SvelteSet<string>();
  private imageInfoManager: ImageInfoManager;

  constructor(imageInfoManager: ImageInfoManager) {
    this.imageInfoManager = imageInfoManager;
  }

  public async showDialog(): Promise<void> {
    this.selectedTags.clear();
    this.show = true;
    this.availableTags = await this.imageInfoManager.getAvailableTags();
  }

  public hideDialog(): void {
    this.show = false;
    this.selectedTags.clear();
  }

  public toggleTag(tag: string): void {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
    } else {
      this.selectedTags.add(tag);
    }
  }

  public async executeFilter(): Promise<void> {
    const selectedTagsArray = Array.from(this.selectedTags);
    this.hideDialog();
    await this.imageInfoManager.applyTagFilter(selectedTagsArray);
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
}
