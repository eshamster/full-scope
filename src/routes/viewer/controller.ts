import { ImageInfoManager } from "./image-info-manager.svelte";

export type Operation =
  'next' |
  'prev' |
  'nextJump' |
  'prevJump' |
  'randomJump';

export type ModifierKey = 'ctrl' | 'shift' | 'alt';

type keyConfig = {
  key: string;
  operation: Operation;
  modifierKeys: ModifierKey[];
};

// TODO: ファイルから読み込むようにする
const keyConfigs: keyConfig[] = [
  { key: 'ArrowRight', operation: 'next', modifierKeys: [] },
  { key: 'WheelDown', operation: 'next', modifierKeys: [] },
  { key: 'ArrowLeft', operation: 'prev', modifierKeys: [] },
  { key: 'WheelUp', operation: 'prev', modifierKeys: [] },
  { key: 'ArrowDown', operation: 'nextJump', modifierKeys: [] },
  { key: 'WheelDown', operation: 'nextJump', modifierKeys: ['shift'] },
  { key: 'ArrowUp', operation: 'prevJump', modifierKeys: [] },
  { key: 'WheelUp', operation: 'prevJump', modifierKeys: ['shift'] },
  { key: 'q', operation: 'randomJump', modifierKeys: [] },
  { key: 'RightClick', operation: 'randomJump', modifierKeys: [] },
];

export class Controler {
  private keyToOperations = new Map<string, Operation>();
  private modfierKeyMap = new Map<ModifierKey, boolean>();

  constructor(private imageInfoManager: ImageInfoManager) {
    this.readKeyConfigs(keyConfigs);
  }

  private readKeyConfigs(configs: keyConfig[]): void {
    configs.forEach(({ key, operation, modifierKeys }) => {
      this.setKeyBind(this.keyToString(key, modifierKeys), operation);
    });
  }

  private setKeyBind(key: string, operation: Operation): void {
    this.keyToOperations.set(key.toLowerCase(), operation);
  }

  public execute(rawKey: string): void {
    // modifierKeyの場合は何もしない
    if (['control', 'shift', 'alt'].includes(rawKey.toLowerCase())) {
      return
    }

    const key = this.keyToString(rawKey);
    console.log(key);

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
    }
  }

  private keyToString(
    key: string,
    modifierKeys: ModifierKey[] = this.getModfierKeys(),
  ): string {
    const modified = modifierKeys.length === 0 ?
      key : `${modifierKeys.join(',')}:${key}`;
    return modified.toLowerCase();
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
  public resetModifierKeys(): void {
    this.modfierKeyMap.clear();
  }
}
