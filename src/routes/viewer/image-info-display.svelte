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
  import type { ImageInfo } from './image-info';
  import { loadTagsInDir } from '$lib/api/tags';
  import { invoke } from '@tauri-apps/api/core';

  interface Props {
    imageInfo: ImageInfo | null;
    show: boolean;
  }

  interface FileInfo {
    filename: string;
    fileSize: number;
    width: number;
    height: number;
    tags: string[];
  }

  let { imageInfo, show }: Props = $props();

  let fileInfo: FileInfo | null = $state(null);

  // NOTE: 応答速度に課題がある場合は、ファイル情報のキャッシュ機能を検討する
  async function loadFileInfo(imagePath: string) {
    try {
      // ファイル名を取得（TagControllerと同じ方式）
      const filename = imagePath.replace(/^.*[\\/]/, '');

      // ディレクトリパスを取得してタグ情報をロード（TagControllerと同じ方式）
      const dirPath = imagePath.replace(/[^\\/]*$/, '');
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

  const infoItems = $derived.by(() => {
    if (!fileInfo) return [];
    
    return [
      { label: 'ファイル名:', value: fileInfo.filename },
      { label: 'ファイルサイズ:', value: formatFileSize(fileInfo.fileSize) },
      { label: '画像サイズ:', value: `${fileInfo.width} × ${fileInfo.height}` },
      { label: 'タグ:', value: formatTags(fileInfo.tags) },
    ];
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
