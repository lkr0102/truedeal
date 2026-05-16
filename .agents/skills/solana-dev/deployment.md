---
name: deployment
description: Deployment workflows for Solana programs — devnet, mainnet, multisig upgrades, CI/CD pipelines, and rollback procedures. Optimized for the TrueDeal Sovereign Build Pipeline.
---

# Deployment Workflows

## Deployment Strategy Overview

| Environment | Purpose | Commitment | Upgrades |
|------------|---------|------------|----------|
| **localnet** | Development | processed | Frequent, no restrictions |
| **devnet** | Testing | confirmed | Frequent, autonomous CI |
| **mainnet** | Production | finalized | Rare, full security review |

---

## 🛡️ Sovereign Build Pipeline (TrueDeal Custom)

Due to incompatibilities between modern transitive dependencies (Edition 2024) and the legacy Solana SBF toolchain (Rust 1.75/1.79), TrueDeal uses a **Sovereign Build** strategy.

### 1. Surgical Dependency Patching
All dependencies are vendored in `contracts/solana/vendor/`. If a build fails due to unstable features (`const_mut_refs`, `is_sorted`, etc.):
1. Identify the failing crate in the vendor directory.
2. Manually remove the incompatible code or attributes (e.g., remove `const` from mutable functions).
3. **Critical:** Run the stability script to reset Cargo integrity checks:
   ```powershell
   python zero_checksums.py
   ```
   *This script zeros out the `.cargo-checksum.json` files, allowing modified vendor code to compile.*

### 2. Autonomous CI/CD (Dynamic ID Injection)
To prevent "Authority Conflict" and "Program Already In Use" errors on Devnet, the pipeline is fully autonomous:
- **Dynamic Keypair:** The CI generates a fresh keypair for every run.
- **Dynamic ID Injection:** Before building, the CI extracts the Public Key and injects it into `lib.rs` and `Anchor.toml` using `sed`:
  ```bash
  PROGRAM_ID=$(solana address -k target/deploy/truedeal-keypair.json)
  sed -i "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/g" programs/truedeal/src/lib.rs
  sed -i "s/truedeal = \".*\"/truedeal = \"$PROGRAM_ID\"/g" Anchor.toml
  ```
- **Failsafe Artifacts:** Binaries (`.so`) and IDLs (`.json`) are uploaded as artifacts even if the deployment step fails (e.g., due to insufficient faucet funds).

---

## Devnet Deployment (Manual)

If you need to deploy manually from your machine:

```bash
# 1. Sync the environment (Crucial!)
python zero_checksums.py

# 2. Build (Always use local vendor)
anchor build

# 3. Request Funds
solana airdrop 2 --url devnet

# 4. Deploy
anchor deploy --provider.cluster devnet
```

---

## Troubleshooting: Build Errors

| Error | Cause | Solution |
| :--- | :--- | :--- |
| `E0658: unstable feature` | Crate requires modern Rust features not in SBF | Patch the crate in `vendor/` to remove the feature usage. |
| `checksum mismatch` | Vendor files were edited manually | Run `python zero_checksums.py`. |
| `Program already in use` | Address collision on Devnet | Generate a new keypair in `target/deploy/` and update `lib.rs`. |
| `insufficient funds` | Wallet has < 2 SOL | Request airdrop or transfer SOL to `1ZixuegY...`. |

---

## Best Practices Summary

1. **Never run `cargo update`** without a snapshot. It will break the vendored patches.
2. **Always check artifacts** in GitHub Actions if a deploy fails. The binary is usually valid.
3. **Sync Frontend IDs**: After a CI deploy, download the IDL from the Release and update the frontend constant.
4. **Keep Vendor Clean**: Only patch what is strictly necessary to pass the compiler.

---
**TrueDeal Protocol - Code is Law. Integrity is Sovereignty.**
