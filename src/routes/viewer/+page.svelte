<style>
  main {
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .container {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .grid {
    position: absolute;
    display: grid;
    width: 100%;
    height: 100%;
  }
  .cell {
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }
  .cell {
    position: relative;
  }

  .cell img {
    position: absolute;
    top: 50%;
    left: 50%;
    transform-origin: center;
    object-fit: contain; /* アスペクト比を維持しつつコンテナに収める */
    /* ドラッグ操作を無効化 */
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    pointer-events: none;
  }

  #debug {
    position: absolute;
    top: 50%;
    left: 0;
    color: black;
    background-color: rgba(255, 255, 255, 0.5);
    padding: 0.2em;
  }

  #page {
    position: absolute;
    top: 0;
    left: 0;
    color: black;
    background-color: rgba(255, 255, 255, 0.5);
    padding: 0.2em;
  }
</style>

<script lang="ts">
  import { convertFileSrc } from '@tauri-apps/api/core';
  import { getPrevImagePaths } from '@/lib/api/files';
  import { listen } from '@tauri-apps/api/event';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { onMount, onDestroy } from 'svelte';
  import { ImageInfo } from '@/routes/viewer/image-info.svelte';
  import { ImageInfoManager } from '@/routes/viewer/image-info-manager.svelte';
  import { DialogController } from '@/routes/viewer/dialog-controller.svelte';
  import { FileController } from '@/routes/viewer/file-controller';
  import { ToastController } from '@/routes/viewer/toast-controller.svelte';
  import { ViewerController } from '@/routes/viewer/viewer-controller.svelte';
  import { GotoDialogController } from '@/routes/viewer/goto-dialog-controller.svelte';
  import { FilterDialogController } from '@/routes/viewer/filter-dialog-controller.svelte';
  import { Controler } from '@/routes/viewer/controller';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import GotoDialog from './GotoDialog.svelte';
  import FilterByTagDialog from './FilterByTagDialog.svelte';
  import CornerToast from '@/routes/viewer/CornerToast.svelte';
  import TagEditor from './TagEditor.svelte';
  import { TagController } from './tag-controller.svelte';
  import ImageInfoDisplay from './image-info-display.svelte';

  getCurrentWindow().setFullscreen(true);

  type ImagePathsResp = {
    id: number;
    paths: string[];
  };

  let manager = $state<ImageInfoManager>(new ImageInfoManager());
  const dialogController = new DialogController();
  const gotoDialogController = new GotoDialogController();
  const filterDialogController = new FilterDialogController(manager);
  const fileController = new FileController();
  const toastController = new ToastController();
  const viewerController = new ViewerController();
  const tagController = new TagController(toastController);
  const controller = new Controler(
    manager,
    dialogController,
    fileController,
    toastController,
    viewerController,
    gotoDialogController,
    filterDialogController
  );

  // ImageInfoManagerにTagControllerを設定
  manager.setTagController(tagController);

  // タグ編集用の状態
  let showTagEditor = $state(false);
  let currentImageTags = $state<string[]>([]);

  // タグ編集を開始する関数
  async function startTagEdit() {
    if (manager.getList().length === 0) return;

    const currentImage = manager.getCurrent();
    currentImageTags = await tagController.getImageTags(currentImage.path);
    showTagEditor = true;
    controller.setTagEditorOpen(true);
  }

  // タグ保存の処理
  async function handleTagSave(tags: string[]) {
    if (manager.getList().length === 0) return;

    const currentImage = manager.getCurrent();
    try {
      await tagController.saveImageTags(currentImage.path, tags);
      showTagEditor = false;
      controller.setTagEditorOpen(false);
    } catch (error) {
      console.error('Tag save error:', error);
    }
  }

  // タグ編集をキャンセルする処理
  function handleTagCancel() {
    showTagEditor = false;
    controller.setTagEditorOpen(false);
  }

  // コントローラーにタグ編集コールバックを設定
  controller.setOnEditTags(startTagEdit);

  let currentImages = $derived.by(() => {
    try {
      const listLength = manager.getListLength();

      if (listLength > 0) {
        const cellCount = viewerController.getRows() * viewerController.getCols();
        const images = manager.getCurrentList(cellCount);
        return images;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  });

  // グローバル回転状態を監視
  let globalRotation = $derived(manager.getGlobalRotation());

  // 回転状態をリアクティブに監視（画像が存在する場合のみ）
  let rotationStates = $derived.by(() => {
    if (currentImages.length === 0) return [];
    return currentImages.map(img => manager.getTotalRotation(img));
  });

  // 回転状態が変化した時に自動的にサイズを再計算
  $effect(() => {
    // 画像が存在し、回転状態が変化した場合のみ実行
    if (rotationStates.length > 0) {
      // DOM更新後に実行するため少し遅延
      setTimeout(() => {
        recalculateVisibleImageSizes();
      }, 0);
    }
  });

  // 動的画像サイジングシステム

  // セルサイズ計算
  function getCellDimensions() {
    return {
      width: window.innerWidth / viewerController.getCols(),
      height: window.innerHeight / viewerController.getRows(),
    };
  }

  // 画像の最適サイズ計算
  function calculateOptimalImageSize(
    naturalWidth: number,
    naturalHeight: number,
    rotation: number
  ): { actualImageWidth: number; actualImageHeight: number } {
    const cell = getCellDimensions();

    // 回転を考慮した有効画像サイズ
    const effectiveWidth = rotation % 180 === 0 ? naturalWidth : naturalHeight;
    const effectiveHeight = rotation % 180 === 0 ? naturalHeight : naturalWidth;

    const scale = Math.min(cell.width / effectiveWidth, cell.height / effectiveHeight);

    // 実際の画像表示サイズを計算
    const actualImageWidth = naturalWidth * scale;
    const actualImageHeight = naturalHeight * scale;

    return {
      actualImageWidth,
      actualImageHeight,
    };
  }

  // 画像の動的スタイル生成
  function getDynamicImageStyle(img: ImageInfo, element?: HTMLImageElement): string {
    const rotation = manager.getTotalRotation(img);

    // 画像がまだ読み込まれていない場合の暫定スタイル
    if (!element || !element.naturalWidth) {
      const cell = getCellDimensions();
      const style = `
        width: ${cell.width}px;
        height: ${cell.height}px;
        transform: translate(-50%, -50%) rotate(${rotation}deg);
      `.trim();
      return style;
    }

    // 最適サイズ計算
    const optimal = calculateOptimalImageSize(
      element.naturalWidth,
      element.naturalHeight,
      rotation
    );

    // 計算された実際のサイズを使用
    const style = `
      width: ${optimal.actualImageWidth}px;
      height: ${optimal.actualImageHeight}px;
      object-fit: fill;
      transform: translate(-50%, -50%) rotate(${rotation}deg);
    `.trim();
    return style;
  }

  // 画像ロード後のサイズ更新
  function updateImageSize(event: Event, img: ImageInfo) {
    const imgElement = event.target as HTMLImageElement;

    if (!imgElement.naturalWidth || !imgElement.naturalHeight) {
      console.warn('Image natural size not available:', img.path);
      return;
    }

    // 新しいスタイルを適用
    const newStyle = getDynamicImageStyle(img, imgElement);
    imgElement.style.cssText = newStyle;
  }

  // 表示中の全画像のサイズを再計算（回転操作時に呼び出し）
  function recalculateVisibleImageSizes() {
    const imgElements = document.querySelectorAll('.cell img');

    imgElements.forEach((imgElement, index) => {
      if (index < currentImages.length && imgElement instanceof HTMLImageElement) {
        const img = currentImages[index];
        if (imgElement.naturalWidth && imgElement.naturalHeight) {
          const newStyle = getDynamicImageStyle(img, imgElement);
          imgElement.style.cssText = newStyle;
        }
      }
    });
  }

  // コアプロセスから画像のパスを受け取ったときの処理
  function handleImagePaths(resp: ImagePathsResp) {
    const images = resp.paths.map(path => {
      return new ImageInfo(path);
    });
    manager.addImages(images);
  }

  function handleKeydown(event: KeyboardEvent) {
    console.log(
      'Page handleKeydown:',
      event.key,
      'target:',
      (event.target as HTMLElement)?.tagName,
      'gotoDialogShow:',
      gotoDialogController.isShow()
    ); // デバッグログ

    if (event.key === 'Escape') {
      getCurrentWindow().close();
    }

    // 開発者ツール（Ctrl+Shift+I）のみ許可、それ以外のWebViewデフォルトショートカットは無効化
    if (!(event.ctrlKey && event.shiftKey && event.key === 'I')) {
      console.log('Page handleKeydown: calling preventDefault for', event.key); // デバッグログ
      event.preventDefault();
    }

    switch (event.key.toLowerCase()) {
      case 'shift':
        controller.downModifierKey('shift');
        return;
      case 'control':
        controller.downModifierKey('ctrl');
        return;
      case 'alt':
        controller.downModifierKey('alt');
        return;
    }

    controller.operateByKey(event.key);
  }
  function handleKeyup(event: KeyboardEvent) {
    switch (event.key.toLowerCase()) {
      case 'shift':
        controller.upModifierKey('shift');
        return;
      case 'control':
        controller.upModifierKey('ctrl');
        return;
      case 'alt':
        controller.upModifierKey('alt');
        return;
    }
  }

  function handleMouseDown(event: MouseEvent) {
    // ドラッグ操作を無効化
    event.preventDefault();

    switch (event.button) {
      case 0:
        // 左クリックはshiftキー扱い（ドラッグを無効化しているのでクリック時のみ）
        controller.downModifierKey('shift');
        break;
      case 1:
        controller.operateByKey('MiddleClick');
        break;
      case 2:
        controller.operateByKey('RightClick');
        break;
    }
  }
  function handleMouseUp(event: MouseEvent) {
    switch (event.button) {
      case 0:
        controller.upModifierKey('shift');
        break;
    }
  }

  function handleWheel(event: WheelEvent) {
    if (event.deltaY > 0) {
      controller.operateByKey('WheelDown');
    } else {
      controller.operateByKey('WheelUp');
    }
  }

  function handleMouseleave() {
    controller.resetModifierKeys();
  }

  let unlisten: (() => void) | undefined;
  onMount(async () => {
    unlisten = await listen<ImagePathsResp>('new-images', event => {
      handleImagePaths(event.payload);
    });

    // 初回はlistenが間に合わないので、明示的にリクエストを送る
    // ※万が一重複した場合は ImageInfoManager 側で排除
    const resp = await getPrevImagePaths();
    handleImagePaths(resp);

    document.addEventListener('keydown', event => {
      handleKeydown(event);
    });
    document.addEventListener('keyup', event => {
      handleKeyup(event);
    });
    document.addEventListener('mousedown', event => {
      handleMouseDown(event);
    });
    document.addEventListener('mouseup', event => {
      handleMouseUp(event);
    });
    document.addEventListener('wheel', event => {
      handleWheel(event);
    });
    document.addEventListener('mouseleave', () => {
      handleMouseleave();
    });
    document.addEventListener('contextmenu', event => {
      event.preventDefault();
    });
  });

  onDestroy(() => {
    if (unlisten && typeof unlisten === 'function') {
      unlisten();
    } else {
      console.log(`skipped unlisten: ${unlisten}`);
    }
  });
</script>

<main class="container">
  {#if manager.getListLength() > 0}
    <div id="page">
      {manager.getCaret() + 1} / {manager.getListLength()}
    </div>
    <div id="debug"></div>
    <div
      class="grid"
      style="
             grid-template-rows: repeat({viewerController.getRows()}, 1fr);
             grid-template-columns: repeat({viewerController.getCols()}, 1fr);
             "
    >
      {#each currentImages as img, i (i)}
        <div class="cell">
          <img
            id="image"
            src={convertFileSrc(img.path)}
            alt={img.path}
            style={getDynamicImageStyle(img)}
            onload={event => updateImageSize(event, img)}
          />
        </div>
      {/each}
    </div>
  {/if}

  <ConfirmDialog
    show={dialogController.isShow()}
    message={dialogController.getMessage()}
    onNotify={(result: boolean) => dialogController.handleDialogNotify(result)}
  ></ConfirmDialog>

  <GotoDialog controller={gotoDialogController}></GotoDialog>

  <FilterByTagDialog controller={filterDialogController}></FilterByTagDialog>

  <CornerToast show={toastController.isShow()} message={toastController.getMessage()}></CornerToast>

  <TagEditor
    show={showTagEditor}
    imagePath={manager.getListLength() > 0 ? manager.getCurrent().path : ''}
    initialTags={currentImageTags}
    imageInfoManager={manager}
    onSave={handleTagSave}
    onCancel={handleTagCancel}
  ></TagEditor>

  <ImageInfoDisplay
    show={manager.isImageInfoDisplayed()}
    imageInfo={manager.getListLength() > 0 ? manager.getCurrent() : null}
  ></ImageInfoDisplay>
</main>
