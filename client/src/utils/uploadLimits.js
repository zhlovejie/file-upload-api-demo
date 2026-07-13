import { formatFileSize } from "./file.js";

const fallbackAllowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".mp4",
  ".mov",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".zip",
];

function getExtension(fileName = "") {
  const dotIndex = fileName.lastIndexOf(".");

  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function getAllowedExtensions(uploadConfig) {
  const extensions = Array.isArray(uploadConfig?.allowedExtensions)
    ? uploadConfig.allowedExtensions
    : fallbackAllowedExtensions;

  return extensions.map((extension) => String(extension).toLowerCase());
}

function getAllowedMimeTypes(uploadConfig) {
  return Array.isArray(uploadConfig?.allowedMimeTypes)
    ? uploadConfig.allowedMimeTypes.map((mimeType) => String(mimeType).toLowerCase())
    : [];
}

function formatAllowedExtensions(uploadConfig) {
  return getAllowedExtensions(uploadConfig).join(", ");
}

function getAcceptValue(uploadConfig) {
  const extensions = getAllowedExtensions(uploadConfig);
  const mimeTypes = getAllowedMimeTypes(uploadConfig);

  return [...extensions, ...mimeTypes].join(",");
}

function getMaxBytes(uploadConfig, key, fallbackBytes) {
  const configuredValue = Number(uploadConfig?.[key]);

  return Number.isFinite(configuredValue) && configuredValue > 0
    ? configuredValue
    : fallbackBytes;
}

function validateUploadFile({ file, uploadConfig, maxSizeBytes, uploadKind }) {
  if (!file) {
    return null;
  }

  const extension = getExtension(file.name);
  const allowedExtensions = getAllowedExtensions(uploadConfig);
  const allowedMimeTypes = getAllowedMimeTypes(uploadConfig);
  const mimeType = String(file.type || "").toLowerCase();

  if (!extension || !allowedExtensions.includes(extension)) {
    return `${uploadKind} only supports: ${formatAllowedExtensions(uploadConfig)}. Selected file extension: ${extension || "none"}.`;
  }

  if (mimeType && allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(mimeType)) {
    return `${uploadKind} does not accept MIME type "${file.type}". Please choose a supported ${extension} file.`;
  }

  if (Number(file.size) > maxSizeBytes) {
    return `${uploadKind} limit is ${formatFileSize(maxSizeBytes)}. Selected file is ${formatFileSize(file.size)}.`;
  }

  return null;
}

function buildLimitSummary({ uploadConfig, maxSizeBytes, mode }) {
  const summaryItems = [
    {
      label: "Max file size",
      value: formatFileSize(maxSizeBytes),
    },
    {
      label: "File types",
      value: formatAllowedExtensions(uploadConfig),
    },
  ];

  if (mode === "chunk") {
    summaryItems.splice(1, 0, {
      label: "Chunk size",
      value: formatFileSize(getMaxBytes(uploadConfig, "defaultChunkSizeBytes", 1024 * 1024)),
    });
  }

  return summaryItems;
}

export {
  buildLimitSummary,
  formatAllowedExtensions,
  getAcceptValue,
  getMaxBytes,
  validateUploadFile,
};
