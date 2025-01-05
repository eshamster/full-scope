<script lang="ts">
  import { invoke, convertFileSrc } from "@tauri-apps/api/core";
  import { listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { onMount, onDestroy } from "svelte";
  import { ImageInfo } from "./image-info";
  import { ImageInfoManager } from "./image-info-manager.svelte";

  type ImagePathsResp = {
    id: number;
    paths: string[];
  };

  let manager = $state<ImageInfoManager>(new ImageInfoManager());

  function handleImagePaths(resp: ImagePathsResp) {
    const images = resp.paths.map((path) => {
      return new ImageInfo(path);
    });
    manager.addImages(images);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      getCurrentWindow().close();
    }
  }

  let unlisten;
  onMount(async () => {
    unlisten = listen<ImagePathsResp>("new-images", (event) => {
      handleImagePaths(event.payload);
    });

    // 初回はlistenが間に合わないので、明示的にリクエストを送る
    // ※万が一重複した場合は ImageInfoManager 側で排除
    const resp = await invoke("get_prev_image_paths", {});
    handleImagePaths(resp);

    // ESCキーでウィンドウを閉じる
    document.addEventListener("keydown", (event) => {
      handleKeydown(event);
    });
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
  <h1>Viewer Test</h1>
  {#each manager.getList() as imageInfo}
    <div>{convertFileSrc(imageInfo.path)}</div>
    <img src={convertFileSrc(imageInfo.path)} alt={imageInfo.path} />
  {/each}
</main>
