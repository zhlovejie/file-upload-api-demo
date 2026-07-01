const chunkTaskStorageKey = "fileUploadChunkTasks";
const legacyChunkTaskStorageKey = "fileUploadChunkTask";
const chunkRetryLimit = 3;
const chunkRetryDelayMs = 600;

function getFileTaskKey(fileOrTask) {
  const fileName = fileOrTask?.name || fileOrTask?.fileName || "";
  const fileSize = fileOrTask?.size || fileOrTask?.fileSize || "";
  const mimeType = fileOrTask?.type || fileOrTask?.mimeType || "";

  return `${fileName}|${fileSize}|${mimeType}`;
}

function readStoredChunkTasks() {
  const tasks = JSON.parse(localStorage.getItem(chunkTaskStorageKey) || "{}");
  const normalizedTasks =
    tasks && typeof tasks === "object" && !Array.isArray(tasks) ? tasks : {};
  const legacyTask = JSON.parse(
    localStorage.getItem(legacyChunkTaskStorageKey) || "null",
  );

  if (legacyTask?.fileName && legacyTask?.fileSize) {
    const fileKey = legacyTask.fileKey || getFileTaskKey(legacyTask);
    normalizedTasks[fileKey] = { ...legacyTask, fileKey };
  }

  return normalizedTasks;
}

const state = {
  singleFile: null,
  chunkFile: null,
  chunkTasks: readStoredChunkTasks(),
  chunkTask: null,
};

const elements = {
  apiBaseUrl: document.getElementById("apiBaseUrl"),
  toast: document.getElementById("toast"),
  singleDropZone: document.getElementById("singleDropZone"),
  singleFileInput: document.getElementById("singleFileInput"),
  singleSelectedFile: document.getElementById("singleSelectedFile"),
  singleProgressBar: document.getElementById("singleProgressBar"),
  singleProgressText: document.getElementById("singleProgressText"),
  singleStatusText: document.getElementById("singleStatusText"),
  singleUploadButton: document.getElementById("singleUploadButton"),
  singleResetButton: document.getElementById("singleResetButton"),
  singleResult: document.getElementById("singleResult"),
  chunkDropZone: document.getElementById("chunkDropZone"),
  chunkFileInput: document.getElementById("chunkFileInput"),
  chunkSelectedFile: document.getElementById("chunkSelectedFile"),
  chunkProgressBar: document.getElementById("chunkProgressBar"),
  chunkProgressText: document.getElementById("chunkProgressText"),
  chunkStatusText: document.getElementById("chunkStatusText"),
  chunkUploadButton: document.getElementById("chunkUploadButton"),
  chunkResumeButton: document.getElementById("chunkResumeButton"),
  chunkResetButton: document.getElementById("chunkResetButton"),
  chunkResult: document.getElementById("chunkResult"),
};

function getApiBaseUrl() {
  return elements.apiBaseUrl.value.replace(/\/$/, "");
}

function formatFileSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function setProgress(scope, percent, text) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  elements[`${scope}ProgressBar`].style.width = `${safePercent}%`;
  elements[`${scope}ProgressText`].textContent = `${safePercent}%`;

  if (text) {
    elements[`${scope}StatusText`].textContent = text;
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 4200);
}

function showResult(container, file) {
  const isImage = file.mimeType && file.mimeType.startsWith("image/");
  container.classList.add("is-visible");
  container.innerHTML = `
          <strong>Upload completed</strong>
          <a href="${file.publicUrl}" target="_blank" rel="noopener noreferrer">${file.publicUrl}</a>
          ${
            isImage
              ? `<img class="preview" src="${file.publicUrl}" alt="${file.originalName || file.storedFileName}" />`
              : `<span>${file.originalName || file.storedFileName} · ${formatFileSize(file.size || 0)}</span>`
          }
        `;
}

function resetResult(container) {
  container.classList.remove("is-visible");
  container.innerHTML = "";
}

function requestJson(method, url, body) {
  return fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (response) => {
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.success === false) {
      throw new Error(
        payload?.message || `Request failed with status ${response.status}.`,
      );
    }

    return payload.data;
  });
}

function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = () => {
      const payload = JSON.parse(xhr.responseText || "null");

      if (xhr.status >= 200 && xhr.status < 300 && payload?.success) {
        resolve(payload.data);
        return;
      }

      reject(
        new Error(
          payload?.message || `Upload failed with status ${xhr.status}.`,
        ),
      );
    };

    xhr.onerror = () =>
      reject(new Error("Network error while uploading file."));
    xhr.send(formData);
  });
}

