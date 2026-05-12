import re

with open('contracts/solana/Cargo.lock', 'r') as f:
    lines = f.readlines()

new_lines = []
in_invalid_block = False

# We want to remove any lines that are part of a block starting with '[' alone
# or lines that are clearly not valid TOML in a Cargo.lock context.
# Cargo.lock has:
# [[package]]
# name = "..."
# ...
#
# [metadata]
# ...

for i, line in enumerate(lines):
    # Check if this line is an orphan '['
    if line.strip() == '[':
        # Check if the previous line was empty or another '[' or ']'
        # Valid sections start with [[package]] or [metadata]
        # If it's just '[', it's likely a broken fragment.
        in_invalid_block = True
        continue
    
    if in_invalid_block:
        if line.strip() == ']':
            in_invalid_block = False
        continue
    
    new_lines.append(line)

with open('contracts/solana/Cargo.lock', 'w') as f:
    f.writelines(new_lines)

print("Cargo.lock cleaned.")
