# AI3 File Sharing App - Product Backlog

## Vision
Build a decentralized file sharing application on Autonomys Network with end-to-end encryption, access control, and time-limited sharing capabilities.

## Epics & Tasks

### Epic 1: Core Encryption & Security
**Goal:** Implement client-side encryption for secure file sharing

| Task ID | Task | Description | MOE | Dependencies |
|---------|------|-------------|-----|--------------|
| E1-1 | Client-side file encryption | Implement AES-256-GCM encryption for files before upload | 3 days | - |
| E1-2 | Key generation and management | Generate unique encryption keys per file, store securely | 2 days | E1-1 |
| E1-3 | File decryption on recipient side | Implement decryption when authorized user downloads | 2 days | E1-1, E1-2 |
| E1-4 | Asymmetric key exchange | Use RSA/ECDH for secure key sharing between users | 5 days | E1-2 |
| E1-5 | Key derivation from passphrase | Optional passphrase-based access for simple sharing | 2 days | E1-2 |

**Total Epic MOE:** 14 days

---

### Epic 2: Access Control & Permissions
**Goal:** Track and manage who can access shared files

| Task ID | Task | Description | MOE | Dependencies |
|---------|------|-------------|-----|--------------|
| E2-1 | Share tracking data structure | Design JSON structure for tracking share recipients | 1 day | - |
| E2-2 | Store access list on Auto Drive | Upload encrypted access control list per file | 2 days | E1-1 |
| E2-3 | Add recipient to share list | UI and logic to add wallet addresses/emails | 3 days | E2-1 |
| E2-4 | Remove recipient access | Revoke access by updating access list | 2 days | E2-2, E2-3 |
| E2-5 | View shared-with list | Display all recipients with current access | 2 days | E2-2 |
| E2-6 | Recipient authentication | Verify recipient identity before granting access | 3 days | E1-4 |

**Total Epic MOE:** 13 days

---

### Epic 3: Time-Limited Access
**Goal:** Enable temporary file sharing with automatic expiration

| Task ID | Task | Description | MOE | Dependencies |
|---------|------|-------------|-----|--------------|
| E3-1 | Expiration metadata structure | Add expiration timestamps to access control | 1 day | E2-1 |
| E3-2 | Set expiration on share | UI to set expiration time (hours/days/custom) | 2 days | E3-1 |
| E3-3 | Client-side expiration check | Validate expiration before allowing decryption | 2 days | E3-1, E1-3 |
| E3-4 | Auto-cleanup expired shares | Background job to remove expired access entries | 3 days | E3-1, E2-4 |
| E3-5 | Expiration notifications | Notify sharer when access expires | 2 days | E3-3 |
| E3-6 | Extend/renew access | Allow sharer to extend expiration time | 2 days | E3-1, E3-2 |

**Total Epic MOE:** 12 days

---

### Epic 4: Smart Contract Integration (Optional)
**Goal:** On-chain access control for enhanced security and auditability

| Task ID | Task | Description | MOE | Dependencies |
|---------|------|-------------|-----|--------------|
| E4-1 | Access control smart contract | Solidity contract to manage file permissions | 5 days | E2-1 |
| E4-2 | On-chain permission checks | Query contract before granting access | 3 days | E4-1 |
| E4-3 | Revocation events | Emit events when access is revoked | 2 days | E4-1 |
| E4-4 | Time-lock mechanism | Smart contract enforced expiration | 4 days | E4-1, E3-1 |
| E4-5 | Gas optimization | Minimize transaction costs for access updates | 3 days | E4-1 |

**Total Epic MOE:** 17 days

---

### Epic 5: Sharing UI/UX
**Goal:** User-friendly interface for sharing files

| Task ID | Task | Description | MOE | Dependencies |
|---------|------|-------------|-----|--------------|
| E5-1 | Share modal/dialog | UI to initiate file sharing | 2 days | - |
| E5-2 | Recipient input (wallet/email) | Allow multiple recipient methods | 3 days | E2-3 |
| E5-3 | Share link generation | Generate shareable links with embedded keys | 2 days | E1-4 |
| E5-4 | QR code for shares | Generate QR with encrypted access credentials | 1 day | E5-3 |
| E5-5 | Expiration time picker | Calendar/time selector for access duration | 2 days | E3-2 |
| E5-6 | Share confirmation | Success message with share details | 1 day | E5-1 |
| E5-7 | Active shares dashboard | View all files shared by user | 3 days | E2-5 |

**Total Epic MOE:** 14 days

