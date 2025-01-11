<script lang="ts">
  import { onMount } from "svelte";

  type Props = {
    message: string;
    onNotify: (result: bool) => void;
  };

  const { message, onNotify, show }: Props = $props();

  // NOTE: documentでなくダイアログのdiv要素に付けるべき？
  // （現状複数のダイアログを設置する予定はないのでいったんこのまま）
  onMount(() => {
    document.addEventListener('keydown', (e) => {
      if (!show || !onNotify) {
        return;
      }

      switch (e.key) {
      case 'y':
        onNotify(true);
        break;
      case 'n':
        onNotify(false);
        break;
      }
    });
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
