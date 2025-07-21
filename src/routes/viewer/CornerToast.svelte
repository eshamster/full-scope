<style>
  .corner-toast {
    position: fixed;
    top: 0;
    right: 0;
    background-color: rgba(255, 255, 255, 0.8);
    color: black;
    padding: 2px;
    border-top-left-radius: 3px;
  }

  .message {
    font-size: 1rem;
  }
</style>

<script lang="ts">
  import { fade } from 'svelte/transition';

  type Props = {
    message: string;
    show: boolean;
  };

  let { message, show }: Props = $props();
</script>

{#if show}
  <div class="corner-toast" transition:fade={{ duration: 100 }}>
    <div class="message">{message}</div>
  </div>
{/if}
