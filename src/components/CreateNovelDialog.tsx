import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNovel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";

const GENRES = ["Fantasy", "Cultivation", "Romance", "Action", "Sci-Fi", "Horror", "Mystery", "Comedy", "Drama", "Isekai", "Slice of Life"];

interface CreateNovelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNovelDialog({ open, onOpenChange }: CreateNovelDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [style, setStyle] = useState("Cultivation");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(["Fantasy"]);
  const [tags, setTags] = useState("");
  const [targetChapters, setTargetChapters] = useState(100);

  const mutation = useMutation({
    mutationFn: createNovel,
    onSuccess: (novel) => {
      queryClient.invalidateQueries({ queryKey: ["novels"] });
      onOpenChange(false);
      toast.success("Novel dibuat! Generating Master Concept...");
      navigate(`/novel/${novel.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("Judul wajib diisi"); return; }
    mutation.mutate({
      title: title.trim(),
      synopsis: synopsis.trim() || undefined,
      style,
      genre: selectedGenres,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      target_chapters: targetChapters,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Buat Novel Baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Judul Novel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masukkan judul novel..." />
          </div>
          <div>
            <Label>Premis / Sinopsis</Label>
            <Textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="Ceritakan premis singkat novel Anda..." rows={3} />
          </div>
          <div>
            <Label>Genre</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {GENRES.map((g) => (
                <Badge
                  key={g}
                  variant={selectedGenres.includes(g) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleGenre(g)}
                >
                  {g}
                  {selectedGenres.includes(g) && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Gaya Penulisan</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cultivation">Cultivation</SelectItem>
                  <SelectItem value="Western Fantasy">Western Fantasy</SelectItem>
                  <SelectItem value="RPG/LitRPG">RPG/LitRPG</SelectItem>
                  <SelectItem value="Urban Fantasy">Urban Fantasy</SelectItem>
                  <SelectItem value="Romantis">Romantis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Bab</Label>
              <Input type="number" value={targetChapters} onChange={(e) => setTargetChapters(Number(e.target.value))} min={10} max={1000} />
            </div>
          </div>
          <div>
            <Label>Tags (pisah koma)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="reinkarnasi, sistem, harem..." />
          </div>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Membuat..." : "Buat Novel & Generate Konsep"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
