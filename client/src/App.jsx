import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader.jsx";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog.jsx";
import { FileDetailsSheet } from "./components/FileDetailsSheet.jsx";
import { FileToolbar } from "./components/FileToolbar.jsx";
import { Pagination } from "./components/Pagination.jsx";
import { Toast } from "./components/Toast.jsx";
import { UploadDialog } from "./components/UploadDialog.jsx";
import { UploadedFilesTable } from "./components/UploadedFilesTable.jsx";
import { UploadHistoryPanel } from "./components/UploadHistoryPanel.jsx";
import { Badge } from "./components/ui/badge.jsx";
import { defaultApiBaseUrl } from "./config.js";
import { useChunkUpload } from "./hooks/useChunkUpload.js";
import { useSingleUpload } from "./hooks/useSingleUpload.js";
import { useToast } from "./hooks/useToast.js";
import { useUploadedFiles } from "./hooks/useUploadedFiles.js";
import { readUploadConfig } from "./services/uploadApi.js";
import { formatFileSize } from "./utils/file.js";

const columnStorageKey = "file-upload-demo.visible-columns";

const defaultColumns = [
  { key: "index", label: "#", visible: true, locked: true, className: "w-16", cellClassName: "w-16" },
  { key: "fileName", label: "File name", visible: true, locked: true, className: "w-[34%]" },
  { key: "fileType", label: "Type", visible: true, className: "w-32" },
  { key: "size", label: "Size", visible: true, className: "w-28" },
  { key: "uploadedAt", label: "Uploaded", visible: true, className: "w-48" },
  { key: "visibility", label: "Access", visible: true, className: "w-36" },
  {
    key: "actions",
    label: "Actions",
    visible: true,
    locked: true,
    className: "w-36 text-right",
    cellClassName: "text-right",
  },
];

function loadColumns() {
  try {
    const storedKeys = JSON.parse(localStorage.getItem(columnStorageKey) || "null");

    if (!Array.isArray(storedKeys)) {
      return defaultColumns;
    }

    return defaultColumns.map((column) => ({
      ...column,
      visible: column.locked || storedKeys.includes(column.key),
    }));
  } catch {
    return defaultColumns;
  }
}

