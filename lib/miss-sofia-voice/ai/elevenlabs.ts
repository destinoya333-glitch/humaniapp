/**
 * ElevenLabs TTS — Miss Sofia's voice.
 * Requires env: ELEVENLABS_API_KEY, ELEVENLABS_MISS_SOFIA_VOICE_ID
 */

export type TTSResult = {
  audioBuffer: Buffer;
  contentType: string;
};

export async function elevenLabsTTS(text: string): Promise<TTSResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_MISS_SOFIA_VOICE_ID;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");
  if (!voiceId) throw new Error("ELEVENLABS_MISS_SOFIA_VOICE_ID not set");

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.7,        // Calm, less variation
        similarity_boost: 0.85, // Maintain voice character
        style: 0.15,            // Low theatricality, more neutral
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${err.slice(0, 300)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return {
    audioBuffer: Buffer.from(arrayBuffer),
    contentType: "audio/mpeg",
  };
}

/**
 * Strip stage-direction-style content (e.g., <exam_result> tags) before TTS.
 * Sofia must not "speak" the JSON.
 */
export function cleanTextForTTS(text: string): string {
  return text
    .replace(/<exam_result>[\s\S]*?<\/exam_result>/g, "")
    .replace(/<session_report>[\s\S]*?<\/session_report>/g, "")
    .trim();
}
