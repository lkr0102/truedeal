def downgrade(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    for i, line in enumerate(lines):
        if i < 5 and line.strip() == "version = 4":
            new_lines.append("version = 3\n")
        else:
            new_lines.append(line)
            
    with open(filename, 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(new_lines)

if __name__ == "__main__":
    downgrade("Cargo.lock")
