import os
import re

def purge_unstable(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".rs"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                
                # Remove #[expect(...)]
                content = re.sub(r'#\[expect\([^)]*\)\]', '', content)
                # Remove #[cfg_attr(..., expect(...))]
                content = re.sub(r'#\[cfg_attr\([^)]*, expect\([^)]*\)\)\]', '', content)
                # Remove impl core::error::Error ... {}
                content = re.sub(r'impl\s+core::error::Error\s+for\s+\w+\s+\{\s*\}', '', content)
                # Remove impl Error ... {} if it looks like core::error
                content = re.sub(r'impl\s+Error\s+for\s+TryReserveError\s+\{\s*\}', '', content)
                
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)

if __name__ == "__main__":
    print("Deep purging unstable attributes from vendor...")
    purge_unstable("vendor")
    print("Done!")
