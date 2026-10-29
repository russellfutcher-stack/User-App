#!/usr/bin/env bash
# Builds the web app and publishes it to GitHub Pages (the gh-pages branch), at
# https://russellfutcher-stack.github.io/User-App/. Needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY
# (the publishable key, which is safe in the app). Run from app/:  bash scripts/deploy-web.sh
set -euo pipefail
: "${EXPO_PUBLIC_SUPABASE_URL:?Set EXPO_PUBLIC_SUPABASE_URL first}" "${EXPO_PUBLIC_SUPABASE_KEY:?Set EXPO_PUBLIC_SUPABASE_KEY first}"
case "$EXPO_PUBLIC_SUPABASE_KEY" in sb_secret_*) echo "That's the secret key. Use the publishable one."; exit 2;; esac
remote=$(git -C .. remote get-url origin)
rm -rf dist-pages && EXPO_BASE_URL=/User-App npx expo export --platform web --output-dir dist-pages
out=$(mktemp -d) && cp -r dist-pages/. "$out"
cd "$out" && git init -q -b gh-pages && git add -A
git -c user.name="$(git -C "$OLDPWD/.." log -1 --format=%an)" -c user.email="$(git -C "$OLDPWD/.." log -1 --format=%ae)" \
  commit -q -m "Publish the web app ($(git -C "$OLDPWD/.." rev-parse --short HEAD))"
git push -q -f "$remote" gh-pages
echo "Published. It can take a minute or two to appear at https://russellfutcher-stack.github.io/User-App/"
