# Privacy Policy

## Overview

TikTok All Reposted Videos Remover is a Chrome extension designed to help users automatically remove all reposted videos from their TikTok profile. We are committed to protecting your privacy and ensuring that no personal data is ever collected, stored, or shared.

---

## What Data We Collect

**We do not collect or transmit personal data to the developer or any third party.**
All extension logic runs within your browser. Network requests go only to TikTok to perform the operation you requested.

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
  - Load the first page and ask for confirmation before changing anything.
  - Filter and process one page at a time; a full pre-scan runs only in read-only analysis mode.
  - Send requests to remove each confirmed repost.
  - Scan again to verify which reposts disappeared and which remain.
- Shows an in-page control panel to pause, resume, stop, and download a local report.

All requests are made **directly from your browser to TikTok** using your existing session.  
No data is sent to any server controlled by this extension or its developer.

---

## Third-Party Services

This extension does **not** use any third-party analytics, tracking scripts, or external APIs.

---

## Permissions Explanation

The extension uses the following Chrome permissions:

- **`host_permissions`** (`https://*.tiktok.com/*`): Required so the extension can run only on TikTok pages. No other domains are accessed.
- **`scripting`**: Needed to run the content script, execute a confirmed removal request in TikTok's page context, and read session data required to identify your account.
- **`tabs`**: Used to open your TikTok profile, focus an already active run, and communicate with that TikTok tab.
- **`storage`**: Used to save your local configuration and a temporary active-job marker. Stale markers automatically expire after 12 hours.

These permissions are the minimum required for the extension to perform its intended function.  
They are never used to collect analytics, track you across sites, or send data to external services.

---

## Contact

If you have any questions or concerns regarding privacy, feel free to reach out:

**Developer:** Gabriel de Rezende Gonçalves  
**Website:** [gabireze.com.br](https://gabireze.com.br)  
**GitHub:** [github.com/gabireze](https://github.com/gabireze)
