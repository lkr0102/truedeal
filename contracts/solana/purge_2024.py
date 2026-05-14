import os
import re
import json

vendor_dir = 'vendor'

for root, dirs, files in os.walk(vendor_dir):
    if 'Cargo.toml' in files:
        path = os.path.join(root, 'Cargo.toml')
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        changed = False
        if 'edition = "2024"' in content:
            print(f"Patching {path}...")
            # Downgrade edition
            content = content.replace('edition = "2024"', 'edition = "2021"')
            
            # Remove rust-version
            content = re.sub(r'rust-version = ".*"\n', '', content)
            
            # Remove lints section (and everything after it in the section)
            content = re.sub(r'\[lints\..*?\][\s\S]*?(?=\n\n|\[|\Z)', '', content)
            content = re.sub(r'\[lints\][\s\S]*?(?=\n\n|\[|\Z)', '', content)
            changed = True
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        # Reset checksum for ALL crates to be safe
        checksum_path = os.path.join(root, '.cargo-checksum.json')
        if os.path.exists(checksum_path):
            with open(checksum_path, 'w') as f:
                f.write(json.dumps({"files":{}, "package": None}))

print("Done!")
