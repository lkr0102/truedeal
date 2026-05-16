import os
import re

def brute_patch(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".rs"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    new_content = content
                    # Replace expect with allow
                    new_content = new_content.replace("#[expect(", "#[allow(")
                    new_content = new_content.replace("#[cfg_attr(feature = \"nightly\", expect(", "#[cfg_attr(feature = \"nightly\", allow(")
                    new_content = new_content.replace("#[cfg_attr(all(feature = \"nightly\", feature = \"alloc\"), expect(", "#[cfg_attr(all(feature = \"nightly\", feature = \"alloc\"), allow(")
                    
                    # Remove the specific TryReserveError impl
                    new_content = new_content.replace("impl core::error::Error for TryReserveError {}", "")
                    new_content = new_content.replace("impl Error for TryReserveError {}", "")
                    
                    if new_content != content:
                        print(f"Patched {path}")
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                except Exception as e:
                    print(f"Error: {e}")

if __name__ == "__main__":
    brute_patch("vendor")
