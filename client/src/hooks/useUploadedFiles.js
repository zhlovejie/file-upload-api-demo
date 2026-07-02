import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteUploadedFiles,
  deleteUploadedFile,
  downloadUploadedFiles,
  listUploadedFiles,
  listUploadHistory,
  rotateUploadedFileShareLink,
  updateUploadedFileAccess,
} from "../services/uploadApi.js";

const defaultPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

function useUploadedFiles({ apiBaseUrl, toast }) {
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("uploadedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filters, setFilters] = useState({
    fileType: "all",
    visibility: "all",
    uploadedFrom: "",
    uploadedTo: "",
    minSize: "",
    maxSize: "",
  });
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  const params = useMemo(
    () => ({
      keyword,
      page,
      pageSize,
      sortBy,
      sortOrder,
      ...filters,
    }),
    [filters, keyword, page, pageSize, sortBy, sortOrder],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await listUploadedFiles({ apiBaseUrl, params });
      setItems(result.items || []);
      setPagination(result.pagination || defaultPagination);
    } catch (nextError) {
      setError(nextError.message);
      toast(nextError.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, params, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshHistory = useCallback(async () => {
    setIsHistoryLoading(true);

    try {
      const result = await listUploadHistory({ apiBaseUrl, params: { limit: 80 } });
      setHistory(result || []);
    } catch (nextError) {
      toast(nextError.message);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [apiBaseUrl, toast]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  function updateKeyword(nextKeyword) {
    setKeyword(nextKeyword);
    setPage(1);
  }

  function updatePageSize(nextPageSize) {
    setPageSize(Number(nextPageSize));
    setPage(1);
  }

  function updateSort(nextSortBy) {
    if (nextSortBy === sortBy) {
      setSortOrder((currentOrder) => (currentOrder === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(nextSortBy);
      setSortOrder(nextSortBy === "uploadedAt" ? "desc" : "asc");
    }

    setPage(1);
  }

  function updateFilters(nextFilters) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...nextFilters,
    }));
    setPage(1);
  }

  function resetFilters() {
    setKeyword("");
    setFilters({
      fileType: "all",
      visibility: "all",
      uploadedFrom: "",
      uploadedTo: "",
      minSize: "",
      maxSize: "",
    });
    setPage(1);
  }

  async function removeFile(file) {
    try {
      await deleteUploadedFile({
        apiBaseUrl,
        storedFileName: file.storedFileName,
      });
      toast("File deleted.");
      await refresh();
      await refreshHistory();
      return true;
    } catch (nextError) {
      toast(nextError.message);
      return false;
    }
  }

  async function removeFiles(files) {
    if (files.length === 0) {
      return;
    }

    try {
      const result = await deleteUploadedFiles({
        apiBaseUrl,
        storedFileNames: files.map((file) => file.storedFileName),
      });
      toast(`Deleted ${result.deletedCount} file${result.deletedCount === 1 ? "" : "s"}.`);
      await refresh();
      await refreshHistory();
      return true;
    } catch (nextError) {
      toast(nextError.message);
      return false;
    }
  }

  async function downloadFiles(files) {
    if (files.length === 0) {
      return;
    }

    try {
      const result = await downloadUploadedFiles({
        apiBaseUrl,
        storedFileNames: files.map((file) => file.storedFileName),
      });
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast(`Prepared ${files.length} file${files.length === 1 ? "" : "s"} for download.`);
      await refreshHistory();
    } catch (nextError) {
      toast(nextError.message);
    }
  }

  async function shareFile(file) {
    const shareUrl = file.visibility === "private" ? file.shareUrl : file.publicUrl;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast("Share link copied.");
    } catch (error) {
      toast(shareUrl);
    }
  }

  async function updateAccess(file, visibility) {
    try {
      const updatedFile = await updateUploadedFileAccess({
        apiBaseUrl,
        storedFileName: file.storedFileName,
        visibility,
      });
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.storedFileName === updatedFile.storedFileName ? updatedFile : item,
        ),
      );
      toast(`File is now ${visibility}.`);
      await refreshHistory();
      return updatedFile;
    } catch (nextError) {
      toast(nextError.message);
      return null;
    }
  }

  async function rotateShareLink(file) {
    try {
      const updatedFile = await rotateUploadedFileShareLink({
        apiBaseUrl,
        storedFileName: file.storedFileName,
      });
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.storedFileName === updatedFile.storedFileName ? updatedFile : item,
        ),
      );
      toast("Private share link refreshed.");
      await refreshHistory();
      return updatedFile;
    } catch (nextError) {
      toast(nextError.message);
      return null;
    }
  }

  return {
    error,
    filters,
    history,
    isLoading,
    isHistoryLoading,
    items,
    keyword,
    page,
    pageSize,
    pagination,
    refresh,
    refreshHistory,
    removeFiles,
    removeFile,
    resetFilters,
    setPage,
    downloadFiles,
    shareFile,
    sortBy,
    sortOrder,
    updateAccess,
    updateFilters,
    updateKeyword,
    updatePageSize,
    rotateShareLink,
    updateSort,
  };
}

export { useUploadedFiles };
