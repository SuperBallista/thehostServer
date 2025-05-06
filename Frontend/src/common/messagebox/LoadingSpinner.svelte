<script lang="ts">
  export let size = 40;
  export let color = "#3498db";
  export let type: "circle" | "dots" | "bars" | "wave" = "dots"; // ✅ 다양한 스타일 추가
</script>

<style>
  /* ✅ 공통 스타일 */
  .spinner-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: var(--spinner-size);
  }

  /* ✅ 1. 원형 회전 스피너 (기본) */
  .circle {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-top-color: var(--spinner-color);
    border-radius: 50%;
    width: var(--spinner-size);
    height: var(--spinner-size);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* ✅ 2. 점점점 스피너 */
  .dots span {
    width: 8px;
    height: 8px;
    background-color: var(--spinner-color);
    border-radius: 50%;
    display: inline-block;
    animation: blink 1.4s infinite;
  }

  .dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes blink {
    0%, 80%, 100% { opacity: 0.3; transform: scale(1); }
    40% { opacity: 1; transform: scale(1.2); }
  }

  /* ✅ 3. 막대 스피너 */
  .bars span {
    display: inline-block;
    width: 4px;
    height: var(--spinner-size);
    background-color: var(--spinner-color);
    margin: 0 2px;
    animation: bar 1.2s infinite ease-in-out;
  }

  .bars span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .bars span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bar {
    0%, 40%, 100% { transform: scaleY(0.3); }
    20% { transform: scaleY(1); }
  }

  /* ✅ 4. 웨이브 스피너 */
  .wave span {
    display: inline-block;
    width: 5px;
    height: var(--spinner-size);
    background-color: var(--spinner-color);
    margin: 0 2px;
    animation: wave 1.2s infinite ease-in-out;
  }

  .wave span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .wave span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes wave {
    0%, 40%, 100% { transform: scaleY(0.3); }
    20% { transform: scaleY(1); }
  }
</style>

<div class="spinner-container" style="--spinner-size: {size}px; --spinner-color: {color};">
  {#if type === "circle"}
    <div class="circle"></div>
  {:else if type === "dots"}
    <div class="dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  {:else if type === "bars"}
    <div class="bars">
      <span></span>
      <span></span>
      <span></span>
    </div>
  {:else if type === "wave"}
    <div class="wave">
      <span></span>
      <span></span>
      <span></span>
    </div>
  {/if}
</div>
