import re

def clean_lock():
    with open('contracts/solana/Cargo.lock', 'r') as f:
        content = f.read()

    # Packages to remove (modern versions)
    to_remove = [
        ('hashbrown', '0.17.1'),
        ('crypto-common', '0.2.1'),
        ('digest', '0.11.3'),
    ]
    
    blocks = re.split(r'(\[\[package\]\])', content)
    
    new_blocks = []
    for i in range(len(blocks)):
        if blocks[i] == '[[package]]':
            block_content = blocks[i+1]
            skip = False
            for name, version in to_remove:
                if f'name = "{name}"' in block_content and f'version = "{version}"' in block_content:
                    skip = True
                    break
            if skip:
                continue
            new_blocks.append(blocks[i])
        elif i > 0 and '[[package]]' in blocks[i-1]:
            block_content = blocks[i]
            skip = False
            for name, version in to_remove:
                if f'name = "{name}"' in block_content and f'version = "{version}"' in block_content:
                    skip = True
                    break
            if skip:
                continue
            
            # Point dependencies to the single version left in lockfile
            # (In Cargo.lock v3, if there's only one version, it's just the name)
            block_content = block_content.replace('"hashbrown 0.17.1"', '"hashbrown"')
            block_content = block_content.replace('"crypto-common 0.2.1"', '"crypto-common"')
            block_content = block_content.replace('"digest 0.11.3"', '"digest"')
            
            new_blocks.append(block_content)
        else:
            new_blocks.append(blocks[i])

    new_content = "".join(new_blocks)
    
    # Global replacement for references
    new_content = new_content.replace(' "hashbrown 0.17.1",', ' "hashbrown",')
    new_content = new_content.replace(' "crypto-common 0.2.1",', ' "crypto-common",')
    new_content = new_content.replace(' "digest 0.11.3",', ' "digest",')
    
    with open('contracts/solana/Cargo.lock', 'w') as f:
        f.write(new_content)
    print("Cargo.lock sanitized for hashbrown, crypto-common and digest.")

if __name__ == "__main__":
    clean_lock()
