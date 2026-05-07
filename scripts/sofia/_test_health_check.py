#!/usr/bin/env python3
"""
Simula el health check encriptado de Meta hacia el webhook.
Si todo OK, debe retornar status 200 con body que decifra a {status: active}.
"""
import base64
import json
import os
import secrets
import urllib.request
import urllib.error

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


PUBLIC_KEY_PEM = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqVUUYYxxiFum+mniyID3
OJ/PHkuMhm7o/chEV9r0Sqj6ep5oVh1gOoMwuvOf6WPLHag1+D0HhTYmX8sMJ4VC
gsFVWdGU9M5joAuoYROAemLnewP3Dg10kGi3pIBcE778nb8L24cUjGvbcAQO3KPX
2tRNAZ+kuU0Pom7HmIUItFPSt6Ob73IOrc7CVMR2aqvgqyxrrnJSDappXWOYAi+4
q2v6Dn3tiChETEuRT+xIGvd1qzmNMfHWmGpANP1mNt6GI0QlxBqWYBO8enGsfKsB
SMF+ljJyL4R3QV3iYhgNfGOw80bXrJw83o3ZXXjNzOGTAXi8Wsp6GuPYTki+N9Ux
1QIDAQAB
-----END PUBLIC KEY-----
"""

WEBHOOK_URL = "https://activosya.com/api/whatsapp-flows/webhook"


def main():
    # Cargar public key
    pub = serialization.load_pem_public_key(PUBLIC_KEY_PEM.encode())

    # AES-128 random key + 16 byte IV
    aes_key = secrets.token_bytes(16)
    iv = secrets.token_bytes(16)

    # Body simulando un health check ping de Meta
    body = json.dumps({
        "version": "3.0",
        "action": "ping",
    }).encode()

    # AES-128-GCM encrypt
    aesgcm = AESGCM(aes_key)
    ciphertext_with_tag = aesgcm.encrypt(iv, body, None)

    # RSA-OAEP-256 encrypt the AES key
    encrypted_aes_key = pub.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    payload = {
        "encrypted_flow_data": base64.b64encode(ciphertext_with_tag).decode(),
        "encrypted_aes_key": base64.b64encode(encrypted_aes_key).decode(),
        "initial_vector": base64.b64encode(iv).decode(),
    }

    print(f"Mandando health check encriptado a {WEBHOOK_URL}")
    print(f"  encrypted_aes_key len: {len(payload['encrypted_aes_key'])}")
    print(f"  encrypted_flow_data len: {len(payload['encrypted_flow_data'])}")

    req = urllib.request.Request(
        WEBHOOK_URL,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"\nStatus: {resp.status}")
            body_resp = resp.read()
            print(f"Body raw len: {len(body_resp)}")
            print(f"Body preview (b64-decoded length): ", end="")
            try:
                decoded = base64.b64decode(body_resp)
                print(f"{len(decoded)} bytes")
                # Decifrar con la misma AES key
                # Meta convencion: IV flippeado bit-a-bit
                iv_flipped = bytes(b ^ 0xFF for b in iv)
                aesgcm2 = AESGCM(aes_key)
                plaintext = aesgcm2.decrypt(iv_flipped, decoded, None)
                print(f"Plaintext: {plaintext.decode()}")
            except Exception as e:
                print(f"NO se pudo decifrar response: {e}")
                print(f"Body raw: {body_resp[:200]}")
    except urllib.error.HTTPError as e:
        print(f"\nHTTP {e.code}")
        print(e.read().decode("utf-8", errors="ignore")[:500])
    except Exception as e:
        print(f"Other error: {e}")


if __name__ == "__main__":
    main()
