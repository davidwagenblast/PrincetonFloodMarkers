#!/usr/bin/env bash
# Installs a private Node.js into ./.node (no root needed), then installs dependencies,
# builds the page and creates/updates the database.
#
# EL7 hosts (glibc 2.17) cannot run the official Node >= 18 binaries, so on those we use the
# Node project's glibc-217 builds from unofficial-builds.nodejs.org.
#
# Usage: scripts/setup.sh            (run from anywhere; re-run after pulling changes)
#        NODE_VERSION=v24.21.0 scripts/setup.sh
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-v24.21.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_DIR="$ROOT/.node"

glibc_minor="$(ldd --version | head -1 | grep -oE '[0-9]+\.[0-9]+$' | cut -d. -f2)"
if [ "${glibc_minor:-99}" -lt 28 ]; then
  flavor="linux-x64-glibc-217"
  base="https://unofficial-builds.nodejs.org/download/release/$NODE_VERSION"
else
  flavor="linux-x64"
  base="https://nodejs.org/dist/$NODE_VERSION"
fi
file="node-$NODE_VERSION-$flavor.tar.xz"

if [ "$("$NODE_DIR/bin/node" -v 2>/dev/null)" != "$NODE_VERSION" ]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  echo "Downloading $file"
  curl -fsSL -o "$tmp/$file" "$base/$file"
  curl -fsSL "$base/SHASUMS256.txt" | grep " $file\$" > "$tmp/sum.txt"
  (cd "$tmp" && sha256sum -c sum.txt)
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  tar -xJf "$tmp/$file" -C "$NODE_DIR" --strip-components=1
fi

export PATH="$NODE_DIR/bin:$PATH"
cd "$ROOT"
echo "Using node $(node -v), npm $(npm -v)"
npm ci
npm run build
npm run db:init
