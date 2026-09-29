<style>
  .help-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2em 3em;
    box-sizing: border-box;
    overflow: auto;
    background-color: rgba(255, 255, 255, 0.92);
    color: #222;
  }

  .help-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.5em;
  }

  .help-title {
    font-size: 1.5rem;
    font-weight: bold;
  }

  .help-hint {
    margin-top: 0.3em;
    font-size: 0.85rem;
    color: #666;
  }

  .help-sections {
    width: 100%;
    max-width: 1400px;
    columns: 3 360px;
    column-gap: 3em;
  }

  .help-section {
    break-inside: avoid;
    margin-bottom: 1.5em;
  }

  .help-category {
    margin: 0 0 0.5em;
    padding-bottom: 0.2em;
    font-size: 1.05rem;
    border-bottom: 2px solid #bbb;
  }

  .help-items {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.35em 1.5em;
    margin: 0;
  }

  .help-description {
    white-space: nowrap;
  }

  .help-keys {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3em;
    margin: 0;
  }

  kbd {
    padding: 0.05em 0.45em;
    font-family: inherit;
    font-size: 0.85rem;
    background-color: #f4f4f4;
    border: 1px solid #bbb;
    border-bottom-width: 2px;
    border-radius: 4px;
    white-space: nowrap;
  }
</style>

<script lang="ts">
  import type { HelpSection } from './help-content';

  let {
    show,
    title,
    sections,
  }: {
    show: boolean;
    title: string;
    sections: HelpSection[];
  } = $props();
</script>

{#if show}
  <div class="help-overlay" data-testid="help-overlay">
    <div class="help-header">
      <div class="help-title">コマンド一覧 ({title})</div>
      <div class="help-hint">何かキーを押すかクリックすると閉じます</div>
    </div>
    <div class="help-sections">
      {#each sections as section (section.category)}
        <section class="help-section">
          <h2 class="help-category">{section.category}</h2>
          <dl class="help-items">
            {#each section.items as item (item.description)}
              <dt class="help-description">{item.description}</dt>
              <dd class="help-keys">
                {#each item.keys as key, index (index)}
                  <kbd>{key}</kbd>
                {/each}
              </dd>
            {/each}
          </dl>
        </section>
      {/each}
    </div>
  </div>
{/if}
