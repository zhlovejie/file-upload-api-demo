import { useMemo, useState } from "react";
import {
  createChunkTask,
  readChunkStatus,
  readUploadConfig,
  mergeChunks,
  uploadChunkPart,
} from "../services/uploadApi.js";
import {
  clearStoredChunkTask,
  getFileTaskKey,
  getStoredChunkTask,
  readStoredChunkTasks,
  saveStoredChunkTask,
} from "../utils/chunkTaskStorage.js";
import { formatFileSize } from "../utils/file.js";

const chunkRetryLimit = 3;
const chunkRetryDelayMs = 600;
const concurrency = 4;
const fallbackChunkSizeBytes = 1024 * 1024;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createChunkIndexes(totalChunks, uploadedChunks) {
  const uploaded = new Set(uploadedChunks || []);

  return Array.from({ length: totalChunks }, (_, index) => index).filter(
    (index) => !uploaded.has(index),
  );
}

function resolveChunkSize(uploadConfig) {
  const defaultChunkSize = Number(uploadConfig?.defaultChunkSizeBytes);
  const maxChunkSize = Number(uploadConfig?.maxChunkSizeBytes);
  const configuredChunkSize =
    Number.isFinite(defaultChunkSize) && defaultChunkSize > 0
      ? defaultChunkSize
      : fallbackChunkSizeBytes;

  if (Number.isFinite(maxChunkSize) && maxChunkSize > 0) {
    return Math.min(configuredChunkSize, maxChunkSize);
  }

  return configuredChunkSize;
}

function useChunkUpload({ apiBaseUrl, onUploaded, toast }) {
  const [file, setFile] = useState(null);
  const [task, setTask] = useState(null);
  const [tasks, setTasks] = useState(() => readStoredChunkTasks());
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(() => {
    const pendingTasks = Object.values(readStoredChunkTasks());
    return pendingTasks.length > 0
      ? `Pending resume task: ${pendingTasks[0].fileName}`
      : "Ready";
  });
  const [result, setResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectedFileText = useMemo(
    () => (file ? `${file.name} - ${formatFileSize(file.size)}` : "No file selected."),
    [file],
  );

  function syncTask(nextTask) {
    const storedTask = saveStoredChunkTask(nextTask);
    setTask(storedTask);
    setTasks(readStoredChunkTasks());
    return storedTask;
  }

  function removeTask(nextTask = task) {
    clearStoredChunkTask(nextTask);
    setTask(null);
    setTasks(readStoredChunkTasks());
  }

  function selectFile(nextFile) {
    const storedTask = nextFile ? getStoredChunkTask(nextFile, tasks) : null;

    setFile(nextFile);
    setTask(storedTask);
    setResult(null);
    setProgress(0);
    setStatus(storedTask ? "Ready to resume" : nextFile ? "Ready to upload" : "Ready");
  }

  function reset() {
    setFile(null);
    setResult(null);
    setProgress(0);
    setStatus("Ready");
    removeTask();
  }

  async function createOrResumeChunkTask() {
    const uploadConfig = await readUploadConfig({ apiBaseUrl });
    const chunkSize = resolveChunkSize(uploadConfig);
    const totalChunks = Math.ceil(file.size / chunkSize);
    const mimeType = file.type || "application/octet-stream";
    const fileKey = getFileTaskKey(file);
    const storedTask = getStoredChunkTask(file, tasks);

    if (storedTask) {
      if (Number(storedTask.chunkSize) !== chunkSize) {
        removeTask(storedTask);
      } else {
        try {
          const remoteStatus = await readChunkStatus({
            apiBaseUrl,
            uploadId: storedTask.uploadId,
          });
          return syncTask({
            ...storedTask,
            fileKey,
            uploadedChunks: remoteStatus.uploadedChunks,
            totalChunks: remoteStatus.totalChunks,
          });
        } catch (error) {
          removeTask(storedTask);
        }
      }
    }

    const nextTask = await createChunkTask({
      apiBaseUrl,
      payload: {
        fileName: file.name,
        mimeType,
        fileSize: file.size,
        chunkSize,
        totalChunks,
      },
    });

    return syncTask({
      uploadId: nextTask.uploadId,
      fileKey,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      chunkSize: nextTask.chunkSize || chunkSize,
      totalChunks: Math.ceil(file.size / (nextTask.chunkSize || chunkSize)),
      uploadedChunks: nextTask.uploadedChunks,
    });
  }

  async function uploadChunkWithRetry(nextTask, chunkIndex) {
    let lastError = null;

    for (let attempt = 1; attempt <= chunkRetryLimit; attempt += 1) {
      try {
        return await uploadChunkPart({
          apiBaseUrl,
          file,
          task: nextTask,
          chunkIndex,
        });
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

  async function uploadMissingChunks(nextTask, uploaded) {
    const chunkIndexes = createChunkIndexes(nextTask.totalChunks, uploaded);
    let cursor = 0;

    async function worker() {
      while (cursor < chunkIndexes.length) {
        const chunkIndex = chunkIndexes[cursor];
        cursor += 1;

        await uploadChunkWithRetry(nextTask, chunkIndex);
        uploaded.add(chunkIndex);
        syncTask({ ...nextTask, uploadedChunks: Array.from(uploaded) });
        setProgress((uploaded.size / nextTask.totalChunks) * 100);
        setStatus("Uploading");
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, chunkIndexes.length) }, worker),
    );
  }

  async function upload() {
    if (!file) {
      toast("Please select a large file before uploading.");
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const nextTask = await createOrResumeChunkTask();
      const uploaded = new Set(nextTask.uploadedChunks || []);

      setProgress((uploaded.size / nextTask.totalChunks) * 100);
      setStatus(uploaded.size > 0 ? "Resuming" : "Uploading");

      await uploadMissingChunks(nextTask, uploaded);

      let remoteStatus = await readChunkStatus({
        apiBaseUrl,
        uploadId: nextTask.uploadId,
      });
      let missingChunks = remoteStatus.missingChunks || [];

      if (missingChunks.length > 0) {
        setProgress(
          ((remoteStatus.uploadedChunks || []).length / nextTask.totalChunks) * 100,
        );
        setStatus("Retrying missing chunks");
        await uploadMissingChunks(
          nextTask,
          new Set(remoteStatus.uploadedChunks || []),
        );
        remoteStatus = await readChunkStatus({
          apiBaseUrl,
          uploadId: nextTask.uploadId,
        });
        missingChunks = remoteStatus.missingChunks || [];
      }

      if (missingChunks.length > 0) {
        throw new Error(`Missing chunks before merge: ${missingChunks.join(", ")}`);
      }

      setProgress(100);
      setStatus("Merging");

      const mergedFile = await mergeChunks({
        apiBaseUrl,
        uploadId: nextTask.uploadId,
      });

      removeTask(nextTask);
      setProgress(100);
      setStatus("Completed");
      setResult(mergedFile);
      onUploaded?.(mergedFile);
    } catch (error) {
      setProgress(0);
      setStatus("Failed");
      toast(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function resume() {
    if (!file) {
      toast("Please select the same local file first, then resume the task.");
      return;
    }

    const storedTask = getStoredChunkTask(file, tasks);

    if (!storedTask) {
      toast("No unfinished chunk upload task was found in this browser.");
      return;
    }

    setTask(storedTask);
    await upload();
  }

  return {
    selectedFileText,
    progress,
    status,
    result,
    isUploading,
    selectFile,
    reset,
    resume,
    upload,
  };
}

export { useChunkUpload };
