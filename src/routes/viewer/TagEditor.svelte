<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: white;
    padding: 2em;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    min-width: 400px;
    max-width: 80%;
  }

  h3 {
    margin: 0 0 1em 0;
    color: #333;
  }

  .image-path {
    font-size: 0.9em;
    color: #666;
    margin-bottom: 1em;
    word-break: break-all;
  }

  textarea {
    width: 100%;
    margin-bottom: 0.5em;
    padding: 0.5em;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    resize: vertical;
    transition: border-color 0.2s;
  }

  textarea.error {
    border-color: #dc3545;
    box-shadow: 0 0 4px rgba(220, 53, 69, 0.3);
  }

  .validation-error {
    color: #dc3545;
    font-size: 0.85em;
    margin-bottom: 1em;
    padding: 0.5em;
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    word-break: break-word;
  }

  .button-group {
    display: flex;
    gap: 1em;
    justify-content: flex-end;
  }

  button {
    padding: 0.5em 1em;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
  }

  .save-button {
    background-color: #007bff;
    color: white;
  }

  .save-button:hover:not(:disabled) {
    background-color: #0056b3;
  }

  .save-button:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .cancel-button {
    background-color: #6c757d;
    color: white;
  }

  .cancel-button:hover {
    background-color: #545b62;
  }

  .easy-input-container {
    margin-bottom: 1.5em;
    padding: 1em;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fafafa;
    max-height: 200px;
    overflow-y: auto;
  }

  .easy-input-title {
    font-weight: bold;
    margin-bottom: 0.5em;
    color: #333;
    font-size: 0.9em;
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

  .no-available-tags {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 10px;
    font-size: 0.85em;
  }

  .focus-hint {
    font-size: 0.8em;
    color: #666;
    margin-bottom: 0.5em;
  }
</style>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Props = {
    show: boolean;
    imagePath: string;
    initialTags: string[];
    imageInfoManager?: import('./image-info-manager.svelte').ImageInfoManager;
    onSave: (_tags: string[]) => void;
    onCancel: () => void;
  };

  const { show, imagePath, initialTags, imageInfoManager, onSave, onCancel }: Props = $props();

  let tagsText = $state('');
  let textAreaElement: HTMLTextAreaElement | undefined;
  let ignoreNextInput = false;
  let validationError = $state<string | null>(null);
  let isEasyInputMode = $state(true); // 簡易入力モード（true）か自由入力モード（false）か
  let availableTags = $state<string[]>([]); // 利用可能なタグ一覧
  let isLoadingTags = false; // タグ読み込み中フラグ

  // タグ配列をカンマ区切り文字列に変換
  $effect(() => {
    if (show) {
      tagsText = initialTags.join(', ');
      isEasyInputMode = true; // ダイアログを開いた時は簡易入力モード
      // エディタを開いた直後の入力を一時的に無視
      ignoreNextInput = true;
      setTimeout(() => {
        ignoreNextInput = false;
      }, 100); // 100ms後に入力を受け付ける
    }
  });

  // ダイアログ表示時に利用可能タグを取得
  $effect(() => {
    if (show && imageInfoManager && !isLoadingTags) {
      // 非同期処理を分離して実行
      loadAvailableTags();
    } else if (!show) {
      // ダイアログが非表示になったらクリア
      availableTags = [];
      isLoadingTags = false;
    }
  });

  // 利用可能なタグを取得する関数
  function loadAvailableTags(): void {
    if (!imageInfoManager || isLoadingTags) {
      return;
    }

    isLoadingTags = true;
    imageInfoManager.getAvailableTags()
      .then(tags => {
        // showがまだtrueの場合のみ更新
        if (show) {
          availableTags = tags;
        }
        isLoadingTags = false;
      })
      .catch(error => {
        console.error('Failed to load available tags:', error);
        if (show) {
          availableTags = [];
        }
        isLoadingTags = false;
      });
  }

  // 現在の入力からタグ配列を取得（キャッシュされた結果）
  const currentTags = $derived(
    tagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
  );

  // 現在のタグセット（高速検索用）
  const currentTagsSet = $derived(new Set(currentTags));

  // タグがすでに入力済みかチェック
  function isTagAlreadyAdded(tag: string): boolean {
    return currentTagsSet.has(tag);
  }

  // タグボタンクリック時の処理
  function handleTagButtonClick(tag: string): void {
    if (isTagAlreadyAdded(tag)) {
      // 既に追加済みの場合は削除
      const filteredTags = currentTags.filter(t => t !== tag);
      tagsText = filteredTags.join(', ');
    } else {
      // 未追加の場合は追加
      const newTags = [...currentTags, tag];
      tagsText = newTags.join(', ');
    }
  }

  // 頭文字タイプによるタグ追加
  function handleHeadCharType(char: string): void {
    const lowerChar = char.toLowerCase();
    
    // 指定された頭文字で始まるタグをソート順で取得
    const matchingTags = availableTags
      .filter(tag => tag.toLowerCase().startsWith(lowerChar))
      .sort();
    
    // 未入力のタグから最初のものを選択
    const tagToAdd = matchingTags.find(tag => !currentTagsSet.has(tag));
    
    if (tagToAdd) {
      const newTags = [...currentTags, tagToAdd];
      tagsText = newTags.join(', ');
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!show) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleCancel();
    } else if (event.key === 'Tab') {
      // Tabキーで自由入力欄にフォーカス移動
      event.preventDefault();
      event.stopPropagation();
      isEasyInputMode = false;
      if (textAreaElement) {
        textAreaElement.focus();
      }
    } else if (isEasyInputMode && /^[a-zA-Z0-9]$/.test(event.key)) {
      // 簡易入力モードでの頭文字タイプ
      event.preventDefault();
      event.stopPropagation();
      
      // 開始直後の文字入力を無視（Tキーの重複入力防止）
      if (!ignoreNextInput) {
        handleHeadCharType(event.key);
      }
    } else {
      // タグエディタ表示中は他のキー操作も阻止
      event.stopPropagation();

      // 開始直後の文字入力を無視（Tキーの重複入力防止）
      if (ignoreNextInput && event.key.length === 1) {
        event.preventDefault();
      }
    }
  }

  // タグの入力値検証
  function validateTags(tags: string[]): string | null {
    // タグ数制限
    if (tags.length > 50) {
      return 'タグの数が多すぎます（最大50個）';
    }

    for (const tag of tags) {
      if (tag.length === 0) continue;

      // 長さ制限
      if (tag.length > 100) {
        return `タグが長すぎます（最大100文字）: "${tag.substring(0, 20)}..."`;
      }

      // 禁止文字チェック
      if (tag.includes('\t') || tag.includes('\n') || tag.includes('\r')) {
        return `タグに禁止文字が含まれています: "${tag}"`;
      }

      // 制御文字チェック
      for (let i = 0; i < tag.length; i++) {
        const charCode = tag.charCodeAt(i);
        if ((charCode >= 0 && charCode <= 31) || charCode === 127) {
          return `タグに制御文字が含まれています: "${tag}"`;
        }
      }
    }

    return null;
  }

  // リアルタイムバリデーション（$derivedで最適化）
  $effect(() => {
    if (!show || tagsText.length === 0) {
      validationError = null;
    } else {
      validationError = validateTags(currentTags);
    }
  });

  function handleSave() {
    // 保存前の最終検証（既にcurrentTagsで計算済み）
    const error = validateTags(currentTags);
    if (error) {
      validationError = error;
      return;
    }

    onSave(currentTags);
  }

  function handleCancel() {
    onCancel();
  }

  // モーダル表示時の初期フォーカス設定（簡易入力モードでは不要）
  $effect(() => {
    if (show && !isEasyInputMode && textAreaElement) {
      textAreaElement.focus();
      textAreaElement.select();
    }
  });

  // テキストエリアのフォーカス/ブラー処理
  function handleTextAreaFocus(): void {
    isEasyInputMode = false;
  }

  function handleTextAreaBlur(): void {
    // テキストエリアからフォーカスが外れても自由入力モードは維持
  }

  // キャプチャフェーズでキーイベントを処理してController側の処理を阻止
  let keyHandler: (_e: KeyboardEvent) => void;
  let keyUpHandler: (_e: KeyboardEvent) => void;
  onMount(() => {
    keyHandler = (e: KeyboardEvent) => {
      if (show) {
        handleKeydown(e);
      }
    };
    keyUpHandler = (_e: KeyboardEvent) => {
      if (show && ignoreNextInput) {
        // キーが離された時点で入力無視を解除（より早く反応させる）
        ignoreNextInput = false;
      }
    };
    // キャプチャフェーズでハンドラを登録し、バブリングフェーズの他リスナーを阻止
    document.addEventListener('keydown', keyHandler, true);
    document.addEventListener('keyup', keyUpHandler, true);
  });
  onDestroy(() => {
    document.removeEventListener('keydown', keyHandler, true);
    document.removeEventListener('keyup', keyUpHandler, true);
  });
