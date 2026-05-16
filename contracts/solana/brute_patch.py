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
                    
                    # Replace &raw const x with &x as *const _
                    # Using regex to handle various cases like &raw const self.field
                    new_content = re.sub(r'&raw\s+const\s+([a-zA-Z0-9._]+)', r'(&\1 as *const _)', new_content)
                    # Also &raw mut x -> &mut x as *mut _
                    new_content = re.sub(r'&raw\s+mut\s+([a-zA-Z0-9._]+)', r'(&mut \1 as *mut _)', new_content)
                    
                    # Remove the specific TryReserveError impl
                    new_content = new_content.replace("impl core::error::Error for TryReserveError {}", "")
                    new_content = new_content.replace("impl Error for TryReserveError {}", "")
                    
                    # Bytemuck fix (if it got reset again)
                    if "CheckedCastError" in path and "impl From<crate::PodCastError> for CheckedCastError" in content:
                        new_content = new_content.replace("#[cfg(all(feature = \"impl_core_error\", not(feature = \"extern_crate_std\")))]", "")

                    if new_content != content:
                        print(f"Patched {path}")
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                except Exception as e:
                    print(f"Error: {e}")

if __name__ == "__main__":
    brute_patch("vendor")
