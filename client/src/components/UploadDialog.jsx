import { UploadPanel } from "./UploadPanel.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.jsx";
import {
  buildLimitSummary,
  getAcceptValue,
  getMaxBytes,
} from "../utils/uploadLimits.js";

function UploadDialog({
  chunkUpload,
  isOpen,
  onClose,
  singleUpload,
  uploadConfig,
}) {
  const isBusy = singleUpload.isUploading || chunkUpload.isUploading;
  const accept = getAcceptValue(uploadConfig);
  const singleMaxSizeBytes = getMaxBytes(uploadConfig, "maxSingleFileSizeBytes", 4 * 1024 * 1024);
  const chunkMaxSizeBytes = getMaxBytes(
    uploadConfig,
    "maxChunkUploadFileSizeBytes",
    20 * 1024 * 1024,
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isBusy) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-5xl p-0" showClose={!isBusy}>
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            Choose normal upload for small files or chunk upload for large files.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <UploadPanel
            title="Normal Single Upload"
            dropIcon="+"
            dropTitle="Select or drop one file"
            dropNote="Images, videos and documents are supported."
            fileInputLabel="Choose file for normal upload"
            selectedFile={singleUpload.selectedFileText}
            accept={accept}
            limitSummary={buildLimitSummary({
              uploadConfig,
              maxSizeBytes: singleMaxSizeBytes,
              mode: "single",
            })}
            validationError={singleUpload.validationError}
            progress={singleUpload.progress}
            status={singleUpload.status}
            isUploading={singleUpload.isUploading}
            primaryActionLabel="Upload File"
            secondaryActions={[
              {
                label: "Reset",
                onClick: singleUpload.reset,
                disabled: singleUpload.isUploading,
              },
            ]}
            result={singleUpload.result}
            onFileSelected={singleUpload.selectFile}
            onPrimaryAction={singleUpload.upload}
          />

          <UploadPanel
            title="Large File Chunk Upload"
            dropIcon=">"
            dropTitle="Select or drop a large file"
            dropNote="Chunks are uploaded in parallel with resume status."
            fileInputLabel="Choose file for chunk upload"
            selectedFile={chunkUpload.selectedFileText}
            accept={accept}
            limitSummary={buildLimitSummary({
              uploadConfig,
              maxSizeBytes: chunkMaxSizeBytes,
              mode: "chunk",
            })}
            validationError={chunkUpload.validationError}
            progress={chunkUpload.progress}
            status={chunkUpload.status}
            isUploading={chunkUpload.isUploading}
            primaryActionLabel="Upload Chunks"
            secondaryActions={[
              {
                label: "Resume Last Task",
                onClick: chunkUpload.resume,
                disabled: chunkUpload.isUploading,
              },
              {
                label: "Reset",
                onClick: chunkUpload.reset,
                disabled: chunkUpload.isUploading,
              },
            ]}
            result={chunkUpload.result}
            onFileSelected={chunkUpload.selectFile}
            onPrimaryAction={chunkUpload.upload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { UploadDialog };
