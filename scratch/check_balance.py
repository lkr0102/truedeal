import base64
import base58
import requests

pubkey_b64 = "CqrQuaxYkxvhsroaUaSmXFHBBuKGkDYmhKfXEvuYLsY="
pubkey_bytes = base64.b64decode(pubkey_b64)
pubkey_b58 = base58.b58encode(pubkey_bytes).decode('ascii')

print(f"Address: {pubkey_b58}")

url = "https://api.devnet.solana.com"
payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getBalance",
    "params": [pubkey_b58]
}

try:
    response = requests.post(url, json=payload).json()
    balance = response['result']['value'] / 1e9
    print(f"Balance: {balance} SOL")
except Exception as e:
    print(f"Error: {e}")
