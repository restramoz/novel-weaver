import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNovel, fetchChapters, fetchMasterConcept, fetchAudioTracks, deleteNovel, addAudioTrack } from "@/lib/api";
import { useStreamGenerate } from "@/hooks/use-stream-generate";
import { CharacterManager } from "@/components/CharacterManager";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Sparkles, Users, FileText, Loader2, Trash2, Plus, StopCircle, Music } from "lucide-react";
import { toast } from "sonner";

const MODELS = [
  { value: "gpt-oss:120b-cloud", label: "GPT-OSS 120B (Default)" },
  { value: "gemini-3-flash-preview:cloud", label: "Gemini 3 Flash" },
  { value: "qwen3.5:397b-cloud", label: "Qwen 3.5 397B" },
  { value: "deepseek-v3.2:cloud", label: "DeepSeek v3.2" },
  { value: "glm-5:cloud", label: "GLM-5" },
  { value: "minimax-m2.7:cloud", label: "MiniMax M2.7" },
  { value: "nemotron-3-super:cloud", label: "Nemotron 3 Super" },
];

const NovelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState("gpt-oss:120b-cloud");
  const [addMusicOpen, setAddMusicOpen] = useState(false);
  const [musicUrl, setMusicUrl] = useState("");
  const [musicTitle, setMusicTitle] = useState("");

  const { isStreaming, streamedText, error, startStream, stopStream } = useStreamGenerate();

  const { data: novel, isLoading: novelLoading } = useQuery({
    queryKey: ["novel", id],
    queryFn: () => fetchNovel(id!),
    enabled: !!id,
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", id],
    queryFn: () => fetchChapters(id!),
    enabled: !!id,
  });

  const { data: masterConcept } = useQuery({
    queryKey: ["masterConcept", id],
    queryFn: () => fetchMasterConcept(id!),
    enabled: !!id,
  });

  const { data: audioTracks = [] } = useQuery({
    queryKey: ["audioTracks", id],
    queryFn: () => fetchAudioTracks(id!),
    enabled: !!id,
  });

  // Auto-generate master concept for new novels
  useEffect(() => {
    if (novel && !masterConcept && !isStreaming && chapters.length === 0) {
      startStream(novel.id, "master_concept", selectedModel);
    }
  }, [novel?.id, masterConcept]);

  const handleGenerateChapter = () => {
    if (!id) return;
    startStream(id, "chapter", selectedModel);
  };

  const handleGenerateMasterConcept = () => {
    if (!id) return;
    startStream(id, "master_concept", selectedModel);
  };

  const handleGenerateCharacters = () => {
    if (!id) return;
    startStream(id, "characters", selectedModel);
  };

  const handleDelete = async () => {
    if (!id || !confirm("Hapus novel ini beserta semua bab dan karakter?")) return;
    await deleteNovel(id);
    toast.success("Novel dihapus");
    navigate("/");
  };

  const handleAddMusic = async () => {
    if (!id || !musicUrl.trim()) return;
    await addAudioTrack({ novel_id: id, file_url: musicUrl.trim(), title: musicTitle.trim() || undefined });
    queryClient.invalidateQueries({ queryKey: ["audioTracks", id] });
    setAddMusicOpen(false);
    setMusicUrl("");
    setMusicTitle("");
    toast.success("Musik ditambahkan");
  };

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Refetch after streaming is done
  useEffect(() => {
    if (!isStreaming && streamedText) {
      queryClient.invalidateQueries({ queryKey: ["chapters", id] });
      queryClient.invalidateQueries({ queryKey: ["masterConcept", id] });
      queryClient.invalidateQueries({ queryKey: ["characters", id] });
    }
  }, [isStreaming]);

  if (novelLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  if (!novel) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Novel tidak ditemukan.</p>
    </div>;
  }

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-lg text-foreground truncate">{novel.title}</h1>
            <div className="flex gap-2 items-center text-xs text-muted-foreground">
              <span>{chapters.length} bab</span>
              <span>•</span>
              <span>{totalWords.toLocaleString()} kata</span>
              <span>•</span>
              <Badge variant="outline" className="text-xs capitalize">{novel.status}</Badge>
            </div>
          </div>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-48 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="icon" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="chapters" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="chapters" className="gap-1 text-xs"><BookOpen className="h-3.5 w-3.5" /> Bab</TabsTrigger>
            <TabsTrigger value="characters" className="gap-1 text-xs"><Users className="h-3.5 w-3.5" /> Karakter</TabsTrigger>
            <TabsTrigger value="concept" className="gap-1 text-xs"><FileText className="h-3.5 w-3.5" /> Konsep</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 text-xs"><Music className="h-3.5 w-3.5" /> Musik</TabsTrigger>
          </TabsList>

          {/* Chapters Tab */}
          <TabsContent value="chapters" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-foreground">Daftar Bab</h2>
              {isStreaming ? (
                <Button variant="destructive" onClick={stopStream} className="gap-2">
                  <StopCircle className="h-4 w-4" /> Hentikan
                </Button>
              ) : (
                <Button onClick={handleGenerateChapter} className="gap-2">
                  <Sparkles className="h-4 w-4" /> Lanjutkan Cerita
                </Button>
              )}
            </div>

            {isStreaming && streamedText && (
              <Card className="border-primary/30 bg-accent/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-primary flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Menulis Bab {chapters.length + 1}...
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="reader-prose text-sm max-h-64 overflow-y-auto streaming-cursor">
                    {streamedText.split("\n\n").slice(-3).map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                </CardContent>
              </Card>
            )}

            {chapters.length === 0 && !isStreaming ? (
              <div className="text-center py-16">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground mb-4">Belum ada bab. Klik "Lanjutkan Cerita" untuk mulai.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chapters.map((ch) => (
                  <Link key={ch.id} to={`/novel/${id}/chapter/${ch.id}`}>
                    <Card className="novel-card-hover cursor-pointer">
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-muted-foreground font-mono w-8">#{ch.chapter_number}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{ch.title || `Bab ${ch.chapter_number}`}</p>
                            <p className="text-xs text-muted-foreground">{(ch.word_count || 0).toLocaleString()} kata</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(ch.created_at).toLocaleDateString("id-ID")}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Characters Tab */}
          <TabsContent value="characters" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleGenerateCharacters} disabled={isStreaming} className="gap-2 text-sm">
                <Sparkles className="h-4 w-4" /> Auto-Generate Karakter
              </Button>
            </div>
            {isStreaming && streamedText && (
              <Card className="border-primary/30 bg-accent/30">
                <CardContent className="py-4">
                  <p className="text-sm text-primary flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating karakter...
                  </p>
                  <pre className="text-xs text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap">{streamedText.slice(-500)}</pre>
                </CardContent>
              </Card>
            )}
            <CharacterManager novelId={id!} />
          </TabsContent>

          {/* Concept Tab */}
          <TabsContent value="concept" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-foreground">Master Concept</h2>
              <Button variant="outline" onClick={handleGenerateMasterConcept} disabled={isStreaming} className="gap-2 text-sm">
                <Sparkles className="h-4 w-4" /> {masterConcept ? "Re-generate" : "Generate"}
              </Button>
            </div>

            {isStreaming && streamedText && (
              <Card className="border-primary/30 bg-accent/30">
                <CardContent className="py-4">
                  <div className="reader-prose text-sm streaming-cursor">{streamedText}</div>
                </CardContent>
              </Card>
            )}

            {masterConcept?.content_text ? (
              <Card>
                <CardContent className="py-6">
                  <div className="prose prose-sm max-w-none text-foreground">
                    {masterConcept.content_text.split("\n\n").map((p, i) => <p key={i} className="text-sm text-foreground leading-relaxed mb-3">{p}</p>)}
                  </div>
                </CardContent>
              </Card>
            ) : !isStreaming ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Belum ada Master Concept.</p>
              </div>
            ) : null}
          </TabsContent>

          {/* Music Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-foreground">Background Music</h2>
              <Button onClick={() => setAddMusicOpen(true)} className="gap-2" size="sm">
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            </div>
            {audioTracks.length === 0 ? (
              <div className="text-center py-16">
                <Music className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Belum ada musik. Tambahkan URL musik untuk menemani membaca.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {audioTracks.map((track) => (
                  <Card key={track.id}>
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{track.title || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-sm">{track.file_url}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MusicPlayer tracks={audioTracks} onAddTrack={() => setAddMusicOpen(true)} />

      <Dialog open={addMusicOpen} onOpenChange={setAddMusicOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Tambah Musik</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Judul</Label><Input value={musicTitle} onChange={(e) => setMusicTitle(e.target.value)} placeholder="Judul musik..." /></div>
            <div><Label>URL File (mp3/wav)</Label><Input value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} placeholder="https://..." /></div>
            <Button onClick={handleAddMusic} className="w-full" disabled={!musicUrl.trim()}>Tambah</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NovelDetail;
