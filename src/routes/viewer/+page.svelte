<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onDestroy } from "svelte";

  let paths = $state<string[]>([]);

  const unlisten = listen<string[]>("new-images", (event) => {
    paths = event.payload;
    console.log(paths);
  });

  // TODO: unlisten
  onDestroy(() => {
    if (unlisten && typeof unlisten === "function") {
      unlisten();
    } else {
      console.log(`skipped unlisten: ${unlisten}`);
    }
  });
</script>

<main class="container">
  <h1>Viewer Test</h1>
  {#each paths as path}
    <div>{path}</div>
  {/each}
</main>
