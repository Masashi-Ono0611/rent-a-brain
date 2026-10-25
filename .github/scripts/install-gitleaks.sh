#!/usr/bin/env bash
set -euo pipefail

# Version and reviewed release digest live beside the other exact tool pins.
read -r scanner_version scanner_sha < <(node -e '
  const fs = require("node:fs");
  const pins = JSON.parse(fs.readFileSync("config/tooling-pins.json", "utf8"));
  if (!/^\d+\.\d+\.\d+$/.test(pins.gitleaks) || !/^[a-f0-9]{64}$/.test(pins.gitleaksLinuxX64Sha256)) process.exit(1);
  console.log(pins.gitleaks, pins.gitleaksLinuxX64Sha256);
')
[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || {
  echo 'This CI installer supports Linux x86_64 only.' >&2
  exit 1
}

scanner_stage=$(mktemp -d)
trap 'rm -rf "$scanner_stage"' EXIT
scanner_archive="gitleaks_${scanner_version}_linux_x64.tar.gz"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  "https://github.com/gitleaks/gitleaks/releases/download/v${scanner_version}/${scanner_archive}" \
  --output "$scanner_stage/$scanner_archive"
printf '%s  %s\n' "$scanner_sha" "$scanner_stage/$scanner_archive" | sha256sum --check --strict
tar -xzf "$scanner_stage/$scanner_archive" -C "$scanner_stage" gitleaks
scanner_bin="${RUNNER_TEMP:?This installer requires RUNNER_TEMP}/rent-a-brain-bin"
mkdir -p "$scanner_bin"
install -m 755 "$scanner_stage/gitleaks" "$scanner_bin/gitleaks"
[[ "$("$scanner_bin/gitleaks" version)" == "$scanner_version" ]]
printf '%s\n' "$scanner_bin" >> "${GITHUB_PATH:?This installer requires GITHUB_PATH}"
