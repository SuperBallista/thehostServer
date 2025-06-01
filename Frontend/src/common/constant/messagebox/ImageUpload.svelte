<script lang="ts">
    export let multiple: boolean = false;
    export let accept: string = "image/*"; // ✅ 이미지 파일만 선택 가능
    export let maxSizeMB: number = 5; // ✅ 최대 파일 크기 제한
    export let label: string = "이미지 업로드";
    export let dragAndDrop: boolean = false; // ✅ 드래그 앤 드롭 활성화 여부
  
    let files: File[] = [];
    let previewUrls: string[] = [];
  
    function handleFileSelect(event: Event) {
      const inputFiles = (event.target as HTMLInputElement).files;
      processFiles(inputFiles ?? null);
    }
  
    function handleDrop(event: DragEvent) {
      event.preventDefault();
      if (!dragAndDrop) return;
      processFiles(event.dataTransfer?.files ?? null);
    }
  
    function processFiles(fileList: FileList | null) {
      if (!fileList) return;
  
      const newFiles = Array.from(fileList).filter(file => {
        if (!file.type.startsWith("image/")) return false;
        return file.size <= maxSizeMB * 1024 * 1024;
      });
  
      files = multiple ? [...files, ...newFiles] : newFiles;
  
      // ✅ 이미지 미리보기 URL 생성
      previewUrls = files.map(file => URL.createObjectURL(file));
    }
  
    function removeFile(index: number) {
  files = files.slice(0, index).concat(files.slice(index + 1)); // ✅ 새 배열로 변경
  previewUrls = previewUrls.slice(0, index).concat(previewUrls.slice(index + 1));
}

</script>
  
  <style>
    .upload-button {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #3498db;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      transition: 0.2s;
      border: none;
      font-size: 16px;
    }
  
    .upload-button:hover {
      background-color: #2980b9;
    }
  
    .drag-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      border: 2px dashed #ddd;
      cursor: pointer;
      transition: 0.2s;
      margin-top: 10px;
    }
  
    .drag-container:hover {
      opacity: 0.9;
    }
  
    .preview-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
  
    .preview-item {
      position: relative;
      width: 100px;
      height: 100px;
      border-radius: 5px;
      overflow: hidden;
    }
  
    .preview-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  
    .remove-btn {
      position: absolute;
      top: 5px;
      right: 5px;
      background: red;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      width: 20px;
      height: 20px;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  
    .file-input {
      display: none;
    }
  </style>
  
  <!-- ✅ 버튼형 이미지 업로드 -->
  <button class="upload-button" on:click={() => document.getElementById('fileInput')?.click()}>
    📷 {label}
  </button>
  
  <input
    id="fileInput"
    class="file-input"
    type="file"
    multiple={multiple}
    accept={accept}
    on:change={handleFileSelect}
  />
  
  <!-- ✅ 드래그 앤 드롭 옵션 -->
  {#if dragAndDrop}
    <div class="drag-container" on:dragover|preventDefault on:drop={handleDrop}>
      <p>여기에 이미지를 드래그 & 드롭하세요.</p>
    </div>
  {/if}
  
  <!-- ✅ 이미지 미리보기 -->
  {#if previewUrls.length > 0}
    <div class="preview-container">
      {#each previewUrls as url, index}
        <div class="preview-item">
          <img src={url} alt="이미지 미리보기" />
          <button class="remove-btn" on:click={() => removeFile(index)}>❌</button>
        </div>
      {/each}
    </div>
  {/if}
  