</script>

{#if show}
  <div
    class="modal-overlay"
    onclick={e => {
      if (e.target === e.currentTarget) handleCancel();
    }}
    role="button"
    tabindex="0"
    onkeydown={e => e.key === 'Enter' && handleCancel()}
  >
    <div class="modal-content">
      <h3>タグ編集</h3>
      <div class="image-path">
        {imagePath}
      </div>
      <!-- 簡易入力補助パート -->
      {#if availableTags.length > 0}
        <div class="easy-input-container">
          <div class="easy-input-title">既存タグから選択:</div>
          {#each availableTags as tag (tag)}
            <button
              class="tag-button {isTagAlreadyAdded(tag) ? 'selected' : 'unselected'}"
              onclick={() => handleTagButtonClick(tag)}
              type="button"
            >
              {tag}
            </button>
          {/each}
        </div>
      {:else}
        <div class="easy-input-container">
          <div class="no-available-tags">利用可能なタグがありません</div>
        </div>
      {/if}
      
      <div class="focus-hint">
        {#if isEasyInputMode}
          頭文字をタイプしてタグを追加、Tabで自由入力欄へ移動
        {:else}
          自由入力モード - 直接編集できます
        {/if}
      </div>
      
      <textarea
        bind:this={textAreaElement}
        bind:value={tagsText}
        oninput={e => {
          // 開始直後の入力を無視
          if (ignoreNextInput) {
            e.preventDefault();
            tagsText = initialTags.join(', ');
          }
        }}
        onfocus={handleTextAreaFocus}
        onblur={handleTextAreaBlur}
        placeholder="タグをカンマ区切りで入力してください"
        rows="4"
        cols="50"
        class:error={validationError}
      ></textarea>
      {#if validationError}
        <div class="validation-error">
          {validationError}
        </div>
      {/if}
      <div class="button-group">
        <button onclick={handleSave} class="save-button" disabled={validationError !== null}>
          保存 (Enter)
        </button>
        <button onclick={handleCancel} class="cancel-button">キャンセル (Escape)</button>
      </div>
    </div>
  </div>
{/if}