---

### Epic 6: Recipient Access Experience
**Goal:** Seamless file access for authorized recipients

| Task ID | Task | Description | MOE | Dependencies |
|---------|------|-------------|-----|--------------|
| E6-1 | Access request page | Landing page for share links | 2 days | E5-3 |
| E6-2 | Recipient authentication flow | Login/verify identity to access file | 3 days | E2-6 |
| E6-3 | File preview (if allowed) | Show preview before download | 3 days | E1-3 |
| E6-4 | Download with decryption | One-click download and decrypt | 2 days | E1-3 |
| E6-5 | Access denied messaging | Clear error messages for expired/revoked access | 1 day | E3-3 |
| E6-6 | Files shared with me | Dashboard of received files | 3 days | E2-6 |

**Total Epic MOE:** 14 days

---

### Epic 7: Notifications & Monitoring
**Goal:** Keep users informed about share activity

| Task ID | Task | Description | MOE | Dependencies |
|---------|------|-------------|-----|--------------|
| E7-1 | Share notification system | Alert when file is shared with user | 2 days | E2-3 |
| E7-2 | Access tracking logs | Log when recipients access files | 2 days | E6-2 |
| E7-3 | Activity feed | Show recent share/access activity | 3 days | E7-1, E7-2 |
| E7-4 | Email notifications (optional) | Email alerts for important events | 3 days | E7-1 |
| E7-5 | Expiration warnings | Notify before access expires | 2 days | E3-5 |

**Total Epic MOE:** 12 days

---

### Epic 8: Integration with Existing App
**Goal:** Seamlessly integrate new features into current AI3 demo

| Task ID | Task | Description | MOE | Dependencies |
|---------|------|-------------|-----|--------------|
| E8-1 | Refactor upload flow | Add encryption option to existing upload | 3 days | E1-1 |
| E8-2 | My Files enhancement | Add share actions to file list | 2 days | E5-1 |
| E8-3 | Shared files section | New section for shared/received files | 3 days | E5-7, E6-6 |
| E8-4 | Migration for existing files | Handle backward compatibility | 2 days | E8-1 |
| E8-5 | Update stats page | Show sharing metrics | 2 days | E7-3 |

**Total Epic MOE:** 12 days

---

## MVP (Minimum Viable Product)

**Phase 1 - Basic Encrypted Sharing (4-5 weeks)**
- E1-1, E1-2, E1-3: Core encryption
- E2-1, E2-2, E2-3: Basic access control
- E5-1, E5-2, E5-3: Simple sharing UI
- E6-1, E6-2, E6-4: Recipient access
- E8-1, E8-2: Integration with upload

**Estimated Total:** 25-30 days

---

## Release Roadmap

### Phase 2 - Time-Limited Access (2-3 weeks)
- Epic 3 tasks
- E5-5: Expiration picker
- E6-5: Access denied UX

**Estimated Total:** 14 days

### Phase 3 - Advanced Features (3-4 weeks)
- E1-4: Key exchange
- E2-4, E2-5: Revocation and management
- E5-7, E6-6: Dashboards
- Epic 7: Notifications

**Estimated Total:** 20 days

### Phase 4 - Smart Contract (Optional) (3-4 weeks)
- Epic 4: On-chain access control
- Enhanced security and auditability

**Estimated Total:** 17 days

---

## Technical Considerations

### Security Requirements
- **MUST**: All encryption happens client-side (zero-knowledge)
- **MUST**: Keys never transmitted in plaintext
- **MUST**: Validate all access checks before decryption
- **SHOULD**: Use Web Crypto API for cryptographic operations
- **SHOULD**: Implement key rotation capabilities

### Performance Targets
- Encryption/decryption: <2s for files under 10MB
- Share link generation: <500ms
- Access validation: <200ms

### Browser Compatibility
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Share links created per week | 100+ |
| Successful file accesses | 95%+ |
| Average share setup time | <30 seconds |
| User-reported security issues | 0 |
| Time-limited shares using feature | 60%+ |

---

## Open Questions & Risks

1. **Key Recovery**: How do users recover access if they lose their keys?
2. **Large Files**: Performance impact of encrypting 100MB+ files?
3. **Mobile Support**: Does Web Crypto API work well on mobile browsers?
4. **Spam Prevention**: How to prevent abuse of sharing system?
5. **Legal**: GDPR/privacy law compliance for access logs?

---

**Total Estimated Effort (All Epics):** ~108 days
**MVP Effort:** ~30 days
