#!/usr/bin/env bash
set -euo pipefail
echo "== Détection du stack mobile ==" > audit/stack_mobile.md
if [ -f ios/Runner.xcodeproj/project.pbxproj ] || [ -d ios ]; then
  echo "- Dossier iOS détecté (probablement Swift/SwiftUI ou RN)" >> audit/stack_mobile.md
fi
if [ -f package.json ]; then
  echo "- package.json présent" >> audit/stack_mobile.md
  cat package.json | jq -r '.dependencies,.devDependencies' 2>/dev/null | grep -E '"expo"|"react-native"|"capacitor"|@capacitor/core' || true
fi

echo -e "\n== Variables d'environnement utilisées ==" > audit/env_vars.md
grep -Roh "process\.env\.[A-Z0-9_]\+" -- * 2>/dev/null | sort -u >> audit/env_vars.md || true

echo -e "\n== Routes Express détectées ==" > audit/routes.md
grep -RnoE "app\.(get|post|put|patch|delete)\(|router\.(get|post|put|patch|delete)\(" -- * 2>/dev/null | sed 's/:/ -> /' >> audit/routes.md || true

echo -e "\n== Ports/Réseau ==" > audit/network.md
grep -Rno "PORT" -- * 2>/dev/null >> audit/network.md || true
echo "OK"
