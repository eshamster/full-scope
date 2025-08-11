<style>
  .image-info-overlay {
    position: fixed;
    bottom: 10px;
    right: 10px;
    background-color: rgba(255, 255, 255, 0.9);
    color: black;
    padding: 0px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.4;
    z-index: 1000;
    max-width: 400px;
    word-wrap: break-word;
  }

  .info-item {
    margin-bottom: 8px;
  }

  .info-item:last-child {
    margin-bottom: 0;
  }

  .label {
    font-weight: bold;
    margin-right: 8px;
  }

  .value {
    color: #333;
  }
</style>

<script lang="ts">
  import type { ImageInfo } from './image-info.svelte';
  import { loadTagsInDir } from '$lib/api/tags';
  import { invoke } from '@tauri-apps/api/core';
  import { getDirPath, getFileName } from './path-utils';

  interface Props {
    imageInfo: ImageInfo | null;
    show: boolean;
    globalRotation?: number;
  }

  interface FileInfo {
    filename: string;
    fileSize: number;
    width: number;
    height: number;
    tags: string[];
  }

  let { imageInfo, show, globalRotation = 0 }: Props = $props();

  let fileInfo: FileInfo | null = $state(null);

  // NOTE: 応答速度に課題がある場合は、ファイル情報のキャッシュ機能を検討する
  async function loadFileInfo(imagePath: string) {
    try {
      const filename = getFileName(imagePath);
      const dirPath = getDirPath(imagePath);
      const tagsData = await loadTagsInDir(dirPath);
      const tags = tagsData[filename] || [];

      // ファイル情報を取得（バックエンドAPIが必要）
      const fileData = await invoke<{ size: number; width: number; height: number }>(
        'get_file_info',
        {
          filePath: imagePath,
        }
      );

      fileInfo = {
        filename,
        fileSize: fileData.size,
        width: fileData.width,
        height: fileData.height,
        tags,
      };
    } catch (error) {
      console.error('Failed to load file info:', error);
      fileInfo = null;
    }
  }

  $effect(() => {
    if (show && imageInfo) {
      loadFileInfo(imageInfo.path);
    } else {
      fileInfo = null;
    }
  });

  function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  function formatTags(tags: string[]): string {
    return tags.length > 0 ? tags.join(', ') : 'なし';
  }

  function normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
  }

  function formatRotationInfo(localRotation: number, globalRotation: number): string | null {
    const normalizedLocal = normalizeAngle(localRotation);
    const normalizedGlobal = normalizeAngle(globalRotation);
    const totalRotation = normalizeAngle(localRotation + globalRotation);

    // local, globalどちらも0度の場合は表示しない
    if (normalizedLocal === 0 && normalizedGlobal === 0) {
      return null;
    }

    return `回転角: ${totalRotation}度（この画像: ${normalizedLocal}度, 全画像: ${normalizedGlobal}度）`;
  }

  const infoItems = $derived.by(() => {
    if (!fileInfo || !imageInfo) return [];

    const items = [
      { label: 'ファイル名:', value: fileInfo.filename },
      { label: 'ファイルサイズ:', value: formatFileSize(fileInfo.fileSize) },
      { label: '画像サイズ:', value: `${fileInfo.width} × ${fileInfo.height}` },
      { label: 'タグ:', value: formatTags(fileInfo.tags) },
    ];

    // 回転情報を追加（0度でない場合のみ）
    const rotationInfo = formatRotationInfo(imageInfo.getLocalRotation(), globalRotation);
    if (rotationInfo) {
      items.push({ label: '', value: rotationInfo });
    }

    return items;
  });
</script>

{#if show && fileInfo}
  <div class="image-info-overlay">
    {#each infoItems as item (item.label)}
      <div class="info-item">
        <span class="label">{item.label}</span>
        <span class="value">{item.value}</span>
      </div>
    {/each}
  </div>
{/if}
