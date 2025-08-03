<style>
  .tags-container {
    padding: 1em;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fafafa;
    max-height: 200px;
    overflow-y: auto;
  }

  .tag-button {
    padding: 6px 12px;
    margin: 3px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 13px;
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

  .no-tags-message {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 10px;
    font-size: 0.85em;
  }
</style>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Props = {
    availableTags: string[];
    selectedTags: string[];
    onTagToggle: (_tag: string) => void;
    onHeadCharMatch?: (_matchingTags: string[], _char: string) => void;
    containerClass?: string;
    showNoTagsMessage?: boolean;
    noTagsMessage?: string;
    enableKeyboardInput?: boolean;
  };

  const {
    availableTags,
    selectedTags,
    onTagToggle,
    onHeadCharMatch,
    containerClass = '',
    showNoTagsMessage = true,
    noTagsMessage = '利用可能なタグがありません',
    enableKeyboardInput = false,
  }: Props = $props();

  // 選択済みタグのセット（高速検索用）
  const selectedTagsSet = $derived(new Set(selectedTags));

  // タグが選択済みかチェック
  const isTagSelected = (tag: string): boolean => {
    return selectedTagsSet.has(tag);
  };

  // タグボタンクリック処理
  const handleTagClick = (tag: string): void => {
    onTagToggle(tag);
  };

  // 頭文字タイプ処理
  const handleHeadCharType = (char: string): void => {
    if (!onHeadCharMatch) return;

    const lowerChar = char.toLowerCase();
    const matchingTags = availableTags.filter(tag => tag.toLowerCase().startsWith(lowerChar));

    if (matchingTags.length > 0) {
      onHeadCharMatch(matchingTags, char);
    }
  };

  // キーボードイベントハンドラ
  const handleKeydown = (e: KeyboardEvent): void => {
    if (!enableKeyboardInput) return;

    if (/^[a-zA-Z0-9]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      handleHeadCharType(e.key);
    }
  };

  let keyHandler: ((_e: KeyboardEvent) => void) | undefined;

  onMount(() => {
    if (enableKeyboardInput) {
      keyHandler = handleKeydown;
      document.addEventListener('keydown', keyHandler, true);
    }
  });

  onDestroy(() => {
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler, true);
    }
  });
</script>

<div class="tags-container {containerClass}">
  {#if availableTags.length === 0 && showNoTagsMessage}
    <div class="no-tags-message">{noTagsMessage}</div>
  {:else}
    {#each availableTags as tag (tag)}
      <button
        class="tag-button {isTagSelected(tag) ? 'selected' : 'unselected'}"
        onclick={() => handleTagClick(tag)}
        type="button"
      >
        {tag}
      </button>
    {/each}
  {/if}
</div>
