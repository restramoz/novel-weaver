import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateRequest {
  novelId: string;
  type: "chapter" | "master_concept" | "characters";
  model?: string;
}

async function buildContext(supabase: ReturnType<typeof createClient>, novelId: string) {
  const { data: novel } = await supabase
    .from("novels")
    .select("*")
    .eq("id", novelId)
    .single();

  if (!novel) throw new Error("Novel not found");

  const { data: masterConcept } = await supabase
    .from("master_concepts")
    .select("content_text")
    .eq("novel_id", novelId)
    .single();

  const { data: characters } = await supabase
    .from("characters")
    .select("*")
    .eq("novel_id", novelId)
    .order("created_at", { ascending: true });

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("novel_id", novelId)
    .order("chapter_number", { ascending: false })
    .limit(6);

  const sortedChapters = (chapters || []).reverse();
  const lastChapter = sortedChapters[sortedChapters.length - 1];
  const previousChapters = sortedChapters.slice(0, -1);

  const characterJSON = (characters || []).map(c => ({
    nama: c.name,
    peran: c.role,
    fisik: c.physical_traits,
    kepribadian: c.personality,
    hubungan: c.relationships,
    keahlian: c.abilities,
    diedit_pengguna: c.is_edited_by_user,
  }));

  return { novel, masterConcept, characterJSON, lastChapter, previousChapters };
}

function buildChapterMessages(ctx: Awaited<ReturnType<typeof buildContext>>) {
  const messages: Array<{ role: string; content: string }> = [];

  messages.push({
    role: "system",
    content: `Anda adalah penulis novel profesional tingkat dunia. Tugas Anda melanjutkan cerita secara koheren. JANGAN PERNAH mengulang narasi bab sebelumnya. JANGAN berhalusinasi mengubah sifat karakter yang sudah ditetapkan. Ikuti 'Character Sheet' dan 'Master Concept' sebagai hukum mutlak. Tulis dalam Bahasa Indonesia dengan gaya ${ctx.novel.style || 'Cultivation'}.`,
  });

  if (ctx.masterConcept?.content_text) {
    messages.push({
      role: "system",
      content: `[WORLD BIBLE - MASTER CONCEPT]\n${ctx.masterConcept.content_text}`,
    });
  }

  if (ctx.characterJSON.length > 0) {
    messages.push({
      role: "system",
      content: `[CHARACTER SHEET - GROUND TRUTH]\nKarakter harus bertindak konsisten dengan profil JSON ini:\n${JSON.stringify(ctx.characterJSON, null, 2)}`,
    });
  }

  if (ctx.previousChapters.length > 0) {
    const summaries = ctx.previousChapters
      .map(ch => `Bab ${ch.chapter_number}: ${ch.summary || ch.content_text?.substring(0, 500) || 'Tidak ada ringkasan'}`)
      .join("\n\n");
    messages.push({
      role: "system",
      content: `[RINGKASAN BAB SEBELUMNYA]\n${summaries}`,
    });
  }

  if (ctx.lastChapter?.content_text) {
    messages.push({
      role: "system",
      content: `[BAB TERAKHIR - BAB ${ctx.lastChapter.chapter_number}]\n${ctx.lastChapter.content_text}`,
    });
  }

  const nextChapterNum = ctx.lastChapter ? ctx.lastChapter.chapter_number + 1 : 1;
  messages.push({
    role: "user",
    content: `LANJUTKAN cerita tepat setelah kalimat terakhir bab di atas. Mulai langsung dengan aksi atau dialog baru. Jangan buat rangkuman. Tulis Bab ${nextChapterNum} minimal 2000 kata dengan gaya ${ctx.novel.style || 'Cultivation'}. Berikan judul bab yang menarik di baris pertama dalam format: # Bab ${nextChapterNum}: [Judul]`,
  });

  return { messages, nextChapterNum };
}

function buildMasterConceptMessages(novel: Record<string, unknown>) {
  return [
    {
      role: "system",
      content: "Anda adalah perancang cerita novel profesional. Buat Master Concept yang komprehensif dalam Bahasa Indonesia.",
    },
    {
      role: "user",
      content: `Buat Master Concept untuk novel berikut:
Judul: ${novel.title}
Genre: ${(novel.genre as string[])?.join(", ") || "Fantasy"}
Sinopsis: ${novel.synopsis || "Belum ada"}
Gaya: ${novel.style || "Cultivation"}

Sertakan:
1. Alur besar cerita (3 arc utama)
2. Tema dan pesan moral
3. Aturan dunia/sistem kekuatan
4. Milestone penting per 10 bab
5. Konflik utama dan sub-konflik
6. Ending yang direncanakan

Tulis detail dan mendalam.`,
    },
  ];
}

