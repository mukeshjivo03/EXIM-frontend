# Bank & wallet logo overrides

`<BankLogo>` (`src/pages/accounts/bank-loan/BankLogo.tsx`) resolves a mark in
three steps:

1. **Logo CDN** — `https://logo.clearbit.com/<domain>`, using the `domain` in
   `src/pages/accounts/bank-loan/brands.ts`.
2. **This folder** — `/logos/<slug>.svg`, using that brand's `slug`.
3. **Monogram badge** — a brand-coloured lettermark, always available.

So drop a file here whenever the CDN mark is wrong, missing, or unreachable:

```
public/logos/icici.svg      → used for the brand with slug "icici"
public/logos/paytm.svg      → used for the brand with slug "paytm"
```

Slugs are the `slug` field of each entry in `brands.ts`. SVG is preferred (it
stays sharp in the 28–44px chips); a PNG works if you rename the extension in
`BankLogo.tsx`.

**To stop calling the CDN entirely** — for an air-gapped deployment, or to keep
bank names off a third-party service — set `LOGO_CDN = null` in `BankLogo.tsx`.
Every logo then comes from this folder, and anything missing falls back to a
monogram.