function bindDropZone(dropZone, input, onFileSelected) {
  input.addEventListener("change", () => {
    onFileSelected(input.files[0] || null);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-active");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-active");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    onFileSelected(event.dataTransfer.files[0] || null);
  });
}

function selectSingleFile(file) {
  state.singleFile = file;
  resetResult(elements.singleResult);
  setProgress("single", 0, file ? "Ready to upload" : "Ready");
  elements.singleSelectedFile.textContent = file
    ? `${file.name} · ${formatFileSize(file.size)}`
    : "No file selected.";
}

async function uploadSingleFile() {
  if (!state.singleFile) {
    showToast("Please select a file before uploading.");
    return;
  }

  const formData = new FormData();
  formData.append("file", state.singleFile);

  elements.singleUploadButton.disabled = true;
  resetResult(elements.singleResult);
  setProgress("single", 0, "Uploading");

  try {
    const file = await uploadWithProgress(
      `${getApiBaseUrl()}/api/uploads/single`,
      formData,
      (percent) => setProgress("single", percent, "Uploading"),
    );
    setProgress("single", 100, "Completed");
    showResult(elements.singleResult, file);
  } catch (error) {
    setProgress("single", 0, "Failed");
    showToast(error.message);
  } finally {
    elements.singleUploadButton.disabled = false;
  }
}

function persistChunkTasks() {
  localStorage.setItem(chunkTaskStorageKey, JSON.stringify(state.chunkTasks));
  localStorage.removeItem(legacyChunkTaskStorageKey);
}

function getStoredChunkTask(file) {
  return state.chunkTasks[getFileTaskKey(file)] || null;
}

function selectChunkFile(file) {
  state.chunkFile = file;
  state.chunkTask = file ? getStoredChunkTask(file) : null;
  resetResult(elements.chunkResult);
  setProgress(
    "chunk",
    0,
    state.chunkTask ? "Ready to resume" : file ? "Ready to upload" : "Ready",
  );
  elements.chunkSelectedFile.textContent = file
    ? `${file.name} - ${formatFileSize(file.size)}`
    : "No file selected.";
}

function saveChunkTask(task) {
  const fileKey = task.fileKey || getFileTaskKey(task);
  const nextTask = { ...task, fileKey };

  state.chunkTask = nextTask;
  state.chunkTasks[fileKey] = nextTask;
  persistChunkTasks();
}

function clearChunkTask(task = state.chunkTask) {
  if (task) {
    delete state.chunkTasks[task.fileKey || getFileTaskKey(task)];
  }

  state.chunkTask = null;
  persistChunkTasks();
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createChunkIndexes(totalChunks, uploadedChunks) {
  const uploaded = new Set(uploadedChunks || []);

  return Array.from({ length: totalChunks }, (_, index) => index).filter(
    (index) => !uploaded.has(index),
  );
}

async function readChunkStatus(uploadId) {
  return requestJson(
    "GET",
    `${getApiBaseUrl()}/api/uploads/chunks/${uploadId}/status`,
  );
}

async function createOrResumeChunkTask(file) {
  const chunkSize = 2 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / chunkSize);
  const mimeType = file.type || "application/octet-stream";
  const fileKey = getFileTaskKey(file);
  const storedTask = getStoredChunkTask(file);

  if (storedTask) {
    try {
      const status = await readChunkStatus(storedTask.uploadId);
      const resumedTask = {
        ...storedTask,
        fileKey,
        uploadedChunks: status.uploadedChunks,
        totalChunks: status.totalChunks,
      };

      saveChunkTask(resumedTask);
      return resumedTask;
    } catch (error) {
      clearChunkTask(storedTask);
    }
  }

  const task = await requestJson(
    "POST",
    `${getApiBaseUrl()}/api/uploads/chunks/init`,
    {
      fileName: file.name,
      mimeType,
      fileSize: file.size,
      chunkSize,
      totalChunks,
    },
  );

  const nextTask = {
    uploadId: task.uploadId,
    fileKey,
    fileName: file.name,
    fileSize: file.size,
    mimeType,
    chunkSize,
    totalChunks,
    uploadedChunks: task.uploadedChunks,
  };

  saveChunkTask(nextTask);
  return nextTask;
}

async function sendChunkPart(file, task, chunkIndex) {
  const start = chunkIndex * task.chunkSize;
  const end = Math.min(file.size, start + task.chunkSize);
  const formData = new FormData();

  formData.append("chunk", file.slice(start, end));
  formData.append("chunkIndex", String(chunkIndex));

  const response = await fetch(
    `${getApiBaseUrl()}/api/uploads/chunks/${task.uploadId}/part`,
    {
      method: "POST",
      body: formData,
    },
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `Chunk ${chunkIndex} failed.`);
  }

  return payload.data;
}

