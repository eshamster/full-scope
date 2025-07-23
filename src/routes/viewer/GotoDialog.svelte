<style>
  @import './modal-styles.css';

  .goto-dialog {
    width: 25%;
    min-width: 300px;
  }

  .input-section {
    margin-bottom: 20px;
  }

  .input-field {
    font-size: 1.5rem;
    padding: 8px 12px;
    border: 2px solid #333;
    border-radius: 4px;
    text-align: center;
    width: 120px;
  }

  .input-field:focus {
    outline: none;
    border-color: #0066cc;
  }

  .range-text {
    font-size: 0.9rem;
    color: #666;
    margin-top: 5px;
  }
</style>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Props = {
    controller: import('./goto-dialog-controller.svelte').GotoDialogController;
  };

  const { controller }: Props = $props();

  let inputElement = $state<HTMLInputElement>();
  let keyHandler: (_e: KeyboardEvent) => void;

  function handleSubmit(): void {
    controller.handleDialogSubmit(controller.getValue());
  }

  function handleInputChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    controller.setValue(target.value);
  }

  function handleInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      controller.handleDialogCancel();
    } else {
      // TagEditorと同じように、ダイアログ表示中は他のキー操作の伝播を阻止
      e.stopPropagation();

      // ただし、数値入力は阻害しない（preventDefaultは呼ばない）
    }
  }

  // TagEditorと同じキャプチャフェーズハンドラーでPage handleKeydownを阻止
  onMount(() => {
    keyHandler = (e: KeyboardEvent) => {
      if (controller.isShow()) {
        handleInputKeydown(e);
      }
    };
    // キャプチャフェーズでハンドラを登録し、+page.svelteより先に実行
    document.addEventListener('keydown', keyHandler, true);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', keyHandler, true);
  });

  // ダイアログが表示されたときに入力フィールドにフォーカス
  $effect(() => {
    if (controller.isShow() && inputElement) {
      inputElement.focus();
      inputElement.select();
    }
  });
</script>

{#if controller.isShow()}
  <div class="modal-overlay">
    <div class="goto-dialog modal-dialog">
      <div class="modal-content">
        <div class="modal-title">画像番号を指定</div>
        <div class="input-section">
          <input
            bind:this={inputElement}
            class="input-field"
            type="number"
            min="1"
            max={controller.getMaxIndex()}
            value={controller.getValue()}
            oninput={handleInputChange}
            onkeydown={handleInputKeydown}
            placeholder="1"
          />
          <div class="range-text">1 - {controller.getMaxIndex()}</div>
        </div>
        <div class="modal-buttons">
          <button class="modal-button ok" onclick={handleSubmit}>OK</button>
          <button class="modal-button cancel" onclick={() => controller.handleDialogCancel()}
            >Cancel</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}
