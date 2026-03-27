import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Novel = Tables<"novels">;
export type Chapter = Tables<"chapters">;
export type Character = Tables<"characters">;
export type MasterConcept = Tables<"master_concepts">;
export type AudioTrack = Tables<"audio_tracks">;

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`;

export async function fetchNovels() {
  const { data, error } = await supabase
    .from("novels")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchNovel(id: string) {
  const { data, error } = await supabase.from("novels").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createNovel(novel: { title: string; genre?: string[]; synopsis?: string; style?: string; tags?: string[]; target_chapters?: number }) {
  const { data, error } = await supabase.from("novels").insert(novel).select().single();
  if (error) throw error;
  return data;
}

export async function updateNovel(id: string, updates: Partial<Novel>) {
  const { data, error } = await supabase.from("novels").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteNovel(id: string) {
  const { error } = await supabase.from("novels").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchChapters(novelId: string) {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("novel_id", novelId)
    .order("chapter_number", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchChapter(id: string) {
  const { data, error } = await supabase.from("chapters").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function updateChapter(id: string, updates: Partial<Chapter>) {
  const { data, error } = await supabase.from("chapters").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function fetchCharacters(novelId: string) {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("novel_id", novelId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateCharacter(id: string, updates: Partial<Character>) {
  const { data, error } = await supabase
    .from("characters")
    .update({ ...updates, is_edited_by_user: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCharacter(id: string) {
  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) throw error;
}

export async function createCharacter(char: { novel_id: string; name: string; role?: string; physical_traits?: string; personality?: string; relationships?: string; abilities?: string }) {
  const { data, error } = await supabase.from("characters").insert(char).select().single();
  if (error) throw error;
  return data;
}

export async function fetchMasterConcept(novelId: string) {
  const { data, error } = await supabase.from("master_concepts").select("*").eq("novel_id", novelId).single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function fetchAudioTracks(novelId: string) {
  const { data, error } = await supabase.from("audio_tracks").select("*").eq("novel_id", novelId);
  if (error) throw error;
  return data;
}

export async function addAudioTrack(track: { novel_id: string; file_url: string; title?: string }) {
  const { data, error } = await supabase.from("audio_tracks").insert(track).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAudioTrack(id: string) {
  const { error } = await supabase.from("audio_tracks").delete().eq("id", id);
  if (error) throw error;
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamGenerate(
  novelId: string,
  type: "chapter" | "master_concept" | "characters",
  callbacks: StreamCallbacks,
  model?: string,
  signal?: AbortSignal
) {
  try {
    const resp = await fetch(GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ novelId, type, model }),
      signal,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Unknown error" }));
      callbacks.onError(err.error || `Error ${resp.status}`);
      return;
    }

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.error) {
            callbacks.onError(parsed.error);
            return;
          }
          if (parsed.done) {
            callbacks.onDone();
            return;
          }
          if (parsed.content) {
            callbacks.onDelta(parsed.content);
          }
        } catch {
          // partial JSON, skip
        }
      }
    }
    callbacks.onDone();
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    callbacks.onError((e as Error).message);
  }
}

// Text parser utility for cleaning AI output
export function parseNovelText(raw: string): string {
  let text = raw;
  // Remove markdown artifacts but keep headings
  text = text.replace(/\*\*\*/g, "");
  text = text.replace(/\*\*/g, "");
  text = text.replace(/\*/g, "");
  // Clean up excessive newlines
  text = text.replace(/\n{4,}/g, "\n\n\n");
  // Fix dialog formatting
  text = text.replace(/[\"\"]([^\"\"]+)[\"\"]/g, '"$1"');
  return text.trim();
}
