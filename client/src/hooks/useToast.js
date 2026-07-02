import { useCallback, useRef, useState } from "react";

function useToast() {
  const [message, setMessage] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);

  const show = useCallback((nextMessage) => {
    setMessage(nextMessage);
    setIsVisible(true);

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 4200);
  }, []);

  return {
    message,
    isVisible,
    show,
  };
}

export { useToast };
