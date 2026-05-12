import base64

# Pure python base58
alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def b58encode(v):
    n = int.from_bytes(v, 'big')
    res = ""
    while n > 0:
        n, r = divmod(n, 58)
        res = alphabet[r] + res
    # Handle leading zeros
    pad = 0
    for b in v:
        if b == 0: pad += 1
        else: break
    return "1" * pad + res

pubkey_b64 = "CqrQuaxYkxvhsroaUaSmXFHBBuKGkDYmhKfXEvuYLsY="
pubkey_bytes = base64.b64decode(pubkey_b64)
pubkey_b58 = b58encode(pubkey_bytes)

print(f"Address: {pubkey_b58}")
