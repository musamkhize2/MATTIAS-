# GitHub Push Automation Setup

## Overview

This document explains the GitHub push automation system for the MATTIAS project. All code changes are automatically synced to GitHub to ensure no work is lost.

## How It Works

### 1. Git Remotes Configuration

The project has two git remotes:

- **origin**: S3 storage (Manus internal checkpoint system)
- **github**: GitHub repository (musamkhize2/MATTIAS-)

Both remotes are kept in sync automatically.

### 2. Automatic Push Mechanism

#### Post-Commit Hook
- **Location**: `.git/hooks/post-commit`
- **Trigger**: After every git commit
- **Action**: Automatically pushes to GitHub in the background
- **Benefit**: Non-blocking, ensures all commits reach GitHub

#### Manual Push Script
- **Location**: `scripts/push-to-github.sh`
- **Usage**: `./scripts/push-to-github.sh`
- **Features**:
  - Verifies GitHub CLI authentication
  - Checks git remotes
  - Stages uncommitted changes
  - Pushes to GitHub with timestamp
  - Provides detailed feedback

### 3. Checkpoint Integration

When `webdev_save_checkpoint` is called:
1. Changes are saved to S3 (origin)
2. Post-commit hook triggers
3. Changes are automatically pushed to GitHub (github)
4. Both remotes stay in sync

## Verification

### Check if GitHub remote is configured:
```bash
git remote -v
```

Expected output:
```
github    https://github.com/musamkhize2/MATTIAS-.git (fetch)
github    https://github.com/musamkhize2/MATTIAS-.git (push)
origin    s3://vida-prod-gitrepo/webdev-git/... (fetch)
origin    s3://vida-prod-gitrepo/webdev-git/... (push)
```

### Verify GitHub CLI authentication:
```bash
gh auth status
```

Expected output:
```
github.com
  ✓ Logged in to github.com account musamkhize2 (GH_TOKEN)
  ✓ Logged in to github.com account musamkhize2 (/home/ubuntu/.config/gh/hosts.yml)
```

### Manual push to GitHub:
```bash
./scripts/push-to-github.sh
```

## Troubleshooting

### Issue: "GitHub CLI not authenticated"
**Solution**: Run `gh auth login` and follow the prompts

### Issue: "GitHub remote not found"
**Solution**: Add GitHub remote manually:
```bash
git remote add github https://github.com/musamkhize2/MATTIAS-.git
```

### Issue: "Failed to push to GitHub"
**Solution**: Check network connectivity and GitHub CLI status:
```bash
gh auth status
git remote -v
```

## Best Practices

1. **Always use webdev_save_checkpoint**: This ensures both S3 and GitHub are updated
2. **Verify pushes**: Check GitHub repository after major changes
3. **Monitor hooks**: Post-commit hook runs silently; check GitHub manually if unsure
4. **Use manual script for debugging**: `./scripts/push-to-github.sh` provides detailed output

## GitHub Repository

- **URL**: https://github.com/musamkhize2/MATTIAS-
- **Branch**: main
- **Auto-sync**: Enabled
- **Last sync**: Check GitHub Actions or commit history

## Automation Workflow

```
Code Change
    ↓
webdev_save_checkpoint
    ↓
Commit to S3 (origin)
    ↓
Post-commit hook triggered
    ↓
Push to GitHub (github)
    ↓
Both remotes in sync ✓
```

## Configuration Files

- `.git/hooks/post-commit`: Automatic push hook
- `scripts/push-to-github.sh`: Manual push script
- `.gitignore`: Excludes sensitive files (already configured)

## Notes

- GitHub push is non-blocking (runs in background)
- S3 push (webdev_save_checkpoint) is the primary sync mechanism
- GitHub is kept as a secondary backup and public mirror
- All commits include timestamp for tracking
