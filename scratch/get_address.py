import base64
import base58

pubkey_b64 = "CqrQuaxYkxvhsroaUaSmXFHBBuKGkDYmhKfXEvuYLsY="
pubkey_bytes = base64.b64decode(pubkey_b64)
pubkey_b58 = base58.b58encode(pubkey_bytes).decode('ascii')

print(f"Address: {pubkey_b58}")
