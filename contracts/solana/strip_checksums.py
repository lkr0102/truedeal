import re

with open('Cargo.lock', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('Cargo.lock', 'w', encoding='utf-8') as f:
    for line in lines:
        if not line.strip().startswith('checksum ='):
            f.write(line)

print("Stripped all checksums from Cargo.lock")