function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBaseUrl);
  const [uploadConfig, setUploadConfig] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [columns, setColumns] = useState(loadColumns);
  const [detailFile, setDetailFile] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();
  const uploadedFiles = useUploadedFiles({ apiBaseUrl, toast: toast.show });
  const singleUpload = useSingleUpload({
    apiBaseUrl,
    uploadConfig,
    onUploaded: async () => {
      await uploadedFiles.refresh();
      await uploadedFiles.refreshHistory();
    },
    toast: toast.show,
  });
  const chunkUpload = useChunkUpload({
    apiBaseUrl,
    uploadConfig,
    onUploaded: async () => {
      await uploadedFiles.refresh();
      await uploadedFiles.refreshHistory();
    },
    toast: toast.show,
  });

  const selectedFiles = useMemo(
    () => uploadedFiles.items.filter((file) => selectedIds.has(file.storedFileName)),
    [selectedIds, uploadedFiles.items],
  );

  const totalSize = useMemo(
    () => uploadedFiles.items.reduce((sum, file) => sum + Number(file.size || 0), 0),
    [uploadedFiles.items],
  );

  useEffect(() => {
    let isCurrent = true;

    readUploadConfig({ apiBaseUrl })
      .then((config) => {
        if (isCurrent) {
          setUploadConfig(config);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setUploadConfig(null);
          toast.show(`Upload limits could not be loaded: ${error.message}`);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [apiBaseUrl, toast.show]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [
    uploadedFiles.keyword,
    uploadedFiles.filters,
    uploadedFiles.pagination.page,
    uploadedFiles.pagination.pageSize,
  ]);

  useEffect(() => {
    localStorage.setItem(
      columnStorageKey,
      JSON.stringify(columns.filter((column) => column.visible).map((column) => column.key)),
    );
  }, [columns]);

  function toggleColumn(columnKey) {
    setColumns((currentColumns) =>
      currentColumns.map((column) =>
        column.key === columnKey && !column.locked
          ? { ...column, visible: !column.visible }
          : column,
      ),
    );
  }

  function selectFile(file, checked) {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (checked) {
        nextIds.add(file.storedFileName);
      } else {
        nextIds.delete(file.storedFileName);
      }

      return nextIds;
    });
  }

  function selectAll(checked) {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      uploadedFiles.items.forEach((file) => {
        if (checked) {
          nextIds.add(file.storedFileName);
        } else {
          nextIds.delete(file.storedFileName);
        }
      });

      return nextIds;
    });
  }

  function requestDeleteFile(file) {
    setDeleteRequest({ type: "single", files: [file] });
  }

  function requestDeleteSelectedFiles() {
    if (selectedFiles.length === 0) {
      return;
    }

    setDeleteRequest({ type: "batch", files: selectedFiles });
  }

  async function confirmDelete() {
    if (!deleteRequest || isDeleting) {
      return;
    }

    setIsDeleting(true);

    const filesToDelete = deleteRequest.files;
    const wasDeleted =
      deleteRequest.type === "batch"
        ? await uploadedFiles.removeFiles(filesToDelete)
        : await uploadedFiles.removeFile(filesToDelete[0]);

    setIsDeleting(false);

    if (!wasDeleted) {
      return;
    }

    const deletedNames = new Set(filesToDelete.map((file) => file.storedFileName));
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      deletedNames.forEach((storedFileName) => nextIds.delete(storedFileName));
      return nextIds;
    });

    if (detailFile && deletedNames.has(detailFile.storedFileName)) {
      setDetailFile(null);
    }

    setDeleteRequest(null);
  }

  function updateDetailFile(nextFile) {
    if (!nextFile) {
      return;
    }

    setDetailFile(nextFile);
  }

  async function updateAccess(file, visibility) {
    const updatedFile = await uploadedFiles.updateAccess(file, visibility);
    updateDetailFile(updatedFile);
  }

  async function rotateShareLink(file) {
    const updatedFile = await uploadedFiles.rotateShareLink(file);
    updateDetailFile(updatedFile);
  }

  const publicCount = uploadedFiles.items.filter((file) => file.visibility !== "private").length;
  const privateCount = uploadedFiles.items.length - publicCount;

  return (
    <>
      <div className="min-h-screen">
        <AppHeader />

        <main className="mx-auto grid min-w-0 w-full max-w-[1600px] gap-5 px-4 py-5 sm:px-6 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-stretch lg:px-8 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="flex min-w-0 max-w-full flex-col overflow-hidden rounded-lg border border-sky-200/80 bg-card/94 shadow-[0_18px_46px_rgba(30,89,160,0.14)]" aria-labelledby="fileListTitle">
            <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-white via-sky-50/80 to-cyan-50/70 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h2 id="fileListTitle" className="text-lg font-semibold text-foreground">
                  Uploaded files
                </h2>
                <p className="mt-1 max-w-full break-words text-sm text-muted-foreground">
                  Manage assets, access policies, previews and file operations from one table.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {uploadedFiles.pagination.total} total
                </Badge>
                <Badge variant="outline">
                  {formatFileSize(totalSize)} on this page
                </Badge>
                <Badge variant="success">{publicCount} public</Badge>
                <Badge variant="warning">{privateCount} private</Badge>
              </div>
            </div>

            <FileToolbar
              apiBaseUrl={apiBaseUrl}
              columns={columns}
              filters={uploadedFiles.filters}
              isLoading={uploadedFiles.isLoading}
              keyword={uploadedFiles.keyword}
              selectedCount={selectedFiles.length}
              onApiBaseUrlChange={setApiBaseUrl}
              onBatchDelete={requestDeleteSelectedFiles}
              onBatchDownload={() => uploadedFiles.downloadFiles(selectedFiles)}
              onColumnToggle={toggleColumn}
              onFilterChange={uploadedFiles.updateFilters}
              onKeywordChange={uploadedFiles.updateKeyword}
              onRefresh={uploadedFiles.refresh}
              onResetFilters={uploadedFiles.resetFilters}
              onUploadClick={() => setIsUploadOpen(true)}
            />

            {uploadedFiles.error ? (
              <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {uploadedFiles.error}
              </div>
            ) : null}

            <UploadedFilesTable
              columns={columns}
              files={uploadedFiles.items}
              isLoading={uploadedFiles.isLoading}
              page={uploadedFiles.pagination.page}
              pageSize={uploadedFiles.pagination.pageSize}
              selectedIds={selectedIds}
              sortBy={uploadedFiles.sortBy}
              sortOrder={uploadedFiles.sortOrder}
              onDelete={requestDeleteFile}
              onOpenDetails={setDetailFile}
              onSelectAll={selectAll}
              onSelectFile={selectFile}
              onShare={uploadedFiles.shareFile}
              onSort={uploadedFiles.updateSort}
            />

            <Pagination
              pagination={uploadedFiles.pagination}
              pageSize={uploadedFiles.pageSize}
              onPageChange={uploadedFiles.setPage}
              onPageSizeChange={uploadedFiles.updatePageSize}
            />
          </section>

          <UploadHistoryPanel
            history={uploadedFiles.history}
            isLoading={uploadedFiles.isHistoryLoading}
            onRefresh={uploadedFiles.refreshHistory}
          />
        </main>
      </div>

      <FileDetailsSheet
        file={detailFile}
        history={uploadedFiles.history}
        isOpen={Boolean(detailFile)}
        onClose={() => setDetailFile(null)}
        onCopyLink={uploadedFiles.shareFile}
        onDelete={requestDeleteFile}
        onRotateShareLink={rotateShareLink}
        onUpdateAccess={updateAccess}
      />

      <UploadDialog
        chunkUpload={chunkUpload}
        isOpen={isUploadOpen}
        singleUpload={singleUpload}
        uploadConfig={uploadConfig}
        onClose={() => setIsUploadOpen(false)}
      />

      <DeleteConfirmDialog
        isDeleting={isDeleting}
        isOpen={Boolean(deleteRequest)}
        request={deleteRequest}
        onCancel={() => !isDeleting && setDeleteRequest(null)}
        onConfirm={confirmDelete}
      />

      <Toast message={toast.message} isVisible={toast.isVisible} />
    </>
  );
}

export default App;
