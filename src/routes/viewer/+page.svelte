<script lang="ts">
  import { invoke, convertFileSrc } from "@tauri-apps/api/core";
  import { listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { onMount, onDestroy } from "svelte";
  import { ImageInfo } from "./image-info";
  import { ImageInfoManager } from "./image-info-manager.svelte";
  import { Controler } from "./controller";

  getCurrentWindow().setFullscreen(true);

  type ImagePathsResp = {
    id: number;
    paths: string[];
  };

  let manager = $state<ImageInfoManager>(new ImageInfoManager());
  let controller = new Controler(manager);

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
    switch (event.key.toLowerCase()) {
    case "shift":
      controller.downModifierKey("shift");
      return;
    case "control":
      controller.downModifierKey("ctrl");
      return;
    case "alt":
      controller.downModifierKey("alt");
      return;
    }

    controller.execute(event.key);
  }
  function handleKeyup(event: KeyboardEvent) {
    switch (event.key.toLowerCase()) {
    case "shift":
      controller.upModifierKey("shift");
      return;
    case "control":
      controller.upModifierKey("ctrl");
      return;
    case "alt":
      controller.upModifierKey("alt");
      return;
    }
  }

  function handleMouseDown(event: MouseEvent) {
    switch (event.button) {
    case 0:
      // 左クリックはshiftキー扱い
      controller.downModifierKey("shift");
      break;
    case 2:
      controller.execute("RightClick");
      break;
    }
  }
  function handleMouseUp(event: MouseEvent) {
    switch (event.button) {
    case 0:
      controller.upModifierKey("shift");
      break;
    }
  }

  function handleWheel(event: WheelEvent) {
    if (event.deltaY > 0) {
      controller.execute("WheelDown");
    } else {
      controller.execute("WheelUp");
    }
  }

  function handleMouseleave(event: MouseEvent) {
    controller.resetModifierKeys();
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

    document.addEventListener("keydown", (event) => {
      handleKeydown(event);
    });
    document.addEventListener("keyup", (event) => {
      handleKeyup(event);
    });
    document.addEventListener("mousedown", (event) => {
      handleMouseDown(event);
    });
    document.addEventListener("mouseup", (event) => {
      handleMouseUp(event);
    });
    document.addEventListener("wheel", (event) => {
      handleWheel(event);
    });
    document.addEventListener("mouseleave", (event) => {
      handleMouseleave(event);
    });
    document.addEventListener("contextmenu", (event) => {
      event.preventDefault();
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
  {#if manager.getList().length > 0}
    <div id="page">
      {manager.getCaret() + 1} / {manager.getList().length}
    </div>
    <img id="image" src={convertFileSrc(manager.getCurrent().path)} alt={manager.getCurrent().path} />
  {/if}
  <!--
  {#each manager.getList() as imageInfo}
    <div>{convertFileSrc(imageInfo.path)}</div>
    <img src={convertFileSrc(imageInfo.path)} alt={imageInfo.path} />
  {/each}
  -->
</main>

<style>

  body {
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .container {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  #image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
  }

  #page {
    position: absolute;
    top: 0;
    left: 0;
    color: rgba(0, 0, 0, 0.5);
    background-color: white;
    padding: 0.5em;
  }

</style>
