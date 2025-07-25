<style>
  @import './modal-styles.css';

  .filter-dialog {
    width: 40%;
    min-width: 400px;
    max-width: 600px;
  }

  .tags-container {
    margin-bottom: 20px;
    max-height: 300px;
    overflow-y: auto;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fafafa;
  }

  .tag-button {
    padding: 8px 16px;
    margin: 4px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
    transition: all 0.2s ease;
    display: inline-block;
    user-select: none;
  }

  .tag-button.unselected {
    border: 1px solid black;
    background: white;
    color: black;
  }

  .tag-button.selected {
    border: none;
    background: black;
    color: white;
  }

  .no-tags {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 20px;
  }
</style>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Props = {
    controller: import('./filter-dialog-controller.svelte').FilterDialogController;
  };

  const { controller }: Props = $props();

  let keyHandler: (_e: KeyboardEvent) => void;
  let cachedAvailableTags: string[] = $state([]);

  function handleSubmit(): void {
    controller.executeFilter();
  }

  function handleCancel(): void {
    controller.hideDialog();
  }

  function handleTagClick(tag: string): void {
    controller.toggleTag(tag);
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    } else if (/^[a-zA-Z0-9]$/.test(e.key)) {
      // 頭文字タイプによるトグル（英数字のみ）
      e.preventDefault();
      e.stopPropagation();
      const targetTag = cachedAvailableTags.find(tag =>
        tag.toLowerCase().startsWith(e.key.toLowerCase())
      );
      if (targetTag) {
        controller.toggleTag(targetTag);
      }
    } else {
      // その他のキーも伝播を阻止
      e.stopPropagation();
    }
  }

  // キャプチャフェーズでPage handleKeydownを阻止
  onMount(() => {
    keyHandler = (e: KeyboardEvent) => {
      if (controller.isShow()) {
        handleKeydown(e);
      }
    };
    document.addEventListener('keydown', keyHandler, true);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', keyHandler, true);
  });

  // ダイアログが表示されたときに利用可能タグをキャッシュ
  $effect(() => {
    if (controller.isShow()) {
      cachedAvailableTags = controller.getAvailableTags();
    }
  });
</script>

{#if controller.isShow()}
  <div class="modal-overlay">
    <div class="filter-dialog modal-dialog">
      <div class="modal-content">
        <div class="modal-title">タグで絞り込み</div>
        <div class="tags-container">
          {#if cachedAvailableTags.length === 0}
            <div class="no-tags">利用可能なタグがありません</div>
          {:else}
            {#each cachedAvailableTags as tag (tag)}
              <button
                class="tag-button {controller.isTagSelected(tag) ? 'selected' : 'unselected'}"
                onclick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            {/each}
          {/if}
        </div>
        <div class="modal-buttons">
          <button class="modal-button ok" onclick={handleSubmit}>OK</button>
          <button class="modal-button cancel" onclick={handleCancel}>Cancel</button>
        </div>
      </div>
    </div>
  </div>
{/if}
