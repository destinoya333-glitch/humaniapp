/**
 * Genera el audio de las 25 frases cortas de Fase 0 con la voz REAL de Sofía
 * (ElevenLabs · Sarah) y las sube al bucket público sofia-tts/phrases/.
 * Imprime al final un JSON { id: url } para pegar en la app (demo.ts).
 *
 * One-time: una vez generadas quedan cacheadas y se sirven gratis a todos.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah
const API_KEY = env.ELEVENLABS_API_KEY;
const BUCKET = "sofia-tts";

const PHRASES = [
  { id: "a1", en: "Good morning" }, { id: "a2", en: "How are you?" }, { id: "a3", en: "Thank you" },
  { id: "a4", en: "See you tomorrow" }, { id: "a5", en: "Good night" },
  { id: "b1", en: "I am hungry" }, { id: "b2", en: "I am tired" }, { id: "b3", en: "I am happy" },
  { id: "b4", en: "I need water" }, { id: "b5", en: "Help me, please" },
  { id: "c1", en: "How much is it?" }, { id: "c2", en: "One coffee, please" }, { id: "c3", en: "Where is the bathroom?" },
  { id: "c4", en: "The bill, please" }, { id: "c5", en: "Let's go" },
  { id: "d1", en: "My family" }, { id: "d2", en: "My friend" }, { id: "d3", en: "I love you" },
  { id: "d4", en: "My home" }, { id: "d5", en: "My dog" },
  { id: "e1", en: "Good job" }, { id: "e2", en: "Let's start" }, { id: "e3", en: "I understand" },
  { id: "e4", en: "Take care" }, { id: "e5", en: "See you Monday" },
];

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function tts(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
      voice_settings: { stability: 0.7, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

const out = {};
for (const p of PHRASES) {
  try {
    const buf = await tts(p.en);
    const path = `phrases/p-${p.id}.mp3`;
    const { error } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: "audio/mpeg", upsert: true });
    if (error) throw error;
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    out[p.id] = data.publicUrl;
    console.log(`OK ${p.id} "${p.en}" -> ${data.publicUrl}`);
  } catch (e) {
    console.log(`ERR ${p.id}: ${e.message}`);
  }
}
console.log("\n=== JSON ===");
console.log(JSON.stringify(out, null, 2));
