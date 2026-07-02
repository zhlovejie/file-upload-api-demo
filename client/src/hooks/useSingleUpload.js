import { useState } from "react";
import { uploadSingleFileWithProgress } from "../services/uploadApi.js";
import { formatFileSize } from "../utils/file.js";

function useSingleUpload({ apiBaseUrl, onUploaded, toast }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [result, setResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  function selectFile(nextFile) {
    setFile(nextFile);
    setResult(null);
    setProgress(0);
    setStatus(nextFile ? "Ready to upload" : "Ready");
  }

  function reset() {
    selectFile(null);
  }

  async function upload() {
    if (!file) {
      toast("Please select a file before uploading.");
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
    isUploading,
    selectFile,
    reset,
    upload,
  };
}

export { useSingleUpload };
