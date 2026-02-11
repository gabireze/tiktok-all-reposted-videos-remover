# Privacy Policy

## Overview

TikTok All Reposted Videos Remover is a Chrome extension designed to help users automatically remove all reposted videos from their TikTok profile. We are committed to protecting your privacy and ensuring that no personal data is ever collected, stored, or shared.

---

## What Data We Collect

**We do not collect or transmit any personal data.**  
All extension logic runs entirely within your browser, and no data is sent to any external server.

Specifically:
- We do **not** collect your TikTok credentials.
- We do **not** access your TikTok content beyond what is necessary to automate the repost removal.
- We do **not** track your activity or browsing behavior.

---

## How the Extension Works

The extension performs the following actions, entirely in your browser:

- Opens [tiktok.com](https://www.tiktok.com) in a new browser tab.
- Navigates to your TikTok profile.
- Uses the same authenticated TikTok web APIs that the site itself uses to:
  - List your reposted videos.
  - Send requests to remove each selected repost.
- Shows an in-page control panel to pause, resume, and download a local report of the items processed.

All requests are made **directly from your browser to TikTok** using your existing session.  
No data is sent to any server controlled by this extension or its developer.

---

## Third-Party Services

This extension does **not** use any third-party analytics, tracking scripts, or external APIs.

---

## Permissions Explanation

The extension uses the following Chrome permissions:

- **`host_permissions`** (`https://*.tiktok.com/*`): Required so the extension can run only on TikTok pages. No other domains are accessed.
- **`scripting`**: Needed to inject and run the content script on TikTok pages and to read session data required to identify your account.
- **`tabs`**: Used to open your TikTok profile in a new tab and communicate with that tab.
- **`cookies`**: Used **only in the popup** to check whether you are logged in to TikTok (by checking TikTok cookies locally). Cookie values are not stored or sent anywhere.
- **`storage`**: Used to save your local configuration (intervals, keywords, report format, etc.) inside your browser.

These permissions are the minimum required for the extension to perform its intended function.  
They are never used to collect analytics, track you across sites, or send data to external services.

---

## Contact

If you have any questions or concerns regarding privacy, feel free to reach out:

**Developer:** Gabriel de Rezende Gonçalves  
**Website:** [gabireze.com.br](https://gabireze.com.br)  
**GitHub:** [github.com/gabireze](https://github.com/gabireze)
