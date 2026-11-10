#!/usr/bin/env bash
# Builds the web app for Netlify (served from the root of its own address, for example https://<name>.netlify.app/)
# and zips it as user-app-netlify.zip. Rusty publishes it by dragging the zip onto https://app.netlify.com/drop
# (or onto the site's Deploys page to update it). Added 10 Nov 2026 while the GitHub account is suspended.
# Needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY (the publishable key). Run from app/:  bash scripts/build-netlify.sh
set -euo pipefail
: "${EXPO_PUBLIC_SUPABASE_URL:?Set EXPO_PUBLIC_SUPABASE_URL first}" "${EXPO_PUBLIC_SUPABASE_KEY:?Set EXPO_PUBLIC_SUPABASE_KEY first}"
case "$EXPO_PUBLIC_SUPABASE_KEY" in sb_secret_*) echo "That's the secret key. Use the publishable one."; exit 2;; esac
node scripts/make-site.js
rm -rf dist-netlify && EXPO_BASE_URL= npx expo export --platform web --output-dir dist-netlify
host=${EXPO_PUBLIC_SUPABASE_URL#https://}; host=${host%%/*}
csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://$host wss://$host; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"
# On Netlify the policy and other safety headers are sent by the server, which is stronger than a tag in the page.
cat > dist-netlify/_headers <<HDR
/*
  Content-Security-Policy: $csp; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/about/*
  Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
HDR
# Any other address opens the app (the about pages and files are served first, because they exist).
printf '/*  /index.html  200\n' > dist-netlify/_redirects
rm -f dist-netlify/404.html
if grep -rl "/User-App" dist-netlify >/dev/null; then echo "Found an old /User-App address in the build:"; grep -rl "/User-App" dist-netlify; exit 1; fi
rm -f user-app-netlify.zip && (cd dist-netlify && zip -qr ../user-app-netlify.zip .)
echo "Built user-app-netlify.zip ($(du -h user-app-netlify.zip | cut -f1))."
