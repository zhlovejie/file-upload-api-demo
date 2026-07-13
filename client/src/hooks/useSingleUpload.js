import { useState } from "react";
import { uploadSingleFileWithProgress } from "../services/uploadApi.js";
import { formatFileSize } from "../utils/file.js";
import { getMaxBytes, validateUploadFile } from "../utils/uploadLimits.js";

function useSingleUpload({ apiBaseUrl, onUploaded, toast, uploadConfig }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [result, setResult] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const maxSizeBytes = getMaxBytes(uploadConfig, "maxSingleFileSizeBytes", 4 * 1024 * 1024);

  function selectFile(nextFile) {
    const nextValidationError = validateUploadFile({
      file: nextFile,
      uploadConfig,
      maxSizeBytes,
      uploadKind: "Normal upload",
    });

    if (nextValidationError) {
      setFile(null);
      setResult(null);
      setProgress(0);
      setStatus("File rejected");
      setValidationError(nextValidationError);
      toast(nextValidationError);
      return;
    }

    setFile(nextFile);
    setResult(null);
    setProgress(0);
    setValidationError("");
    setStatus(nextFile ? "Ready to upload" : "Ready");
  }

  function reset() {
    selectFile(null);
  }

  async function upload() {
    if (!file) {
      const message = validationError || "Please select a supported file before uploading.";
      setValidationError(message);
      toast(message);
      return;
    }

    const nextValidationError = validateUploadFile({
      file,
      uploadConfig,
      maxSizeBytes,
      uploadKind: "Normal upload",
    });

    if (nextValidationError) {
      setValidationError(nextValidationError);
      setStatus("File rejected");
      toast(nextValidationError);
      return;
    }

    setIsUploading(true);
    setResult(null);
    setProgress(0);
    setStatus("Uploading");

    try {
      const uploadedFile = await uploadSingleFileWithProgress({
        apiBaseUrl,
        file,
        onProgress: (percent) => {
          setProgress(percent);
          setStatus("Uploading");
        },
      });

      setProgress(100);
      setStatus("Completed");
      setResult(uploadedFile);
      onUploaded?.(uploadedFile);
    } catch (error) {
      setProgress(0);
      setStatus("Failed");
      toast(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  return {
    selectedFileText: file
      ? `${file.name} - ${formatFileSize(file.size)}`
      : "No file selected.",
    progress,
    status,
    result,
    validationError,
    isUploading,
    selectFile,
    reset,
    upload,
  };
}

export { useSingleUpload };
