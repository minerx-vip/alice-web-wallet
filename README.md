# Alice Web Wallet

Web wallet for Alice Protocol.

[中文文档](./README.zh-CN.md)

## Features

- **Wallet**: Create / import wallets (encrypted locally)
- **Transfers**: Send ALICE to another address
- **History**: View transfer history (via indexer API)
- **Staking**: View staking status / stake / unstake
- **PWA**: Supports adding to home screen with an app icon (manifest + service worker)

## Requirements

- Node.js 20+ recommended
- npm (this repo includes `package-lock.json`)

## Getting Started

Install dependencies:

```bash
npm ci
```

Run dev server:

```bash
npm run dev
```

Open:

- [http://localhost:3000](http://localhost:3000)

Build & start:

```bash
npm run build
npm run start
```

## Add to Home Screen (Mobile)

This app includes a web app manifest (`public/manifest.json`) and service worker (`public/sw.js`).

### iOS (Safari)

1. Open the site in Safari
2. Tap Share
3. Tap "Add to Home Screen"
4. Confirm

### Android (Chrome)

1. Open the site in Chrome
2. Tap the menu (3 dots)
3. Tap "Add to Home screen" / "Install app"

## Notes

- Keys and encrypted wallet payloads are stored in the browser (localStorage). Back up your wallet data and mnemonic safely.
