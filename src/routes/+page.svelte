<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { onMount, onDestroy } from "svelte";

  async function handleDrop(event: DragDropEvent) {
    const inputPaths = event.payload.paths;
    await invoke("drop", { paths: inputPaths });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      getCurrentWindow().close();
    }
  }

  let unlisten;
  onMount(() => {
    // NOTE: window全体でのlistenなので特定のelementに絞りたい場合は下記参照
    // https://github.com/tauri-apps/tauri/discussions/4736#discussioncomment-8384945
    unlisten = getCurrentWindow().onDragDropEvent(async (event) => {
      if (event.payload.type === 'drop') {
        handleDrop(event);
      }

      document.addEventListener("keydown", (event) => {
        handleKeydown(event);
      });
    })
  });
  onDestroy(() => {
    if (unlisten && typeof unlisten === "function") {
      unlisten();
    } else {
      console.log(`skipped unlisten: ${unlisten}`);
    }
  });
</script>

<main class="container">
  <h1>Full Scope</h1>

  <!-- ファイルのドラッグ・ドロップを受け入れるdivフィールド -->
  <div id="dropper"></div>
</main>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  padding-top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

h1 {
  text-align: center;
}

#dropper {
  border: 2px dashed #000;
  width: 95%;
  height: 200px;
  padding: 20px;
}

</style>
