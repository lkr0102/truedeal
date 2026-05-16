import os
import json

def zero_vendor_checksums(vendor_dir="vendor"):
    """
    Zero out all .cargo-checksum.json files in the vendor directory.
    This allows manual edits to vendored source files without checksum failures.
    """
    count = 0
    for root, dirs, files in os.walk(vendor_dir):
        if ".cargo-checksum.json" in files:
            path = os.path.join(root, ".cargo-checksum.json")
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                # Zero out all file checksums but keep the structure
                data["files"] = {}
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(data, f)
                count += 1
            except Exception as e:
                print(f"Error {path}: {e}")
    print(f"Zeroed checksums in {count} vendor crates.")

if __name__ == "__main__":
    zero_vendor_checksums()