function buildCharacterMessages(novel: Record<string, unknown>, masterConcept: string) {
  return [
    {
      role: "system",
      content: "Anda adalah perancang karakter novel profesional. Buat profil karakter dalam format JSON array dalam Bahasa Indonesia.",
    },
    {
      role: "user",
      content: `Berdasarkan novel berikut, buat 5-8 karakter utama:
Judul: ${novel.title}
Genre: ${(novel.genre as string[])?.join(", ") || "Fantasy"}
Gaya: ${novel.style || "Cultivation"}
Master Concept: ${masterConcept}

Format output sebagai JSON array:
[{"name":"...","role":"protagonist/antagonist/supporting","physical_traits":"...","personality":"...","relationships":"...","abilities":"..."}]

Pastikan setiap karakter memiliki detail yang kaya dan saling terhubung.`,
    },
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { novelId, type, model }: GenerateRequest = await req.json();

    if (!novelId || !type) {
      return new Response(JSON.stringify({ error: "Missing novelId or type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OLLAMA_API_KEY = Deno.env.get("OLLAMA_API_KEY");
    if (!OLLAMA_API_KEY) {
      return new Response(JSON.stringify({ error: "OLLAMA_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let messages: Array<{ role: string; content: string }>;
    let nextChapterNum = 1;

    if (type === "chapter") {
      const ctx = await buildContext(supabase, novelId);
      const result = buildChapterMessages(ctx);
      messages = result.messages;
      nextChapterNum = result.nextChapterNum;
    } else if (type === "master_concept") {
      const { data: novel } = await supabase.from("novels").select("*").eq("id", novelId).single();
      if (!novel) throw new Error("Novel not found");
      messages = buildMasterConceptMessages(novel);
    } else if (type === "characters") {
      const { data: novel } = await supabase.from("novels").select("*").eq("id", novelId).single();
      const { data: mc } = await supabase.from("master_concepts").select("content_text").eq("novel_id", novelId).single();
      if (!novel) throw new Error("Novel not found");
      messages = buildCharacterMessages(novel, mc?.content_text || "");
    } else {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedModel = model || "gpt-oss:120b-cloud";

    const response = await fetch("https://ollama.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Ollama error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Silakan coba lagi nanti." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "API key tidak valid." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Ollama error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Ollama's NDJSON stream to SSE for the client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                const content = parsed.message?.content || "";
                if (content) {
                  fullContent += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, done: false })}\n\n`));
                }
                if (parsed.done) {
                  // Save to DB
                  if (type === "chapter") {
                    const titleMatch = fullContent.match(/^#\s*Bab\s*\d+[:\s]*(.+)/m);
                    const chapterTitle = titleMatch ? titleMatch[1].trim() : `Bab ${nextChapterNum}`;
                    const wordCount = fullContent.split(/\s+/).length;
                    
                    // Generate a summary (first 3 sentences or 200 chars)
                    const cleanText = fullContent.replace(/^#.*$/m, "").trim();
                    const sentences = cleanText.split(/[.!?。！？]+/).filter(s => s.trim().length > 10);
                    const summary = sentences.slice(0, 3).join(". ").substring(0, 300).trim() + "...";
                    
                    await supabase.from("chapters").insert({
                      novel_id: novelId,
                      chapter_number: nextChapterNum,
                      title: chapterTitle,
                      content_text: fullContent,
                      word_count: wordCount,
                      summary: summary,
                    });
                  } else if (type === "master_concept") {
                    const { data: existing } = await supabase.from("master_concepts").select("id").eq("novel_id", novelId).single();
                    if (existing) {
                      await supabase.from("master_concepts").update({ content_text: fullContent }).eq("id", existing.id);
                    } else {
                      await supabase.from("master_concepts").insert({ novel_id: novelId, content_text: fullContent });
                    }
                  } else if (type === "characters") {
                    try {
                      const jsonMatch = fullContent.match(/\[[\s\S]*\]/);
                      if (jsonMatch) {
                        const chars = JSON.parse(jsonMatch[0]);
                        for (const ch of chars) {
                          await supabase.from("characters").insert({
                            novel_id: novelId,
                            name: ch.name,
                            role: ch.role || "supporting",
                            physical_traits: ch.physical_traits || "",
                            personality: ch.personality || "",
                            relationships: ch.relationships || "",
                            abilities: ch.abilities || "",
                          });
                        }
                      }
                    } catch (e) {
                      console.error("Failed to parse characters:", e);
                    }
                  }

                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "", done: true })}\n\n`));
                }
              } catch {
                // skip invalid JSON lines
              }
            }
          }
        } catch (e) {
          console.error("Stream error:", e);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
