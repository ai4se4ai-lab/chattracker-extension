# GitHub Repository Setup

## Step 1: Create the Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `chattracker-extension`
3. Description: "Cursor extension to track and summarize chat conversations"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Push Your Code

After creating the repository, run these commands:

```bash
git remote add origin https://github.com/ai4se4ai-lab/chattracker-extension.git
git branch -M main
git push -u origin main
```

Or if you've already added the remote, just run:
```bash
git push -u origin main
```

## Alternative: Using GitHub CLI (if installed)

If you have GitHub CLI installed, you can create the repo with:
```bash
gh repo create chattracker-extension --public --source=. --remote=origin --push
```

