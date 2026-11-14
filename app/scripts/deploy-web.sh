#!/usr/bin/env bash
# Builds the web app and the website and publishes them to GitHub Pages: the website at https://userconnect-au.github.io/
# and the app at https://userconnect-au.github.io/app/ (an anonymous address, Rusty, 14 Nov 2026). Only the built files go
# to that public repository, under a neutral name, so nothing in it identifies anyone. Needs EXPO_PUBLIC_SUPABASE_URL and
# EXPO_PUBLIC_SUPABASE_KEY (the publishable key, which is safe in the app). Run from app/:  bash scripts/deploy-web.sh   (add --build-only to check it first)
set -euo pipefail
: "${EXPO_PUBLIC_SUPABASE_URL:?Set EXPO_PUBLIC_SUPABASE_URL first}" "${EXPO_PUBLIC_SUPABASE_KEY:?Set EXPO_PUBLIC_SUPABASE_KEY first}"
case "$EXPO_PUBLIC_SUPABASE_KEY" in sb_secret_*) echo "That's the secret key. Use the publishable one."; exit 2;; esac
remote=${PAGES_REMOTE:-https://github.com/userconnect-au/userconnect-au.github.io.git}
node scripts/make-site.js
rm -rf dist-pages && EXPO_BASE_URL=/app npx expo export --platform web --output-dir dist-pages
# The live site may only run its own code and talk to its own Supabase project (a content security policy).
host=${EXPO_PUBLIC_SUPABASE_URL#https://}; host=${host%%/*}
csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://$host wss://$host; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"
sed -i "s|<meta charset=\"utf-8\" />|<meta charset=\"utf-8\" />\n    <meta http-equiv=\"Content-Security-Policy\" content=\"$csp\" />|" dist-pages/index.html
grep -q Content-Security-Policy dist-pages/index.html || { echo "Couldn't add the security policy"; exit 1; }
if [ "${1:-}" = "--build-only" ]; then echo "Built in dist-pages (not published)."; exit 0; fi
out=$(mktemp -d) && cp -r dist-site/. "$out" && mkdir "$out/app" && cp -r dist-pages/. "$out/app"
cp dist-pages/404.html "$out/404.html" && touch "$out/.nojekyll"
cd "$out" && git init -q -b main && git add -A
git -c user.name="User" -c user.email="noreply@userconnect-au.invalid" commit -q -m "Publish User"
git push -q -f "$remote" main
echo "Published. It can take a minute or two to appear at https://userconnect-au.github.io/"
