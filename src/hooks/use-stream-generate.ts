import { useState, useRef, useCallback } from "react";
import { streamGenerate } from "@/lib/api";

export function useStreamGenerate() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (novelId: string, type: "chapter" | "master_concept" | "characters", model?: string) => {
      setIsStreaming(true);
      setStreamedText("");
      setError(null);
      abortRef.current = new AbortController();

      await streamGenerate(
        novelId,
        type,
        {
          onDelta: (text) => setStreamedText((prev) => prev + text),
          onDone: () => setIsStreaming(false),
          onError: (err) => {
            setError(err);
            setIsStreaming(false);
          },
        },
        model,
        abortRef.current.signal
      );
    },
    []
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setStreamedText("");
    setError(null);
  }, []);

  return { isStreaming, streamedText, error, startStream, stopStream, reset };
}
