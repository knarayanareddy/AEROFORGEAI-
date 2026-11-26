#!/usr/bin/env python3
"""Verify an AeroForge bundle signature with PyNaCl.

Independent of both signing implementations in the repository (the Node path and
the WebCrypto path): this uses libsodium via PyNaCl and shares no code with
either. If all three agree, the signature is not an artefact of one library.

    python3 oracle/verify_signature.py signed_bundle.zip signed_bundle.sig.json

Exit 0 if the bundle's sha256 matches the digest in the signature block AND that
digest verifies under the stated public key; 1 otherwise.
"""

from __future__ import annotations

import base64
import hashlib
import json
import sys
from pathlib import Path

try:
    import nacl.signing
    import nacl.exceptions
except ImportError:
    print("FAIL  pynacl is not installed (pip install pynacl)")
    sys.exit(1)


def b64u(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def main(bundle_path: str, sig_path: str) -> int:
    ok = True

    block = json.loads(Path(sig_path).read_text())

    if block.get("alg") != "Ed25519":
        print(f"FAIL  unsupported algorithm {block.get('alg')!r}")
        return 1
    print("ok    algorithm Ed25519")

    digest = hashlib.sha256(Path(bundle_path).read_bytes()).hexdigest()
    print(f"info  bundle sha256 {digest}")

    if block["digest"] != digest:
        print("FAIL  signature covers a different digest than the bundle bytes")
        ok = False
    else:
        print("ok    signed digest matches the bundle bytes")

    vk = nacl.signing.VerifyKey(b64u(block["publicKey"]))
    try:
        vk.verify(block["digest"].encode(), b64u(block["signature"]))
        print("ok    signature verifies with PyNaCl")
    except nacl.exceptions.BadSignatureError:
        print("FAIL  signature does not verify")
        ok = False

    # Negative control: the same signature must NOT verify for a different digest.
    # Without this, a verify() that always succeeds would look fine.
    try:
        vk.verify(b"0" * 64, b64u(block["signature"]))
        print("FAIL  signature verified against an unrelated digest - verifier is broken")
        ok = False
    except nacl.exceptions.BadSignatureError:
        print("ok    negative control: unrelated digest is rejected")

    print("\nRESULT:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
