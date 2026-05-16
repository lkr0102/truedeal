import os
import re

targets = ["hashbrown", "indexmap", "toml_edit", "proc-macro-crate"]

def purge_unstable(directory):
    for root, dirs, files in os.walk(directory):
        # Only target directories that contain our target crate names
        if not any(t in root for t in targets):
            continue
            
        for file in files:
            if file.endswith(".rs"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    original = content
                    # Remove #[expect(...)]
                    content = re.sub(r'#\[expect\([^\]]*\)\]', '', content)
                    # Remove #[cfg_attr(..., expect(...))]
                    content = re.sub(r'#\[cfg_attr\([^,]*,\s*expect\([^)]*\)\)\]', '', content)
                    # Remove impl core::error::Error ... {}
                    content = re.sub(r'impl\s+core::error::Error\s+for\s+\w+\s+\{\s*\}', '', content)
                    # Specific for TryReserveError
                    content = content.replace("impl core::error::Error for TryReserveError {}", "")
                    
                    if content != original:
                        print(f"Patched {path}")
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(content)
                except Exception as e:
                    print(f"Error patching {path}: {e}")

if __name__ == "__main__":
    print("Targeted purging unstable attributes...")
    purge_unstable("vendor")
    print("Done!")
