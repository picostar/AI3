# Auto Drive SDK Bug Report

**Date:** January 23, 2026  
**Reporter:** Developer testing @autonomys/auto-drive SDK  
**SDK Version:** Latest from npm  
**Environment:** Browser (Vite + vanilla JS)

---

## Summary

The `@autonomys/auto-drive` SDK has a bug in the `getSubscriptionInfo()` / `getMe()` function that causes it to call the wrong API endpoint, resulting in a 404 error.

---

## Bug Details

### Issue: Incorrect Endpoint Path

The SDK constructs the URL incorrectly:

| SDK Calls | Should Be |
|-----------|-----------|
| `GET /api@me` | `GET /api/accounts/@me` |

The SDK is **missing the `/accounts` path segment**, causing the API to return:

```
HTTP/1.1 404 Not Found
Cannot GET /@me
```

### Evidence

**SDK-generated request (FAILS):**
```bash
curl "https://mainnet.auto-drive.autonomys.xyz/api@me" \
  -H "Authorization: Bearer API_KEY" \
  -H "X-Auth-Provider: apikey"

# Response: 404 Not Found - Cannot GET /@me
```

**Correct endpoint (WORKS):**
```bash
curl "https://mainnet.auto-drive.autonomys.xyz/api/accounts/@me" \
  -H "Authorization: Bearer API_KEY" \
  -H "X-Auth-Provider: apikey"

# Response: 200 OK with user account data
```

### Browser Console Error
```
GET https://mainnet.auto-drive.autonomys.xyz/api@me 404 (Not Found)
Error: Failed to get limits:
```

---

## Working Endpoints (Verified via CLI)

| Endpoint | Status | Purpose |
|----------|--------|---------|
| `GET /api/accounts/@me` | ✅ Works | Get user account & subscription info |
| `GET /api/objects/roots?scope=user&limit=10&offset=0` | ✅ Works | List user's files |
| `POST /api/uploads/file` | ✅ Works | Upload files |
| `GET /api/downloads/{cid}` | ✅ Works | Download files |

---

## Response from Correct Endpoint

`GET /api/accounts/@me` returns:

```json
{
  "id": "f0d004eb-d256-40c9-b5f5-bd1a819e85e2",
  "uploadLimit": 104857600,
  "downloadLimit": 5368709120,
  "organizationId": "cb68d942-e40e-45d5-9d5c-25d600ad8a67",
  "model": "one_off",
  "pendingUploadCredits": 102304759,
  "pendingDownloadCredits": 5368709120
}
```

**Note:** Values are in **bytes**, not MB:
- `uploadLimit`: 104,857,600 bytes = 100 MB
- `pendingUploadCredits`: 102,304,759 bytes = ~97.5 MB remaining

---

## Affected SDK Functions

Based on the error, these SDK functions are likely affected:

1. `autoDriveApi.getSubscriptionInfo()` - Calls `getMe()` internally
2. `autoDriveApi.getPendingCredits()` - Also calls `getMe()` internally
3. Any function that needs user account information

---

## Workaround

Call the API directly instead of using the SDK method:

```javascript
async function getAccountInfo(apiKey) {
  const response = await fetch('https://mainnet.auto-drive.autonomys.xyz/api/accounts/@me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Auth-Provider': 'apikey'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get account info: ${response.status}`);
  }
  
  return response.json();
}
```

---

## Suggested Fix

In the SDK source code, the `getMe` function likely constructs the URL as:

```javascript
// CURRENT (broken)
`${baseUrl}@me`

// SHOULD BE
`${baseUrl}/accounts/@me`
```

The path should include `/accounts/` before `@me`.

---

## API Documentation Reference

The correct endpoints are documented at:
- **API Docs UI:** https://mainnet.auto-drive.autonomys.xyz/api/docs
- **Raw OpenAPI Spec:** https://mainnet.auto-drive.autonomys.xyz/api/docs/raw

The spec shows the correct path as `/accounts/@me`.

---

## Test Commands

To verify the fix, the AI3 team can run:

```bash
# Should return 200 with user data
curl -X GET "https://mainnet.auto-drive.autonomys.xyz/api/accounts/@me" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Auth-Provider: apikey"

# This is what the SDK currently calls (returns 404)
curl -X GET "https://mainnet.auto-drive.autonomys.xyz/api@me" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Auth-Provider: apikey"
```

---

## Impact

- **Severity:** Medium - Breaks subscription/credits tracking functionality
- **Affected Users:** All SDK users trying to check account limits or credits
- **Workaround Available:** Yes - direct API calls

---

## Additional Notes

- File uploads (`uploadFileFromInput`) work correctly
- File listing (`getMyFiles`) works correctly  
- Only the account/subscription endpoints are affected
- The gateway download URLs work correctly

---

**Contact:** Please reach out if you need additional information or logs.
