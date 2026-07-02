const chunkTaskStorageKey = "fileUploadChunkTasks";
const legacyChunkTaskStorageKey = "fileUploadChunkTask";

function getFileTaskKey(fileOrTask) {
  const fileName = fileOrTask?.name || fileOrTask?.fileName || "";
  const fileSize = fileOrTask?.size || fileOrTask?.fileSize || "";
  const mimeType = fileOrTask?.type || fileOrTask?.mimeType || "";

  return `${fileName}|${fileSize}|${mimeType}`;
}

function parseStoredJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

function readStoredChunkTasks() {
  const tasks = parseStoredJson(chunkTaskStorageKey, {});
  const normalizedTasks =
    tasks && typeof tasks === "object" && !Array.isArray(tasks) ? tasks : {};
  const legacyTask = parseStoredJson(legacyChunkTaskStorageKey, null);

  if (legacyTask?.fileName && legacyTask?.fileSize) {
    const fileKey = legacyTask.fileKey || getFileTaskKey(legacyTask);
    normalizedTasks[fileKey] = { ...legacyTask, fileKey };
  }

  return normalizedTasks;
}

function persistChunkTasks(tasks) {
  localStorage.setItem(chunkTaskStorageKey, JSON.stringify(tasks));
  localStorage.removeItem(legacyChunkTaskStorageKey);
}

function getStoredChunkTask(file, tasks = readStoredChunkTasks()) {
  return tasks[getFileTaskKey(file)] || null;
}

function saveStoredChunkTask(task) {
  const tasks = readStoredChunkTasks();
  const fileKey = task.fileKey || getFileTaskKey(task);
  const nextTask = { ...task, fileKey };

  tasks[fileKey] = nextTask;
  persistChunkTasks(tasks);

  return nextTask;
}

function clearStoredChunkTask(task) {
  if (!task) {
    return;
  }

  const tasks = readStoredChunkTasks();
  delete tasks[task.fileKey || getFileTaskKey(task)];
  persistChunkTasks(tasks);
}

export {
  clearStoredChunkTask,
  getFileTaskKey,
  getStoredChunkTask,
  readStoredChunkTasks,
  saveStoredChunkTask,
};