async function uploadChunkPart(file, task, chunkIndex) {
  let lastError = null;

  for (let attempt = 1; attempt <= chunkRetryLimit; attempt += 1) {
    try {
      return await sendChunkPart(file, task, chunkIndex);
    } catch (error) {
      lastError = error;

      if (attempt < chunkRetryLimit) {
        await wait(chunkRetryDelayMs * attempt);
      }
    }
  }

  throw new Error(
    `Chunk ${chunkIndex} failed after ${chunkRetryLimit} attempts: ${lastError.message}`,
  );
}

async function uploadMissingChunks(file, task, uploaded) {
  const chunkIndexes = createChunkIndexes(task.totalChunks, uploaded);
  const concurrency = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < chunkIndexes.length) {
      const chunkIndex = chunkIndexes[cursor];
      cursor += 1;

      await uploadChunkPart(file, task, chunkIndex);
      uploaded.add(chunkIndex);
      saveChunkTask({ ...task, uploadedChunks: Array.from(uploaded) });
      setProgress(
        "chunk",
        (uploaded.size / task.totalChunks) * 100,
        "Uploading",
      );
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunkIndexes.length) }, worker),
  );
}

async function uploadLargeFile() {
  if (!state.chunkFile) {
    showToast("Please select a large file before uploading.");
    return;
  }

  elements.chunkUploadButton.disabled = true;
  elements.chunkResumeButton.disabled = true;
  resetResult(elements.chunkResult);

  try {
    const task = await createOrResumeChunkTask(state.chunkFile);
    const uploaded = new Set(task.uploadedChunks || []);

    setProgress(
      "chunk",
      (uploaded.size / task.totalChunks) * 100,
      uploaded.size > 0 ? "Resuming" : "Uploading",
    );

    await uploadMissingChunks(state.chunkFile, task, uploaded);

    let status = await readChunkStatus(task.uploadId);
    let missingChunks = status.missingChunks || [];

    if (missingChunks.length > 0) {
      setProgress(
        "chunk",
        ((status.uploadedChunks || []).length / task.totalChunks) * 100,
        "Retrying missing chunks",
      );
      await uploadMissingChunks(
        state.chunkFile,
        task,
        new Set(status.uploadedChunks || []),
      );
      status = await readChunkStatus(task.uploadId);
      missingChunks = status.missingChunks || [];
    }

    if (missingChunks.length > 0) {
      throw new Error(`Missing chunks before merge: ${missingChunks.join(", ")}`);
    }

    setProgress("chunk", 100, "Merging");

    const mergedFile = await requestJson(
      "POST",
      `${getApiBaseUrl()}/api/uploads/chunks/${task.uploadId}/merge`,
    );

    clearChunkTask();
    setProgress("chunk", 100, "Completed");
    showResult(elements.chunkResult, mergedFile);
  } catch (error) {
    setProgress("chunk", 0, "Failed");
    showToast(error.message);
  } finally {
    elements.chunkUploadButton.disabled = false;
    elements.chunkResumeButton.disabled = false;
  }
}

async function resumeChunkTask() {
  if (!state.chunkFile) {
    showToast("Please select the same local file first, then resume the task.");
    return;
  }

  state.chunkTask = getStoredChunkTask(state.chunkFile);

  if (!state.chunkTask) {
    showToast("No unfinished chunk upload task was found in this browser.");
    return;
  }

  await uploadLargeFile();
}

bindDropZone(
  elements.singleDropZone,
  elements.singleFileInput,
  selectSingleFile,
);
bindDropZone(elements.chunkDropZone, elements.chunkFileInput, selectChunkFile);

elements.singleUploadButton.addEventListener("click", uploadSingleFile);
elements.singleResetButton.addEventListener("click", () => {
  elements.singleFileInput.value = "";
  selectSingleFile(null);
});
elements.chunkUploadButton.addEventListener("click", uploadLargeFile);
elements.chunkResumeButton.addEventListener("click", resumeChunkTask);
elements.chunkResetButton.addEventListener("click", () => {
  elements.chunkFileInput.value = "";
  selectChunkFile(null);
  clearChunkTask();
});

const pendingChunkTasks = Object.values(state.chunkTasks);

if (pendingChunkTasks.length > 0) {
  elements.chunkStatusText.textContent = `Pending resume task: ${pendingChunkTasks[0].fileName}`;
}
