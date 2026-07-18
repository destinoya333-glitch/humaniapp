/**
 * Genera el audio de las 125 frases NUEVAS (Fases 1-5) con la voz de Sofía
 * (ElevenLabs · Sarah) y las sube al bucket sofia-tts/phrases/p-<id>.mp3.
 * Idempotente-ish: usa upsert. Corre una vez.
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
  // Fase 1
  { id: "f1a1", en: "Open the door" }, { id: "f1a2", en: "Close the window" }, { id: "f1a3", en: "Turn on the light" }, { id: "f1a4", en: "It's on the table" }, { id: "f1a5", en: "Come in, please" },
  { id: "f1b1", en: "It's delicious" }, { id: "f1b2", en: "I want more" }, { id: "f1b3", en: "The food is ready" }, { id: "f1b4", en: "Are you hungry?" }, { id: "f1b5", en: "Let's eat" },
  { id: "f1c1", en: "It's cold today" }, { id: "f1c2", en: "It's very hot" }, { id: "f1c3", en: "It's raining" }, { id: "f1c4", en: "It's a sunny day" }, { id: "f1c5", en: "Take your jacket" },
  { id: "f1d1", en: "What time is it?" }, { id: "f1d2", en: "It's five o'clock" }, { id: "f1d3", en: "Wait a minute" }, { id: "f1d4", en: "See you later" }, { id: "f1d5", en: "Not right now" },
  { id: "f1e1", en: "The red car" }, { id: "f1e2", en: "A big house" }, { id: "f1e3", en: "A small dog" }, { id: "f1e4", en: "This is mine" }, { id: "f1e5", en: "That one, please" },
  // Fase 2
  { id: "f2a1", en: "What is your name?" }, { id: "f2a2", en: "Where are you from?" }, { id: "f2a3", en: "How old are you?" }, { id: "f2a4", en: "What do you do?" }, { id: "f2a5", en: "Do you speak English?" },
  { id: "f2b1", en: "Turn left" }, { id: "f2b2", en: "Turn right" }, { id: "f2b3", en: "Go straight" }, { id: "f2b4", en: "It's near here" }, { id: "f2b5", en: "Is it far?" },
  { id: "f2c1", en: "How much is this?" }, { id: "f2c2", en: "It's too expensive" }, { id: "f2c3", en: "Do you have another color?" }, { id: "f2c4", en: "I'll take it" }, { id: "f2c5", en: "Can I pay by card?" },
  { id: "f2d1", en: "I work here" }, { id: "f2d2", en: "I'm busy right now" }, { id: "f2d3", en: "Can you help me?" }, { id: "f2d4", en: "It's an important meeting" }, { id: "f2d5", en: "I'll send you an email" },
  { id: "f2e1", en: "I don't feel well" }, { id: "f2e2", en: "My head hurts" }, { id: "f2e3", en: "I need a doctor" }, { id: "f2e4", en: "Call an ambulance" }, { id: "f2e5", en: "Get well soon" },
  // Fase 3
  { id: "f3a1", en: "My name is Ana" }, { id: "f3a2", en: "I'm from Peru" }, { id: "f3a3", en: "Nice to meet you" }, { id: "f3a4", en: "I live in Lima" }, { id: "f3a5", en: "I'm learning English" },
  { id: "f3b1", en: "I like coffee" }, { id: "f3b2", en: "I don't like it" }, { id: "f3b3", en: "I love music" }, { id: "f3b4", en: "My favorite color is blue" }, { id: "f3b5", en: "What do you like?" },
  { id: "f3c1", en: "I wake up at seven" }, { id: "f3c2", en: "I go to work" }, { id: "f3c3", en: "I have lunch at noon" }, { id: "f3c4", en: "I get home late" }, { id: "f3c5", en: "I go to bed early" },
  { id: "f3d1", en: "This is my mother" }, { id: "f3d2", en: "I have two brothers" }, { id: "f3d3", en: "She is my best friend" }, { id: "f3d4", en: "He is very kind" }, { id: "f3d5", en: "We are a big family" },
  { id: "f3e1", en: "I want to travel" }, { id: "f3e2", en: "Let's meet tomorrow" }, { id: "f3e3", en: "I have to study" }, { id: "f3e4", en: "Maybe next week" }, { id: "f3e5", en: "I'm free on Sunday" },
  // Fase 4
  { id: "f4a1", en: "Yesterday I was tired" }, { id: "f4a2", en: "I went to the market" }, { id: "f4a3", en: "It was a great day" }, { id: "f4a4", en: "I didn't sleep well" }, { id: "f4a5", en: "We had a lot of fun" },
  { id: "f4b1", en: "Tomorrow I will call you" }, { id: "f4b2", en: "I'm going to travel" }, { id: "f4b3", en: "We'll see" }, { id: "f4b4", en: "It will be fine" }, { id: "f4b5", en: "I'll be there soon" },
  { id: "f4c1", en: "I think it's good" }, { id: "f4c2", en: "In my opinion" }, { id: "f4c3", en: "I agree with you" }, { id: "f4c4", en: "I'm not sure" }, { id: "f4c5", en: "That's a good idea" },
  { id: "f4d1", en: "I'm late because of traffic" }, { id: "f4d2", en: "I stayed home because I was sick" }, { id: "f4d3", en: "I study to get a better job" }, { id: "f4d4", en: "Although it's hard, I keep going" }, { id: "f4d5", en: "That's why I'm here" },
  { id: "f4e1", en: "Can you repeat that?" }, { id: "f4e2", en: "What do you mean?" }, { id: "f4e3", en: "Let me think" }, { id: "f4e4", en: "That makes sense" }, { id: "f4e5", en: "I see what you mean" },
  // Fase 5
  { id: "f5a1", en: "I'd like to check in" }, { id: "f5a2", en: "Where is the boarding gate?" }, { id: "f5a3", en: "My flight is delayed" }, { id: "f5a4", en: "I have a connection in Miami" }, { id: "f5a5", en: "Is this seat taken?" },
  { id: "f5b1", en: "A table for two, please" }, { id: "f5b2", en: "What do you recommend?" }, { id: "f5b3", en: "I'm allergic to nuts" }, { id: "f5b4", en: "Could we have the check?" }, { id: "f5b5", en: "Everything was delicious" },
  { id: "f5c1", en: "Tell me about yourself" }, { id: "f5c2", en: "I have five years of experience" }, { id: "f5c3", en: "I'm a hard worker" }, { id: "f5c4", en: "What are the next steps?" }, { id: "f5c5", en: "Thank you for your time" },
  { id: "f5d1", en: "Let me tell you what happened" }, { id: "f5d2", en: "It all started last year" }, { id: "f5d3", en: "Suddenly, everything changed" }, { id: "f5d4", en: "In the end, it worked out" }, { id: "f5d5", en: "I learned a lot from it" },
  { id: "f5e1", en: "I'm really proud of you" }, { id: "f5e2", en: "Don't worry, it happens" }, { id: "f5e3", en: "I'm looking forward to it" }, { id: "f5e4", en: "It was worth it" }, { id: "f5e5", en: "You can count on me" },
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

let ok = 0, err = 0;
for (const p of PHRASES) {
  try {
    const buf = await tts(p.en);
    const path = `phrases/p-${p.id}.mp3`;
    const { error } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: "audio/mpeg", upsert: true });
    if (error) throw error;
    ok++;
    if (ok % 10 === 0) console.log(`... ${ok}/${PHRASES.length}`);
  } catch (e) {
    err++;
    console.log(`ERR ${p.id}: ${e.message}`);
  }
}
console.log(`\nHECHO. OK=${ok} ERR=${err} de ${PHRASES.length}`);
