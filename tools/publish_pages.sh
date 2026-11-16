#!/usr/bin/env bash
# V12: publish the BUILT site (dist/) to GitHub Pages from a separate public repository that holds only the website,
# never the project source. Needs the GitHub CLI signed in (gh auth login). Usage: bash tools/publish_pages.sh [repo-name]
set -euo pipefail
REPO="${1:-nakhla-residence}"
GH="${GH:-gh}"
USER_LOGIN="$($GH api user --jq .login)"
cd "$(dirname "$0")/.."
export PATH="$HOME/.proto/tools/node/22.23.3:$PATH"
node node_modules/vite/bin/vite.js build >/dev/null
OUT="$(mktemp -d)"; cp -r dist/. "$OUT/"; touch "$OUT/.nojekyll"; cp "$OUT/index.html" "$OUT/404.html"
if ! $GH repo view "$USER_LOGIN/$REPO" >/dev/null 2>&1; then
  $GH repo create "$USER_LOGIN/$REPO" --public --description "NAKHLA RESIDENCE: concept website (built files only)" >/dev/null
fi
cd "$OUT"; git init -q -b gh-pages; git add -A
git -c user.name="Rashid Omar Mohammed" -c user.email="rashid.iq12@gmail.com" commit -q -m "Publish NAKHLA RESIDENCE website $(date -u +%Y-%m-%dT%H:%MZ)"
git push -q --force "https://github.com/$USER_LOGIN/$REPO.git" gh-pages
$GH api -X POST "repos/$USER_LOGIN/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 || \
  $GH api -X PUT "repos/$USER_LOGIN/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 || true
echo "https://$USER_LOGIN.github.io/$REPO/"
