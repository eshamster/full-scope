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
  let textAreaElement: HTMLTextAreaElement;
  let ignoreNextInput = $state(false);

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

  function handleSave() {
    // カンマ区切りテキストをタグ配列に変換（空文字除去、トリム）
    const tags = tagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
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
  <div class="modal-overlay" on:click={handleCancel}>
    <div class="modal-content" on:click|stopPropagation>
      <h3>タグ編集</h3>
      <div class="image-path">
        {imagePath}
      </div>
      <textarea
        bind:this={textAreaElement}
        bind:value={tagsText}
        on:input={(e) => {
          // 開始直後の入力を無視
          if (ignoreNextInput) {
            e.preventDefault();
            tagsText = initialTags.join(', ');
          }
        }}
        placeholder="タグをカンマ区切りで入力してください"
        rows="4"
        cols="50"
      ></textarea>
      <div class="button-group">
        <button on:click={handleSave} class="save-button">保存 (Enter)</button>
        <button on:click={handleCancel} class="cancel-button">キャンセル (Escape)</button>
      </div>
    </div>
  </div>
{/if}

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
    margin-bottom: 1em;
    padding: 0.5em;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    resize: vertical;
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

  .save-button:hover {
    background-color: #0056b3;
  }

  .cancel-button {
    background-color: #6c757d;
    color: white;
  }

  .cancel-button:hover {
    background-color: #545b62;
  }
</style>
