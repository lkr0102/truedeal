import os
import re

def clean_orphan_fragments(directory):
    """
    Remove orphan [] fragments left by previous broken lints-removal.
    Also removes any [lints.*] sections that were missed.
    """
    fixed = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file != "Cargo.toml":
                continue
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                original = content

                # Remove orphan [] fragments (empty TOML table headers with no key)
                # These look like: \n[]\n or \n[\n    "something",\n]\n
                content = re.sub(r'\n\[\s*\]\s*\n', '\n', content)
                content = re.sub(r'\n\[\s*\n(?:[^\[]*?)\]\s*\n', '\n', content, flags=re.DOTALL)

                # Remove any remaining [lints.*] sections using line-by-line approach
                lines = content.split('\n')
                result = []
                in_lints = False
                for line in lines:
                    stripped = line.strip()
                    if re.match(r'^\[lints\b', stripped):
                        in_lints = True
                        continue
                    if in_lints and stripped.startswith('['):
                        in_lints = False
                    if not in_lints:
                        result.append(line)
                content = '\n'.join(result)

                if content != original:
                    print(f"Fixed: {path}")
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(content)
                    fixed += 1
            except Exception as e:
                print(f"Error {path}: {e}")
    print(f"\nTotal fixed: {fixed}")

if __name__ == "__main__":
    clean_orphan_fragments("vendor")
