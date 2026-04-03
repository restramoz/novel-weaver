import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchChapter, fetchChapters, fetchNovel, fetchAudioTracks, updateChapter } from "@/lib/api";
import { useStreamGenerate } from "@/hooks/use-stream-generate";
import { ChapterReaderView } from "@/components/ChapterReaderView";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, List, Minus, Plus, Sparkles, Loader2, StopCircle, Sun, Moon, Pencil, Eye, Save } from "lucide-react";
import { toast } from "sonner";

const ChapterReader = () => {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [fontSize, setFontSize] = useState(18);
  const [isDark, setIsDark] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { isStreaming, streamedText, error, startStream, stopStream } = useStreamGenerate();

  const { data: novel } = useQuery({
    queryKey: ["novel", novelId],
    queryFn: () => fetchNovel(novelId!),
    enabled: !!novelId,
  });

  const { data: chapter } = useQuery({
    queryKey: ["chapter", chapterId],
    queryFn: () => fetchChapter(chapterId!),
    enabled: !!chapterId,
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", novelId],
    queryFn: () => fetchChapters(novelId!),
    enabled: !!novelId,
  });

  const { data: audioTracks = [] } = useQuery({
    queryKey: ["audioTracks", novelId],
    queryFn: () => fetchAudioTracks(novelId!),
    enabled: !!novelId,
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return () => document.documentElement.classList.remove("dark");
  }, [isDark]);

  useEffect(() => { if (error) toast.error(error); }, [error]);

  useEffect(() => {
    if (!isStreaming && streamedText) {
      queryClient.invalidateQueries({ queryKey: ["chapters", novelId] });
    }
  }, [isStreaming]);

  // Populate edit content when chapter loads
  useEffect(() => {
    if (chapter?.content_text) {
      setEditContent(chapter.content_text);
    }
  }, [chapter?.content_text]);

  const handleGenerateNext = () => {
    if (!novelId) return;
    startStream(novelId, "chapter");
  };

  const handleStartEdit = () => {
    setEditContent(chapter?.content_text || "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!chapterId) return;
    setIsSaving(true);
    try {
      const wordCount = editContent.split(/\s+/).filter(Boolean).length;
      await updateChapter(chapterId, { content_text: editContent, word_count: wordCount });
      queryClient.invalidateQueries({ queryKey: ["chapter", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["chapters", novelId] });
      setIsEditing(false);
      toast.success("Bab berhasil disimpan");
    } catch (err) {
      toast.error("Gagal menyimpan: " + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const currentIdx = chapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChapter = currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-novel-paper flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/90 backdrop-blur-sm py-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={`/novel/${novelId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <span className="text-xs text-muted-foreground truncate max-w-32">{novel?.title}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Edit/View toggle */}
          {chapter && !isStreaming && (
            isEditing ? (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(false)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="default" size="icon" className="h-8 w-8" onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleStartEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            )
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(Math.max(14, fontSize - 2))}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground w-6 text-center">{fontSize}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(Math.min(28, fontSize + 2))}>
            <Plus className="h-3 w-3" />
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Sheet open={tocOpen} onOpenChange={setTocOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><List className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader><SheetTitle className="font-display">Daftar Bab</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-1 overflow-y-auto max-h-[80vh]">
                {chapters.map((ch) => (
                  <Link
                    key={ch.id}
                    to={`/novel/${novelId}/chapter/${ch.id}`}
                    onClick={() => setTocOpen(false)}
                  >
                    <div className={`px-3 py-2 rounded-md text-sm transition-colors ${ch.id === chapterId ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}>
                      <span className="font-mono text-xs mr-2">#{ch.chapter_number}</span>
                      {ch.title || `Bab ${ch.chapter_number}`}
                    </div>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Reader / Editor Content */}
      <div className="flex-1">
        {isEditing && chapter ? (
          <div className="max-w-3xl mx-auto px-4 py-8">
            <p className="text-sm text-muted-foreground mb-3">Mode Edit — Bab {chapter.chapter_number}</p>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[70vh] font-serif text-base leading-relaxed resize-none"
              style={{ fontSize: `${fontSize}px` }}
            />
          </div>
        ) : chapter ? (
          <ChapterReaderView
            content={chapter.content_text || ""}
            title={chapter.title || undefined}
            chapterNumber={chapter.chapter_number}
            fontSize={fontSize}
          />
        ) : isStreaming ? (
          <ChapterReaderView
            content={streamedText}
            chapterNumber={chapters.length + 1}
            fontSize={fontSize}
            isStreaming
          />
        ) : (
          <div className="flex items-center justify-center h-full py-20">
            <p className="text-muted-foreground">Memuat...</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <footer className="border-t border-border bg-card/90 backdrop-blur-sm py-3 px-4 flex items-center justify-between">
        <div>
          {prevChapter && (
            <Link to={`/novel/${novelId}/chapter/${prevChapter.id}`}>
              <Button variant="ghost" size="sm" className="text-xs">← Bab Sebelumnya</Button>
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          {chapter?.summary && (
            <span className="text-xs text-muted-foreground self-center max-w-48 truncate" title={chapter.summary}>
              📝 Ringkasan ada
            </span>
          )}
          {nextChapter ? (
            <Link to={`/novel/${novelId}/chapter/${nextChapter.id}`}>
              <Button variant="ghost" size="sm" className="text-xs">Bab Selanjutnya →</Button>
            </Link>
          ) : isStreaming ? (
            <Button variant="destructive" size="sm" onClick={stopStream} className="gap-1 text-xs">
              <StopCircle className="h-3 w-3" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={handleGenerateNext} className="gap-1 text-xs">
              <Sparkles className="h-3 w-3" /> Generate Bab Baru
            </Button>
          )}
        </div>
      </footer>

      <MusicPlayer tracks={audioTracks} />
    </div>
  );
};

export default ChapterReader;
