# Plaid OAuth redirect (Universal Link)

OAuth banks (Discover, Chase, etc.) require a **Universal Link** redirect URI on iOS.

## 1. Deploy this folder

Host these files on a domain you control, for example:

- `https://your-domain.com/.well-known/apple-app-site-association`
- `https://your-domain.com/plaid/` → `plaid/index.html`

Works on Vercel, Netlify, GitHub Pages, Cloudflare Pages, etc.

Edit `.well-known/apple-app-site-association` and replace `YOUR_APPLE_TEAM_ID` with your Apple Developer Team ID (Xcode → Signing & Capabilities).

## 2. Plaid Dashboard

1. [Developers → API](https://dashboard.plaid.com/developers/api)
2. **Allowed redirect URIs** → add: `https://your-domain.com/plaid/`
3. Confirm **iOS bundle ID** `com.martindonev.financeai` is listed

## 3. Environment variables

Root `.env` and `mobile/.env`:

```env
PLAID_REDIRECT_URI=https://your-domain.com/plaid/
EXPO_PUBLIC_PLAID_REDIRECT_URI=https://your-domain.com/plaid/
```

Use the exact same URI everywhere (including trailing slash).

## 4. Rebuild the iOS app

Associated Domains are baked into the native build:

```bash
cd mobile
npx expo prebuild --platform ios
```

Then open `ios/FinanceAi.xcworkspace` in Xcode and run on your device again.

## Sandbox shortcut (no OAuth setup)

In Plaid sandbox, search **First Platypus Bank** instead of Discover. It does not require OAuth redirect setup.
