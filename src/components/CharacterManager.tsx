import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCharacters, updateCharacter, deleteCharacter, createCharacter, type Character } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, User, Shield, Swords, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface CharacterManagerProps {
  novelId: string;
}

export function CharacterManager({ novelId }: CharacterManagerProps) {
  const queryClient = useQueryClient();
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ["characters", novelId],
    queryFn: () => fetchCharacters(novelId),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Character> }) => updateCharacter(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", novelId] });
      setEditingChar(null);
      toast.success("Karakter diperbarui");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCharacter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", novelId] });
      toast.success("Karakter dihapus");
    },
  });

  const createMut = useMutation({
    mutationFn: createCharacter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", novelId] });
      setIsCreateOpen(false);
      toast.success("Karakter ditambahkan");
    },
  });

  const roleIcon = (role: string | null) => {
    switch (role) {
      case "protagonist": return <Shield className="h-4 w-4 text-primary" />;
      case "antagonist": return <Swords className="h-4 w-4 text-destructive" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold text-foreground">Karakter ({characters.length})</h3>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Karakter Baru</DialogTitle></DialogHeader>
            <CharacterForm
              onSubmit={(data) => createMut.mutate({ novel_id: novelId, name: data.name || "Unnamed", ...data })}
              isLoading={createMut.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {characters.map((char) => (
          <Card key={char.id} className="novel-card-hover border-border">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {roleIcon(char.role)}
                  <CardTitle className="text-base font-display">{char.name}</CardTitle>
                  {char.is_edited_by_user && (
                    <Badge variant="outline" className="text-xs gap-1 border-primary text-primary">
                      <CheckCircle className="h-3 w-3" /> Diedit
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingChar(char)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMut.mutate(char.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <Badge variant="secondary" className="w-fit text-xs capitalize">{char.role}</Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              {char.physical_traits && <p><span className="font-medium text-foreground">Fisik:</span> {char.physical_traits}</p>}
              {char.personality && <p><span className="font-medium text-foreground">Kepribadian:</span> {char.personality}</p>}
              {char.abilities && <p><span className="font-medium text-foreground">Keahlian:</span> {char.abilities}</p>}
              {char.relationships && <p><span className="font-medium text-foreground">Hubungan:</span> {char.relationships}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingChar} onOpenChange={(o) => !o && setEditingChar(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit Karakter</DialogTitle></DialogHeader>
          {editingChar && (
            <CharacterForm
              initial={editingChar}
              onSubmit={(data) => updateMut.mutate({ id: editingChar.id, updates: data })}
              isLoading={updateMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CharacterForm({
  initial,
  onSubmit,
  isLoading,
}: {
  initial?: Partial<Character>;
  onSubmit: (data: Partial<Character>) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    role: initial?.role || "supporting",
    physical_traits: initial?.physical_traits || "",
    personality: initial?.personality || "",
    relationships: initial?.relationships || "",
    abilities: initial?.abilities || "",
  });

  return (
    <div className="space-y-3">
      <Input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="protagonist">Protagonist</SelectItem>
          <SelectItem value="antagonist">Antagonist</SelectItem>
          <SelectItem value="supporting">Supporting</SelectItem>
          <SelectItem value="mentor">Mentor</SelectItem>
        </SelectContent>
      </Select>
      <Textarea placeholder="Sifat Fisik" value={form.physical_traits} onChange={(e) => setForm({ ...form, physical_traits: e.target.value })} rows={2} />
      <Textarea placeholder="Kepribadian" value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} rows={2} />
      <Textarea placeholder="Hubungan" value={form.relationships} onChange={(e) => setForm({ ...form, relationships: e.target.value })} rows={2} />
      <Textarea placeholder="Keahlian" value={form.abilities} onChange={(e) => setForm({ ...form, abilities: e.target.value })} rows={2} />
      <Button onClick={() => onSubmit(form)} disabled={isLoading || !form.name} className="w-full">
        {isLoading ? "Menyimpan..." : "Simpan"}
      </Button>
    </div>
  );
}
