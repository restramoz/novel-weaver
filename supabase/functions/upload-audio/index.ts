import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const novelId = formData.get("novel_id") as string | null;
    const title = formData.get("title") as string | null;

    if (!file || !novelId) {
      return new Response(JSON.stringify({ error: "Missing file or novel_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file type
    const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav", "audio/ogg", "audio/webm"];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm)$/i)) {
      return new Response(JSON.stringify({ error: "File harus berformat audio (mp3/wav/ogg)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.id === "audio-files");
    if (!bucketExists) {
      await supabase.storage.createBucket("audio-files", { public: true });
    }

    // Upload file
    const ext = file.name.split(".").pop() || "mp3";
    const fileName = `${novelId}/${crypto.randomUUID()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("audio-files")
      .upload(fileName, arrayBuffer, {
        contentType: file.type || "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Gagal mengupload file: " + uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("audio-files").getPublicUrl(fileName);
    const fileUrl = urlData.publicUrl;

    // Insert audio track record
    const { data: track, error: insertError } = await supabase
      .from("audio_tracks")
      .insert({
        novel_id: novelId,
        file_url: fileUrl,
        title: title || file.name.replace(/\.[^.]+$/, ""),
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: "Gagal menyimpan data track: " + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ track }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("upload-audio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
