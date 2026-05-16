import os
import re

def brute_patch(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            path = os.path.join(root, file)
            
            # Patch Cargo.toml files
            if file == "Cargo.toml":
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    new_content = content
                    # Force edition 2021
                    new_content = new_content.replace("edition = \"2024\"", "edition = \"2021\"")
                    # Force rust-version 1.75.0
                    new_content = re.sub(r'rust-version\s*=\s*"1\.[0-9.]+"', 'rust-version = "1.75.0"', new_content)
                    
                    # Remove lints section (unsupported in old cargo parsing often)
                    if "[lints." in new_content:
                        # Simple way: just comment out or remove sections
                        new_content = re.sub(r'\[lints\.[^\]]+\][^\[]*', '', new_content)

                    if new_content != content:
                        print(f"Patched Manifest: {path}")
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                except Exception as e:
                    print(f"Error Manifest: {e}")

            # Patch Rust files
            if file.endswith(".rs"):
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    new_content = content
                    # Replace expect with allow
                    new_content = new_content.replace("#[expect(", "#[allow(")
                    new_content = new_content.replace("#[cfg_attr(feature = \"nightly\", expect(", "#[cfg_attr(feature = \"nightly\", allow(")
                    
                    # Replace &raw const x with &x as *const _
                    new_content = re.sub(r'&raw\s+const\s+([a-zA-Z0-9._]+)', r'(&\1 as *const _)', new_content)
                    new_content = re.sub(r'&raw\s+mut\s+([a-zA-Z0-9._]+)', r'(&mut \1 as *mut _)', new_content)
                    
                    # Replace + use<...> syntax (Precise Capturing) with nothing
                    new_content = re.sub(r'\+\s*use<[^>]*>', '', new_content)
                    
                    # Fix indexmap imports
                    if "indexmap" in path:
                        new_content = new_content.replace("use std::hash::RandomState;", "use std::collections::hash_map::RandomState;")
                    
                    # Remove the specific TryReserveError impl
                    new_content = new_content.replace("impl core::error::Error for TryReserveError {}", "")
                    new_content = new_content.replace("impl Error for TryReserveError {}", "")
                    
                    # Bytemuck fix
                    if "CheckedCastError" in path or "bytemuck" in path:
                        new_content = new_content.replace("#[cfg(all(feature = \"impl_core_error\", not(feature = \"extern_crate_std\")))]", "")

                    if new_content != content:
                        print(f"Patched Code: {path}")
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                except Exception as e:
                    print(f"Error Code: {e}")

if __name__ == "__main__":
    brute_patch("vendor")
