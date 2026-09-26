#!/usr/bin/env bash
# Armado en México — Copyright (C) 2026 Saulo Flores León
# SPDX-License-Identifier: AGPL-3.0-or-later
# Test: resolver-conflictos.py — verifica resolución automática de conflictos.
#
# Crea un repo temporal, simula conflictos reales del pipeline y verifica
# que el resolver los resuelve correctamente.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOLVER="$SCRIPT_DIR/resolver-conflictos.py"
PYTHON="${PYTHON:-python3}"
TMPDIR_TEST="$(mktemp -d)"
PASS=0
FAIL=0

cleanup() { rm -rf "$TMPDIR_TEST"; }
trap cleanup EXIT

ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ✗ $1"; }

# ── Setup test repo ──────────────────────────────────────────

cd "$TMPDIR_TEST"
git init -q -b main repo && cd repo
git config user.email "test@test.com"
git config user.name "Test"

# Initial data.js with mk() calls
cat > data.js << 'DATAEOF'
const mk = (id, nombre, marca, tipo, pais, calibre, capacidad, peso, longitud, mecanismo, anio, avail, priceExact, dcamRef, img, historia) => ({
  id, nombre, marca, tipo, pais, calibre, capacidad, peso, longitud, mecanismo, anio, avail, priceExact, dcamRef, img, historia
});
window.DB = [
  mk(1, "Taurus TH380", "Taurus", "pistola", "Brasil", ".380 ACP", "15+1", "725g", "188mm", "Semi-auto, DA/SA", 2019, "dcam", "10319.63", "PISTOLA CAL .380 TAURUS TH380 PAVON",
    "imagenes/001_Taurus_TH380.webp",
    "Pistola compacta de servicio fabricada en Brasil."),

  mk(2, "Taurus PT58 Plus", "Taurus", "pistola", "Brasil", ".380 ACP", "19+1", "850g", "196mm", "Semi-auto, DA/SA", 2005, "dcam", "10130.32", "PISTOLA CAL .380 TAURUS PT58 PLUS",
    "imagenes/002_Taurus_PT58_Plus.webp",
    "Pistola full-size brasileña."),
];
DATAEOF

cat > referencia-armas.json << 'REFEOF'
{"items": [{"id": 1, "ref": "old-ref"}]}
REFEOF

cat > SKILL.md << 'SKILLEOF'
# Skill v1
Old content.
SKILLEOF

git add -A && git commit -q -m "initial"

# ── Branch A: inventory (price changes) ─────────────────────

git checkout -q -b inventario
# Change prices
sed -i 's/"10319.63"/"11500.00"/' data.js
sed -i 's/"10130.32"/"10800.50"/' data.js
# Update reference
echo '{"items": [{"id": 1, "ref": "new-ref-inventario"}]}' > referencia-armas.json
echo '# Skill v2 - inventory update' > SKILL.md
git add -A && git commit -q -m "inventory: update prices and refs"

# ── Branch B: photo/spec changes (from main) ────────────────

git checkout -q main
# Change images (cache busters) and historia text
sed -i 's|imagenes/001_Taurus_TH380.webp|imagenes/001_Taurus_TH380.webp?v=2|' data.js
sed -i 's|Pistola compacta de servicio fabricada en Brasil.|Pistola compacta brasileña de servicio, muy popular.|' data.js
sed -i 's|imagenes/002_Taurus_PT58_Plus.webp|imagenes/002_Taurus_PT58_Plus.webp?v=2|' data.js
# Update reference with different content
echo '{"items": [{"id": 1, "ref": "new-ref-main"}]}' > referencia-armas.json
echo '# Skill v2 - main update' > SKILL.md
git add -A && git commit -q -m "main: update images and refs"

# ── Merge and test ──────────────────────────────────────────

echo ""
echo "═══ Test 1: Merge with conflicts ═══"

git checkout -q inventario
# Attempt merge — will fail
if git merge main --no-edit 2>/dev/null; then
  fail "merge should have conflicted but didn't"
else
  ok "merge produced conflicts as expected"
fi

# Show conflicts
CONFLICTS="$(git diff --name-only --diff-filter=U)"
echo "  Conflicting files: $CONFLICTS"

