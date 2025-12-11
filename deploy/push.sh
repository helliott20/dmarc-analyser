#!/bin/bash
#
# Build and push DMARC Analyser Docker images to Docker Hub
#
# Usage:
#   ./deploy/push.sh              # Build and push both images
#   ./deploy/push.sh v1.0.0       # Build and push with version tag
#
# Images pushed:
#   helliott20/dmarc-analyser:web
#   helliott20/dmarc-analyser:worker
#
# Prerequisites:
#   - Docker installed and running
#   - Logged in to Docker Hub: docker login
#

set -e

# Configuration - single repo with different tags
REPO="helliott20/dmarc-analyser"
VERSION="${1:-latest}"

echo "========================================"
echo "DMARC Analyser - Build & Push"
echo "========================================"
echo "Repository: ${REPO}"
echo "Version: ${VERSION}"
echo ""
echo "Images:"
echo "  - ${REPO}:web"
echo "  - ${REPO}:worker"
if [ "${VERSION}" != "latest" ]; then
    echo "  - ${REPO}:web-${VERSION}"
    echo "  - ${REPO}:worker-${VERSION}"
fi
echo "========================================"
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# Generate fresh migration from current schema
echo "[1/5] Generating fresh database migration..."
rm -rf drizzle/*.sql drizzle/meta 2>/dev/null
npx drizzle-kit generate

# Check migration was created
if [ ! -d "drizzle" ] || [ -z "$(ls -A drizzle/*.sql 2>/dev/null)" ]; then
    echo "ERROR: Failed to generate migration."
    exit 1
fi
echo "Migration generated successfully."

# Build web image
echo "[2/5] Building web image..."
docker build --target runner -t "${REPO}:web" .

# Build worker image
echo "[3/5] Building worker image..."
docker build --target worker -t "${REPO}:worker" .

# Push web image
echo "[4/5] Pushing web image..."
docker push "${REPO}:web"

# Push worker image
echo "[5/5] Pushing worker image..."
docker push "${REPO}:worker"

# Also tag with version if provided
if [ "${VERSION}" != "latest" ]; then
    echo ""
    echo "Tagging with version ${VERSION}..."
    docker tag "${REPO}:web" "${REPO}:web-${VERSION}"
    docker tag "${REPO}:worker" "${REPO}:worker-${VERSION}"
    docker push "${REPO}:web-${VERSION}"
    docker push "${REPO}:worker-${VERSION}"
fi

echo ""
echo "========================================"
echo "Done! Images pushed successfully."
echo ""
echo "To deploy on your VM:"
echo "  docker compose -f docker-compose.prod.yml pull"
echo "  docker compose -f docker-compose.prod.yml up -d"
echo "========================================"
