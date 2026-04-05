# Publishing Guide 🚀

Follow these steps to publish DecisionNode to the world.

## 1. Publish CLI to NPM

The most reliable way to publish (especially with 2FA enabled) is using a **Granular Access Token**.

### Option A: Granular Access Token (Recommended)

1.  Go to [npmjs.com](https://www.npmjs.com) -> Profile Picture -> **Access Tokens**.
2.  Click **Generate New Token** -> **Granular Access Token**.
3.  **Permissions**:
    *   **Packages**: Read & Write (Select "All packages").
4.  **CRITICAL**: Under "Per-token 2FA", you **MUST** select **"Skip 2FA for write operations"**.
    *   *If you do not select this, the token will fail.*
5.  Create an `.npmrc` file in your project folder:
    ```
    //registry.npmjs.org/:_authToken=npm_YOUR_TOKEN_HERE
    ```
6.  Run:
    ```bash
    npm publish --access public
    ```

### Option B: Interactive Login
Only use this if you have a standard Authenticator App (Google Auth/Authy) set up. Passkeys often fail in the CLI.

```bash
npm login
npm publish --access public --otp=123456
```

*   **Note**: If the name `decisionnode` is taken, you might need to use a scoped name like `@decisionnode/cli` or `@ammarsaleh/decisionnode` in `package.json`.

## 2. Publish VS Code Extension

You need a Publisher ID on the [VS Code Marketplace](https://marketplace.visualstudio.com/manage).

1.  Go to [management page](https://marketplace.visualstudio.com/manage).
2.  Create a publisher named `decisionnode` (or update `package.json` with your actual publisher name).
3.  Generate a **Personal Access Token (PAT)** in Azure DevOps with "Marketplace (Manage)" permissions.

```bash
cd decisionnode-vscode

# Install vsce tool
npm install -g @vscode/vsce

# Login with your publisher name
vsce login decisionnode

# Package (creates .vsix file to test locally)
vsce package

# Publish
vsce publish
```

## 3. Deploy Website (Marketplace & Docs)

The website is a static Vite app located in `decisionnode-marketplace`.

### Option A: Vercel (Recommended)

1.  Install Vercel CLI: `npm i -g vercel`
2.  Deploy:

```bash
cd decisionnode-marketplace
vercel
```

Follow the prompts. It will detect Vite and deploy automatically.

### Option B: Netlify / Others

1.  Build the static assets:

```bash
cd decisionnode-marketplace
npm run build
```

2.  Upload the `dist` folder to your host.

## 4. Make Repo Public

1.  Check your `.gitignore` one last time.
2.  Push everything:

```bash
git add .
git commit -m "chore: prepare for public release"
git push origin main
```

3.  Go to GitHub Settings -> Danger Zone -> Change visibility -> **Public**.
