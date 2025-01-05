import { ImageInfoManager } from "./image-info-manager.svelte";

export type Operation =
  'next' |
  'prev' |
  'nextJump' |
  'prevJump' |
  'randomJump';

export type ModifierKey = 'ctrl' | 'shift' | 'alt';

export class Controler {
  private keyToOperations = new Map<string, Operation>();
  private modfierKeyMap = new Map<ModifierKey, boolean>();

  constructor(private imageInfoManager: ImageInfoManager) {
    this.keyToOperations.set('ArrowRight', 'next');
    this.keyToOperations.set('ArrowLeft', 'prev');
    this.keyToOperations.set('ArrowDown', 'nextJump');
    this.keyToOperations.set('ArrowUp', 'prevJump');
    this.keyToOperations.set('q', 'randomJump');
  }

  public execute(rawKey: string): void {
    console.log(rawKey);

    const key = this.keyToString(rawKey);
    if (this.keyToOperations.has(key)) {
      const operation = this.keyToOperations.get(key);
      if (operation === 'next') {
        this.imageInfoManager.gotoNext();
      } else if (operation === 'prev') {
        this.imageInfoManager.gotoPrev();
      } else if (operation === 'nextJump') {
        this.imageInfoManager.gotoNext(10);
      } else if (operation === 'prevJump') {
        this.imageInfoManager.gotoPrev(10);
      } else if (operation === 'randomJump') {
        this.imageInfoManager.gotoRandom();
      }
    } else if (key === 'ctrl') {
      this.downModifierKey('ctrl');
    } else if (key === 'shift') {
      this.downModifierKey('shift');
    } else if (key === 'alt') {
      this.downModifierKey('alt');
    }
  }

  private keyToString(key: string): string {
    const modfierKeys = this.getModfierKeys();
    return modfierKeys.length === 0 ? key : `${modfierKeys.join('+')}+${key}`;
  }

  // --- 修飾キー関連の操作 --- //

  private getModfierKeys(): ModifierKey[] {
    // this.modfierKeyMapからtrueのものだけを取り出しsortして返す
    return Array.from(this.modfierKeyMap.entries())
      .filter(([_, value]) => value)
      .map(([key, _]) => key)
      .sort();
  }

  public downModifierKey(key: ModifierKey): void {
    this.modfierKeyMap.set(key, true);
  }
  public upModifierKey(key: ModifierKey): void {
    this.modfierKeyMap.set(key, false);
  }
  public resetModifierKey(): void {
    this.modfierKeyMap.clear();
  }
}
