
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.novels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT[] DEFAULT '{}',
  synopsis TEXT,
  style TEXT DEFAULT 'Cultivation',
  status TEXT DEFAULT 'draft',
  cover_url TEXT,
  language TEXT DEFAULT 'Indonesia',
  target_chapters INTEGER DEFAULT 100,
  tags TEXT[] DEFAULT '{}',
  settings_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.master_concepts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id UUID NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  content_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id UUID NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'supporting',
  physical_traits TEXT,
  personality TEXT,
  relationships TEXT,
  abilities TEXT,
  is_edited_by_user BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id UUID NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT,
  content_text TEXT DEFAULT '',
  summary TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audio_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id UUID NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  title TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on novels" ON public.novels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on master_concepts" ON public.master_concepts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on characters" ON public.characters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chapters" ON public.chapters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audio_tracks" ON public.audio_tracks FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_novels_updated_at BEFORE UPDATE ON public.novels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_master_concepts_updated_at BEFORE UPDATE ON public.master_concepts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_chapters_novel_number ON public.chapters(novel_id, chapter_number);
CREATE INDEX idx_characters_novel ON public.characters(novel_id);
CREATE INDEX idx_master_concepts_novel ON public.master_concepts(novel_id);
CREATE INDEX idx_audio_tracks_novel ON public.audio_tracks(novel_id);
