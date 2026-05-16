import os
import re

def fix_lints_sections(content):
    """
    Safely remove [lints.*] sections from TOML without leaving broken fragments.
    Uses a line-by-line state machine approach.
    """
    lines = content.split('\n')
    result = []
    in_lints_section = False
    
    for line in lines:
        stripped = line.strip()
        # Detect start of a [lints.xxx] section
        if re.match(r'^\[lints\b', stripped):
            in_lints_section = True
            continue
        # Detect start of any other section — exit lints skip mode
        if stripped.startswith('[') and not stripped.startswith('[['):
            if in_lints_section:
                in_lints_section = False
        elif stripped.startswith('[['):
            if in_lints_section:
                in_lints_section = False
        
        if not in_lints_section:
            result.append(line)
    
    return '\n'.join(result)

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
                    new_content = new_content.replace('edition = "2024"', 'edition = "2021"')
                    # Force rust-version down
                    new_content = re.sub(r'rust-version\s*=\s*"1\.[89][0-9.]*"', 'rust-version = "1.75.0"', new_content)
                    new_content = re.sub(r'rust-version\s*=\s*"1\.[7][6-9][0-9.]*"', 'rust-version = "1.75.0"', new_content)
                    # Remove lints sections safely
                    new_content = fix_lints_sections(new_content)
                    # Remove orphan fragments left by bad prior patches (e.g., standalone [ ... ])
                    new_content = re.sub(r'\n\[\s*\n[^\[]*?\n\]\s*\n', '\n', new_content)

                    if new_content != content:
                        print(f"Patched Manifest: {path}")
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                except Exception as e:
                    print(f"Error Manifest {path}: {e}")

            # Patch Rust files
            if file.endswith(".rs"):
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    new_content = content
                    new_content = new_content.replace("#[expect(", "#[allow(")
                    new_content = re.sub(r'&raw\s+const\s+([a-zA-Z0-9._]+)', r'(&\1 as *const _)', new_content)
                    new_content = re.sub(r'&raw\s+mut\s+([a-zA-Z0-9._]+)', r'(&mut \1 as *mut _)', new_content)
                    new_content = re.sub(r'\+\s*use<[^>]*>', '', new_content)
                    if "indexmap" in path:
                        new_content = new_content.replace("use std::hash::RandomState;", "use std::collections::hash_map::RandomState;")
                    new_content = new_content.replace("impl core::error::Error for TryReserveError {}", "")
                    new_content = new_content.replace("impl Error for TryReserveError {}", "")
                    if "bytemuck" in path:
                        new_content = new_content.replace('#[cfg(all(feature = "impl_core_error", not(feature = "extern_crate_std")))]', "")

                    if new_content != content:
                        print(f"Patched Code: {path}")
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                except Exception as e:
                    print(f"Error Code {path}: {e}")

if __name__ == "__main__":
    brute_patch("vendor")
