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
</style>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Props = {
    show: boolean;
    imagePath: string;
    initialTags: string[];
    onSave: (tags: string[]) => void;
    onCancel: () => void;
  };

  const { show, imagePath, initialTags, onSave, onCancel }: Props = $props();

  let tagsText = $state('');
  let textAreaElement = $state<HTMLTextAreaElement>();
  let ignoreNextInput = $state(false);
  let validationError = $state<string | null>(null);

  // タグ配列をカンマ区切り文字列に変換
  $effect(() => {
    if (show) {
      tagsText = initialTags.join(', ');
      // エディタを開いた直後の入力を一時的に無視
      ignoreNextInput = true;
      setTimeout(() => {
        ignoreNextInput = false;
      }, 100); // 100ms後に入力を受け付ける
    }
  });

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
      if (/[\x00-\x1f\x7f]/.test(tag)) {
        return `タグに制御文字が含まれています: "${tag}"`;
      }
    }

    return null;
  }

  // リアルタイムバリデーション
  $effect(() => {
    if (!show || tagsText.length === 0) {
      validationError = null;
      return;
    }

    const tags = tagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    validationError = validateTags(tags);
  });

  function handleSave() {
    // カンマ区切りテキストをタグ配列に変換（空文字除去、トリム）
    const tags = tagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // 保存前の最終検証
    const error = validateTags(tags);
    if (error) {
      validationError = error;
      return;
    }

    onSave(tags);
  }

  function handleCancel() {
    onCancel();
  }

  // モーダル表示時にテキストエリアにフォーカス
  $effect(() => {
    if (show && textAreaElement) {
      textAreaElement.focus();
      textAreaElement.select();
    }
  });

  // キャプチャフェーズでキーイベントを処理してController側の処理を阻止
  let keyHandler: (e: KeyboardEvent) => void;
  let keyUpHandler: (e: KeyboardEvent) => void;
  onMount(() => {
    keyHandler = (e: KeyboardEvent) => {
      if (show) {
        handleKeydown(e);
      }
    };
    keyUpHandler = (e: KeyboardEvent) => {
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
