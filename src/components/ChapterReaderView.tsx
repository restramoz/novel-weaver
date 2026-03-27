import { useState, useEffect, useRef } from "react";
import { parseNovelText } from "@/lib/api";

interface ChapterReaderViewProps {
  content: string;
  title?: string;
  chapterNumber: number;
  fontSize?: number;
  isStreaming?: boolean;
}

export function ChapterReaderView({ content, title, chapterNumber, fontSize = 18, isStreaming }: ChapterReaderViewProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const progress = scrollHeight <= clientHeight ? 100 : (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);
    };

    const el = containerRef.current;
    el?.addEventListener("scroll", handleScroll);
    return () => el?.removeEventListener("scroll", handleScroll);
  }, []);

  const parsed = parseNovelText(content);
  const paragraphs = parsed.split(/\n\n+/).filter(Boolean);

  return (
    <div className="relative h-full">
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />
      <div
        ref={containerRef}
        className="h-full overflow-y-auto px-4 py-8 md:px-0"
      >
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Bab {chapterNumber}</p>
            {title && <h1 className="text-2xl md:text-3xl font-display font-semibold text-foreground">{title}</h1>}
          </div>

          <div className={`reader-prose ${isStreaming ? "streaming-cursor" : ""}`} style={{ fontSize: `${fontSize}px` }}>
            {paragraphs.map((p, i) => {
              // Check if it's a heading
              if (p.startsWith("# ")) {
                return <h2 key={i} className="text-xl font-display font-semibold my-6 text-center" style={{ textIndent: 0 }}>{p.replace(/^#+\s*/, "")}</h2>;
              }
              // Check if it's dialog
              if (p.startsWith('"') || p.startsWith('"') || p.startsWith('「')) {
                return <p key={i} className="dialogue">{p}</p>;
              }
              return <p key={i}>{p}</p>;
            })}
          </div>

          {!isStreaming && content && (
            <div className="text-center mt-12 mb-8">
              <div className="inline-block w-16 h-px bg-border" />
              <p className="text-xs text-muted-foreground mt-2">— Akhir Bab {chapterNumber} —</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
