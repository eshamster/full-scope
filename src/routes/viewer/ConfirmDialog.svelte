<style>
  .confirm-dialog {
    position: absolute;
    top: auto;
    left: auto;
    width: 30%;
    height: 30%;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
  }

  .message {
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    font-size: 1rem;
    text-align: center;
    vertical-align: center;
  }

  .button {
    position: absolute;
    font-size: 2rem;
    border: 1px solid #333;
    border-radius: 4px;
    cursor: pointer;
    padding: 5px 20px;
  }
  .button.yes {
    background-color: #ccffcc;
    left: 15px;
    bottom: 15px;
  }
  .button.yes:hover {
    background-color: #99ff99;
  }
  .button.no {
    background-color: #ffcccc;
    right: 15px;
    bottom: 15px;
  }
  .button.no:hover {
    background-color: #ff9999;
  }
</style>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Props = {
    message: string;
    onNotify: (result: boolean) => void;
    show: boolean;
  };

  const { message, onNotify, show }: Props = $props();

  let keyHandler: (e: KeyboardEvent) => void;
  onMount(() => {
    keyHandler = (e: KeyboardEvent) => {
      if (!show || !onNotify) return;
      // ダイアログ表示中は Enter/Esc をダイアログ処理に限定し、下位のリスナーへ伝播しない
      const key = e.key.toLowerCase();
      switch (key) {
        case 'y':
        case 'enter':
          e.preventDefault();
          e.stopPropagation();
          onNotify(true);
          break;
        case 'n':
        case 'escape':
          e.preventDefault();
          e.stopPropagation();
          onNotify(false);
          break;
        default:
          return;
      }
    };
    // キャプチャフェーズでハンドラを登録し、バブリングフェーズの他リスナーを阻止
    document.addEventListener('keydown', keyHandler, true);
  });
  onDestroy(() => {
    document.removeEventListener('keydown', keyHandler, true);
  });
</script>

{#if show}
  <div class="confirm-dialog">
    <div class="message">
      <slot>{message}</slot>
    </div>
    <button class="button yes" onclick={() => onNotify(true)}><u>Y</u>es</button>
    <button class="button no" onclick={() => onNotify(false)}><u>N</u>o</button>
  </div>
{/if}
