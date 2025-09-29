// chunkUpload.js

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk

/**
 * Split a File into Blob chunks.
 * @param {File} file 
 * @returns {Blob[]}
 */
function createChunks(file) {
  const chunks = [];
  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    chunks.push(file.slice(offset, end));
    offset = end;
  }
  return chunks;
}

/**
 * Perform the multipart chunk upload workflow.
 * @param {File} file 
 */
async function uploadFileInChunks(file) {
  // 1. Initialize upload
  const initRes = await fetch('/api/uploads/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      totalSize: file.size,
      chunkSize: CHUNK_SIZE
    })
  });
  const { uploadId } = await initRes.json();

  // 2. Create and upload chunks
  const chunks = createChunks(file);
  for (let index = 0; index < chunks.length; index++) {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', index);
    formData.append('chunk', chunks[index]);
    console.log(`Uploading chunk ${index + 1}/${chunks.length}: ${formData}`);
    await fetch('/api/uploads/chunk', {
      method: 'POST',
      body: formData
    });
  }

  // 3. Complete upload
  await fetch('/api/uploads/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId })
  });

  alert('Upload complete!');
}

/**
 * onClick handler for the upload button.
 */
function handleUploadClick() {
  const input = document.getElementById('fileInput');
  if (!input.files.length) {
    alert('Please select a file first.');
    return;
  }
  uploadFileInChunks(input.files[0]).catch(err => {
    console.error(err);
    alert('Upload failed. Check console for details.');
  });
}

// Attach event listener after DOM loads
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('uploadBtn')
          .addEventListener('click', handleUploadClick);
});
