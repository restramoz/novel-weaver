import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchNovels } from "@/lib/api";
import { CreateNovelDialog } from "@/components/CreateNovelDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, BookOpen, Sparkles } from "lucide-react";

const Index = () => {
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: novels = [], isLoading } = useQuery({
    queryKey: ["novels"],
    queryFn: fetchNovels,
  });

  const filtered = novels.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchGenre = !genreFilter || (n.genre || []).includes(genreFilter);
    return matchSearch && matchGenre;
  });

  const allGenres = [...new Set(novels.flatMap((n) => n.genre || []))];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg novel-gradient flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground">Novel AI</h1>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Buat Novel
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari novel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={genreFilter === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setGenreFilter(null)}
            >
              Semua
            </Badge>
            {allGenres.map((g) => (
              <Badge
                key={g}
                variant={genreFilter === g ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setGenreFilter(g === genreFilter ? null : g)}
              >
                {g}
              </Badge>
            ))}
          </div>
        </div>

        {/* Novels Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-display text-foreground mb-2">
              {novels.length === 0 ? "Belum ada novel" : "Tidak ditemukan"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {novels.length === 0 ? "Mulai petualangan menulis Anda sekarang!" : "Coba kata kunci lain."}
            </p>
            {novels.length === 0 && (
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Buat Novel Pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((novel) => (
              <Link key={novel.id} to={`/novel/${novel.id}`}>
                <Card className="novel-card-hover cursor-pointer overflow-hidden border-border h-full">
                  <div className="h-32 novel-gradient relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="font-display font-bold text-primary-foreground text-lg leading-tight line-clamp-2">
                        {novel.title}
                      </h3>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {(novel.genre || []).slice(0, 3).map((g) => (
                        <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {novel.synopsis || "Belum ada sinopsis"}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize text-xs">{novel.status}</Badge>
                      <span>{novel.style}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <CreateNovelDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
};

export default Index;
