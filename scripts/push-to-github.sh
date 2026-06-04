#!/bin/bash

# MATTIAS GitHub Push Automation Script
# This script automatically pushes code to GitHub after every checkpoint
# It ensures credentials are properly handled and provides clear feedback

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REMOTE="github"
GITHUB_REPO="https://github.com/musamkhize2/MATTIAS-.git"
BRANCH="main"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[MATTIAS GitHub Push]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if GitHub CLI is authenticated
print_status "Checking GitHub CLI authentication..."
if ! gh auth status > /dev/null 2>&1; then
    print_error "GitHub CLI not authenticated. Please run 'gh auth login'"
    exit 1
fi
print_success "GitHub CLI authenticated"

# Verify git remotes
print_status "Verifying git remotes..."
if ! git remote | grep -q "^${GITHUB_REMOTE}$"; then
    print_warning "GitHub remote not found. Adding it now..."
    git remote add "$GITHUB_REMOTE" "$GITHUB_REPO"
    print_success "GitHub remote added"
else
    print_success "GitHub remote exists"
fi

# Fetch latest from GitHub
print_status "Fetching latest from GitHub..."
git fetch "$GITHUB_REMOTE" "$BRANCH" 2>&1 || print_warning "Could not fetch from GitHub (may be first push)"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Uncommitted changes detected. Staging all changes..."
    git add -A
    
    # Create commit message
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    COMMIT_MSG="Auto-sync: $TIMESTAMP - Automatic GitHub push"
    
    git commit -m "$COMMIT_MSG" || print_warning "No changes to commit"
fi

# Push to GitHub
print_status "Pushing to GitHub ($GITHUB_REMOTE/$BRANCH)..."
if git push "$GITHUB_REMOTE" "$BRANCH" -f 2>&1; then
    print_success "Successfully pushed to GitHub"
    
    # Get commit info
    COMMIT_HASH=$(git rev-parse --short HEAD)
    COMMIT_MSG=$(git log -1 --pretty=%B)
    
    print_status "Commit: $COMMIT_HASH"
    print_status "Message: $COMMIT_MSG"
    print_status "Repository: https://github.com/musamkhize2/MATTIAS-"
    
    exit 0
else
    print_error "Failed to push to GitHub"
    print_status "Troubleshooting tips:"
    echo "  1. Check GitHub CLI authentication: gh auth status"
    echo "  2. Verify remote URL: git remote -v"
    echo "  3. Check network connectivity"
    exit 1
fi
