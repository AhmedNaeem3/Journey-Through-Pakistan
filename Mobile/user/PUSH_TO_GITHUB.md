# Push MobileApp to GitHub

## Step 1: Add and Commit All Files

Run these commands in the MobileApp directory:

```bash
# Navigate to MobileApp folder
cd MobileApp

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: MobileApp for Journey Through Pakistan"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `Journey-Through-Pakistan-MobileApp`)
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

## Step 3: Add Remote and Push

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add remote (replace YOUR_USERNAME and REPO_NAME with your actual values)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using SSH

If you prefer SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## Quick Commands (Copy-Paste Ready)

Replace `YOUR_USERNAME` and `REPO_NAME` with your values:

```bash
cd MobileApp
git add .
git commit -m "Initial commit: MobileApp for Journey Through Pakistan"
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## Troubleshooting

If you get authentication errors:
- Use GitHub Personal Access Token instead of password
- Or set up SSH keys

If remote already exists:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
```

