function getApiBaseUrl(apiBaseUrl) {
  return apiBaseUrl.replace(/\/$/, "");
}

async function parsePayload(response) {
  return response.json().catch(() => null);
}

async function requestJson({ method, url, body }) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await parsePayload(response);

  if (!response.ok || !payload || payload.success === false) {
    throw new Error(
      payload?.message || `Request failed with status ${response.status}.`,
    );
  }

  return payload.data;
}

async function requestBlob({ method, url, body }) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = await parsePayload(response);
    throw new Error(
      payload?.message || `Request failed with status ${response.status}.`,
    );
  }

  return {
    blob: await response.blob(),
    fileName:
      response.headers
        .get("content-disposition")
        ?.match(/filename="?([^";]+)"?/i)?.[1] || "uploaded-files.zip",
  };
}

function uploadSingleFileWithProgress({ apiBaseUrl, file, onProgress }) {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getApiBaseUrl(apiBaseUrl)}/api/uploads/single`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = () => {
      let payload = null;

      try {
        payload = JSON.parse(xhr.responseText || "null");
      } catch (error) {
        reject(new Error("Upload server returned an invalid JSON response."));
        return;
      }

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

    xhr.onerror = () => reject(new Error("Network error while uploading file."));
    xhr.send(formData);
  });
}

function createChunkTask({ apiBaseUrl, payload }) {
  return requestJson({
    method: "POST",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/chunks/init`,
    body: payload,
  });
}

function readChunkStatus({ apiBaseUrl, uploadId }) {
  return requestJson({
    method: "GET",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/chunks/${uploadId}/status`,
  });
}

async function uploadChunkPart({ apiBaseUrl, file, task, chunkIndex }) {
  const start = chunkIndex * task.chunkSize;
  const end = Math.min(file.size, start + task.chunkSize);
  const formData = new FormData();

  formData.append("chunk", file.slice(start, end));
  formData.append("chunkIndex", String(chunkIndex));

  const response = await fetch(
    `${getApiBaseUrl(apiBaseUrl)}/api/uploads/chunks/${task.uploadId}/part`,
    {
      method: "POST",
      body: formData,
    },
  );
  const payload = await parsePayload(response);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `Chunk ${chunkIndex} failed.`);
  }

  return payload.data;
}

function mergeChunks({ apiBaseUrl, uploadId }) {
  return requestJson({
    method: "POST",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/chunks/${uploadId}/merge`,
  });
}

function listUploadedFiles({ apiBaseUrl, params }) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  return requestJson({
    method: "GET",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/files?${query.toString()}`,
  });
}

function deleteUploadedFile({ apiBaseUrl, storedFileName }) {
  return requestJson({
    method: "DELETE",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/files/${encodeURIComponent(storedFileName)}`,
  });
}

function getUploadedFile({ apiBaseUrl, storedFileName }) {
  return requestJson({
    method: "GET",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/files/${encodeURIComponent(storedFileName)}`,
  });
}

function deleteUploadedFiles({ apiBaseUrl, storedFileNames }) {
  return requestJson({
    method: "POST",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/files/batch-delete`,
    body: { storedFileNames },
  });
}

function downloadUploadedFiles({ apiBaseUrl, storedFileNames }) {
  return requestBlob({
    method: "POST",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/files/batch-download`,
    body: { storedFileNames },
  });
}

function updateUploadedFileAccess({ apiBaseUrl, storedFileName, visibility }) {
  return requestJson({
    method: "PATCH",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/files/${encodeURIComponent(storedFileName)}/access`,
    body: { visibility },
  });
}

function rotateUploadedFileShareLink({ apiBaseUrl, storedFileName }) {
  return requestJson({
    method: "POST",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/files/${encodeURIComponent(storedFileName)}/share`,
  });
}

function listUploadHistory({ apiBaseUrl, params = {} }) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  return requestJson({
    method: "GET",
    url: `${getApiBaseUrl(apiBaseUrl)}/api/uploads/history?${query.toString()}`,
  });
}

export {
  createChunkTask,
  deleteUploadedFiles,
  deleteUploadedFile,
  downloadUploadedFiles,
  getUploadedFile,
  getApiBaseUrl,
  listUploadHistory,
  listUploadedFiles,
  mergeChunks,
  readChunkStatus,
  rotateUploadedFileShareLink,
  updateUploadedFileAccess,
  uploadChunkPart,
  uploadSingleFileWithProgress,
};