# Run resolver
echo ""
echo "═══ Test 2: Run resolver ═══"
if $PYTHON "$RESOLVER"; then
  ok "resolver exited 0 (all resolved)"
else
  fail "resolver exited non-zero"
fi

# Verify no conflict markers remain
echo ""
echo "═══ Test 3: Verify resolution ═══"

if grep -r '<<<<<<<' data.js referencia-armas.json SKILL.md 2>/dev/null; then
  fail "conflict markers still present"
else
  ok "no conflict markers remain"
fi

# Verify price is from inventory (ours)
if grep -q '"11500.00"' data.js; then
  ok "data.js has our price (11500.00)"
else
  fail "data.js missing our price"
fi

if grep -q '"10800.50"' data.js; then
  ok "data.js has our second price (10800.50)"
else
  fail "data.js missing our second price"
fi

# Verify image is from main (theirs)
if grep -q 'v=2' data.js; then
  ok "data.js has their image cache buster (?v=2)"
else
  fail "data.js missing their image changes"
fi

# Verify historia is from main (theirs)
if grep -q 'muy popular' data.js; then
  ok "data.js has their historia text"
else
  fail "data.js missing their historia"
fi

# Verify reference is ours
if grep -q 'new-ref-inventario' referencia-armas.json; then
  ok "referencia-armas.json is ours"
else
  fail "referencia-armas.json is not ours"
fi

# Verify SKILL.md is ours
if grep -q 'inventory update' SKILL.md; then
  ok "SKILL.md is ours"
else
  fail "SKILL.md is not ours"
fi

# Can commit the merge
echo ""
echo "═══ Test 4: Commit merge ═══"
if git commit --no-edit -q 2>/dev/null; then
  ok "merge commit succeeded"
else
  fail "merge commit failed"
fi

# ── Test 5: Same price = take theirs entirely ───────────────

echo ""
echo "═══ Test 5: Same price → take theirs (future-proof) ═══"

git checkout -q main
# Create two branches with same price but different img
git checkout -q -b branch-same-price
sed -i 's|muy popular.|muy popular. Extra text.|' data.js
git add -A && git commit -q -m "branch: add extra text"

git checkout -q main
git checkout -q -b branch-img-only
sed -i 's|v=2|v=3|' data.js
git add -A && git commit -q -m "img: bump cache"

git checkout -q branch-same-price
if git merge branch-img-only --no-edit 2>/dev/null; then
  ok "same-price merge: no conflict (fast path)"
else
  # If conflicted, resolver should take theirs
  $PYTHON "$RESOLVER" || true
  if grep -q 'v=3' data.js; then
    ok "same-price: took theirs (img update)"
  else
    fail "same-price: didn't take theirs"
  fi
  git add -A && git commit --no-edit -q 2>/dev/null || true
fi

# ── Test 6: dry-run mode ────────────────────────────────────

echo ""
echo "═══ Test 6: Dry-run mode ═══"

git checkout -q main
git checkout -q -b dry-test
sed -i 's/"10319.63"/"99999.99"/' data.js
git add -A && git commit -q -m "dry: price change"

git checkout -q main
git checkout -q -b dry-other
sed -i 's|v=2|v=4|' data.js
git add -A && git commit -q -m "dry: img change"

git checkout -q dry-test
if ! git merge dry-other --no-edit 2>/dev/null; then
  # Has conflicts — run dry-run
  $PYTHON "$RESOLVER" --dry-run
  # Conflicts should still be there
  if git diff --name-only --diff-filter=U | grep -q .; then
    ok "dry-run: conflicts still present (not modified)"
  else
    fail "dry-run: conflicts were resolved (should not be)"
  fi
  # Abort merge to clean up
  git merge --abort 2>/dev/null || true
else
  ok "dry-run: merge was clean (no test needed)"
fi

# ── Summary ─────────────────────────────────────────────────

echo ""
echo "════════════════════════════"
echo "  Passed: $PASS  Failed: $FAIL"
echo "════════════════════════════"
[ "$FAIL" -eq 0 ] || exit 1
