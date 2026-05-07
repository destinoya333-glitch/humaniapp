/**
 * Decryption de media files subidos en WhatsApp Flows PhotoPicker.
 *
 * Meta encripta cada archivo con AES-256-CBC + HMAC-SHA256(10 bytes truncado).
 * El payload del flow trae cdn_url + encryption_metadata por foto.
 *
 * Algoritmo (oficial Meta WhatsApp Flows):
 *   1. Descargar cdn_url -> ciphertext_with_mac
 *   2. Separar: ciphertext = first(N-10), mac = last(10)
 *   3. computed_mac = HMAC_SHA256(hmac_key, iv || ciphertext)[:10]
 *   4. Verificar computed_mac == mac
 *   5. plaintext = AES-256-CBC(encryption_key, iv).decrypt(ciphertext)
 *   6. Verificar SHA256(plaintext) == plaintext_hash
 */
import crypto from "crypto";

export type FlowMediaRef = {
  file_name?: string;
  media_id?: string;
  cdn_url: string;
  encryption_metadata: {
    encryption_key: string;        // base64
    hmac_key: string;              // base64
    iv: string;                    // base64
    plaintext_hash?: string;       // base64 SHA256
    encrypted_hash?: string;       // base64 SHA256 of cdn payload
  };
};

export async function decryptFlowMedia(media: FlowMediaRef): Promise<Buffer> {
  const meta = media.encryption_metadata;
  if (!meta) throw new Error("media missing encryption_metadata");

  // 1. Descargar
  const resp = await fetch(media.cdn_url);
  if (!resp.ok) throw new Error(`cdn fetch failed: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());

  if (buf.length < 11) throw new Error("ciphertext too short");

  // 2. Separar ciphertext y mac (10 bytes)
  const ciphertext = buf.subarray(0, buf.length - 10);
  const mac = buf.subarray(buf.length - 10);

  const encKey = Buffer.from(meta.encryption_key, "base64");
  const hmacKey = Buffer.from(meta.hmac_key, "base64");
  const iv = Buffer.from(meta.iv, "base64");

  // 3. Verificar HMAC
  const computed = crypto
    .createHmac("sha256", hmacKey)
    .update(Buffer.concat([iv, ciphertext]))
    .digest()
    .subarray(0, 10);
  if (!crypto.timingSafeEqual(computed, mac)) {
    throw new Error("HMAC mismatch — media tampered or wrong key");
  }

  // 4. Decrypt AES-256-CBC
  const decipher = crypto.createDecipheriv("aes-256-cbc", encKey, iv);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  // 5. Verificar plaintext_hash si vino
  if (meta.plaintext_hash) {
    const ph = crypto.createHash("sha256").update(plaintext).digest("base64");
    if (ph !== meta.plaintext_hash) {
      throw new Error("plaintext hash mismatch");
    }
  }

  return plaintext;
}
