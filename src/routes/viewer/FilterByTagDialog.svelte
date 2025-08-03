<style>
  @import './modal-styles.css';

  .filter-dialog {
    width: 40%;
    min-width: 400px;
    max-width: 600px;
  }

  :global(.tags-container) {
    margin-bottom: 20px;
    max-height: 300px;
  }
</style>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import TagSelector from './TagSelector.svelte';

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

  const handleTagClick = (tag: string): void => {
    controller.toggleTag(tag);
  };

  const handleHeadCharMatch = (matchingTags: string[], _char: string): void => {
    // 最初にマッチしたタグをトグル
    if (matchingTags.length > 0) {
      controller.toggleTag(matchingTags[0]);
    }
  };

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
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
        <TagSelector
          availableTags={cachedAvailableTags}
          selectedTags={controller.getSelectedTags()}
          onTagToggle={handleTagClick}
          onHeadCharMatch={handleHeadCharMatch}
          enableKeyboardInput={true}
          containerClass="tags-container"
          noTagsMessage="利用可能なタグがありません"
        />
        <div class="modal-buttons">
          <button class="modal-button ok" onclick={handleSubmit}>OK</button>
          <button class="modal-button cancel" onclick={handleCancel}>Cancel</button>
        </div>
      </div>
    </div>
  </div>
{/if}
