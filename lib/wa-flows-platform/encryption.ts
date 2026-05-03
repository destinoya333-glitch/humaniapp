/**
 * WhatsApp Flows — Encriptación RSA-OAEP-256 + AES-128-GCM
 *
 * Meta envía cada request del flow encriptado con:
 *  1. AES key (128 bits) generada por Meta
 *  2. AES IV (128 bits)
 *  3. encrypted_flow_data: body AES-128-GCM con esa key + IV
 *  4. encrypted_aes_key: la AES key cifrada con NUESTRA public key RSA-OAEP-256
 *
 * Para responder, usamos la MISMA AES key con un IV invertido (bitwise NOT).
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/flows/reference/implementing_endpoint
 */
import crypto from "node:crypto";

export type EncryptedRequest = {
  encrypted_flow_data: string;       // base64
  encrypted_aes_key: string;          // base64
  initial_vector: string;             // base64 IV
};

export type DecryptedRequest = {
  decryptedBody: Record<string, unknown>;
  aesKeyBuffer: Buffer;
  initialVectorBuffer: Buffer;
};

/**
 * Decripta un request entrante de Meta Flows.
 * Devuelve el body JSON + la AES key + IV para luego encriptar la respuesta.
 */
export function decryptRequest(
  body: EncryptedRequest,
  privateKeyPem: string,
  privateKeyPassphrase = ""
): DecryptedRequest {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  // 1) Decifrar AES key con RSA-OAEP-256
  const privateKey = crypto.createPrivateKey({
    key: privateKeyPem,
    passphrase: privateKeyPassphrase,
  });
  const aesKeyBuffer = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encrypted_aes_key, "base64")
  );

  // 2) Decifrar el body con AES-128-GCM
  const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(initial_vector, "base64");
  const TAG_LEN = 16;
  const encryptedDataBody = flowDataBuffer.subarray(0, -TAG_LEN);
  const encryptedDataTag = flowDataBuffer.subarray(-TAG_LEN);

  const decipher = crypto.createDecipheriv("aes-128-gcm", aesKeyBuffer, initialVectorBuffer);
  decipher.setAuthTag(encryptedDataTag);
  const decryptedJSONString = Buffer.concat([
    decipher.update(encryptedDataBody),
    decipher.final(),
  ]).toString("utf-8");

  return {
    decryptedBody: JSON.parse(decryptedJSONString),
    aesKeyBuffer,
    initialVectorBuffer,
  };
}

/**
 * Encripta la respuesta para Meta Flows.
 * Usa la MISMA AES key del request, con IV invertido bitwise.
 */
export function encryptResponse(
  responseBody: Record<string, unknown>,
  aesKeyBuffer: Buffer,
  initialVectorBuffer: Buffer
): string {
  // IV flippeado: cada byte invertido bitwise
  const flippedIv = Buffer.from(initialVectorBuffer.map((b) => ~b & 0xff));

  const cipher = crypto.createCipheriv("aes-128-gcm", aesKeyBuffer, flippedIv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(responseBody), "utf-8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return encrypted.toString("base64");
}

/**
 * Genera un par de claves RSA-2048 para uso en flows.
 * Solo usar en setup inicial, después guardar en env vars.
 */
export function generateKeypair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}
