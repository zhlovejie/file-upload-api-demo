function Toast({ message, isVisible }) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-[60] max-w-[min(420px,calc(100%-2rem))] rounded-md bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg"
      role="status"
    >
      {message}
    </div>
  );
}

export { Toast };
