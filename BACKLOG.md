# AI3 File Sharing App - Product Backlog

## Vision
Build a decentralized file sharing application on Autonomys Network with end-to-end encryption, access control, and time-limited sharing capabilities.

## User Intents & Development Cycles

### User Intent 1: Secure File Encryption
**As a user, I want my files encrypted before upload so that only authorized recipients can access the content.**

#### DevCycle 1.1: Client-Side File Encryption
**User Story:** As a file owner, I want to encrypt my files locally before uploading so that the storage provider never has access to unencrypted content.

**Tasks:**
- Implement AES-256-GCM encryption for files
- Generate unique encryption keys per file
- Encrypt file in browser before Auto Drive upload
- Store encryption metadata securely

**Function Test Requirements:**
- Upload encrypted file successfully
- Verify file is encrypted in Auto Drive (inspect raw CID data)
- Download and decrypt file correctly
- Encryption fails gracefully with clear error messages

**MoE:** 3 days

---

#### DevCycle 1.2: Encryption Key Management
**User Story:** As a file owner, I want secure key storage so that I can access my encrypted files later.

**Tasks:**
- Implement secure key generation
- Store keys in sessionStorage (encrypted)
- Create key-file mapping structure
- Implement key retrieval for decryption

**Function Test Requirements:**
- Generate cryptographically secure keys
- Keys persist across page navigation (within session)
- Keys cleared when tab closes
- Key retrieval works for any uploaded file

**MoE:** 2 days

---

#### DevCycle 1.3: File Decryption on Download
**User Story:** As an authorized user, I want to download and decrypt files seamlessly so that I can access the content.

**Tasks:**
- Fetch encrypted file from Auto Drive
- Decrypt file client-side
- Stream decrypted content to download
- Handle decryption errors

**Function Test Requirements:**
- Successfully decrypt and download file
- Decryption fails with wrong key
- Large files (>50MB) decrypt without memory issues
- Progress indicator shows during decryption

**MoE:** 2 days

---

#### DevCycle 1.4: Asymmetric Key Exchange
**User Story:** As a file sharer, I want to securely share encryption keys with recipients so that they can decrypt shared files.

**Tasks:**
- Implement RSA/ECDH key pair generation
- Encrypt file keys with recipient's public key
- Decrypt received keys with private key
- Store public keys on Auto Drive

**Function Test Requirements:**
- Generate valid RSA/ECDH key pairs
- Successfully encrypt and decrypt file keys
- Key exchange works between different browsers/devices
- Invalid keys rejected gracefully

**MoE:** 5 days

---

#### DevCycle 1.5: Passphrase-Based Access
**User Story:** As a file sharer, I want to protect files with a passphrase for simple sharing without managing recipient keys.

**Tasks:**
- Derive encryption key from passphrase using PBKDF2
- Store passphrase-encrypted file key
- Validate passphrase on access attempt
- Support passphrase-based sharing alongside key exchange

**Function Test Requirements:**
- Correct passphrase decrypts file
- Incorrect passphrase fails with clear message
- Strong passphrase requirements enforced
- Passphrase option available in share UI

**MoE:** 2 days

**Total User Intent MoE:** 14 days

---

### User Intent 2: Access Control & Sharing
**As a file owner, I want to control who can access my files so that I maintain privacy and security.**

#### DevCycle 2.1: Share Tracking Data Model
**User Story:** As a file owner, I want to track who I've shared files with so that I know who has access.

**Tasks:**
- Design access control list (ACL) JSON structure
- Include recipient identifiers (wallet, email, public key)
- Add share timestamp and metadata
- Version control for ACL updates

**Function Test Requirements:**
- ACL structure validated against schema
- Supports multiple recipient types
- ACL correctly serializes/deserializes
- Handles empty and large recipient lists

**MoE:** 1 day

---

#### DevCycle 2.2: Store Access Control List
**User Story:** As a file owner, I want my access control list stored securely so that I can manage permissions persistently.

**Tasks:**
- Encrypt ACL before storage
- Upload ACL to Auto Drive
- Link ACL CID to file metadata
- Implement ACL retrieval

**Function Test Requirements:**
- ACL stored encrypted on Auto Drive
- ACL correctly linked to file
- ACL retrieved and decrypted successfully
- ACL updates overwrite previous version

**MoE:** 2 days

---

#### DevCycle 2.3: Add Recipients to Share
**User Story:** As a file owner, I want to add recipients to my share list so that they can access my files.

**Tasks:**
- Create "Add Recipient" UI form
- Validate recipient identifiers
- Update ACL with new recipient
- Re-upload updated ACL

**Function Test Requirements:**
- Add recipient via wallet address
- Add recipient via email/identifier
- Multiple recipients added successfully
- Duplicate recipients prevented
- Invalid identifiers rejected

**MoE:** 3 days

---

#### DevCycle 2.4: Revoke Access
**User Story:** As a file owner, I want to revoke access from recipients so that they can no longer access my files.

**Tasks:**
- "Remove Recipient" UI action
- Update ACL removing recipient
- Re-encrypt file with new key (for strong revocation)
- Update shared keys for remaining recipients

**Function Test Requirements:**
- Revoked recipient cannot access file
- Remaining recipients still have access
- Revocation reflected in share list immediately
- Re-encryption completes successfully for large files

**MoE:** 2 days

---

#### DevCycle 2.5: View Shared-With List
**User Story:** As a file owner, I want to see who has access to my files so that I can audit and manage permissions.

**Tasks:**
- Display recipient list in file details
- Show share date and status for each recipient
- Filter/search recipients
- Export share list

**Function Test Requirements:**
- All recipients displayed accurately
- Share dates and metadata shown correctly
- Search/filter works across all fields
- List updates in real-time after changes

**MoE:** 2 days

---

#### DevCycle 2.6: Recipient Authentication
**User Story:** As a recipient, I want to prove my identity before accessing shared files so that access is secure.

**Tasks:**
- Implement wallet signature verification
- Support email-based verification codes
- Validate recipient against ACL
- Handle authentication failures

**Function Test Requirements:**
- Wallet signature verification succeeds
- Email verification code workflow complete
- Access denied for invalid credentials
- Multiple authentication attempts handled correctly

**MoE:** 3 days

**Total User Intent MoE:** 13 days

---

### User Intent 3: Time-Limited File Sharing
**As a file owner, I want to set expiration times on shared files so that access is automatically revoked after a period.**

#### DevCycle 3.1: Expiration Metadata
**User Story:** As a file owner, I want to set when shared access expires so that files are not accessible indefinitely.

**Tasks:**
- Add expiration timestamp to ACL structure
- Support per-recipient expiration times
- Default expiration presets (1 hour, 1 day, 1 week, custom)
- Store expiration in UTC

**Function Test Requirements:**
- Expiration timestamps stored correctly
- Different recipients can have different expirations
- Expiration survives serialization/deserialization
- Timezone conversion handled properly

**MoE:** 1 day

---

#### DevCycle 3.2: Set Expiration UI
**User Story:** As a file owner, I want an easy way to set expiration times when sharing so that I can control access duration.

**Tasks:**
- Add expiration picker to share dialog
- Support quick presets (1h, 24h, 7d, 30d)
- Custom date/time picker
- Display expiration in share list

**Function Test Requirements:**
- Preset times set correctly
- Custom date/time picker works across browsers
- Expiration displayed in user's local timezone
- "Never expires" option available and works

**MoE:** 2 days

---

#### DevCycle 3.3: Client-Side Expiration Check
**User Story:** As a recipient, I want to be blocked from expired files so that I only access files I'm authorized to view.

**Tasks:**
- Check expiration before allowing decryption
- Show clear expiration message
- Display time remaining before expiration
- Handle timezone differences

**Function Test Requirements:**
- Expired access blocked completely
- Expiration message clear and user-friendly
- Time remaining accurate to the minute
- Edge cases handled (server time vs client time)
| E3-4 | Auto-cleanup expired shares | Background job to remove expired access entries | 3 days | E3-1, E2-4 |
| E3-5 | Expiration notifications | Notify sharer when access expires | 2 days | E3-3 |
| E3-6 | Extend/renew access | Allow sharer to extend expiration time | 2 days | E3-1, E3-2 |

**Total Epic MOE:** 12 days

---

### User Intent 4: Smart Contract Access Control (Optional)
**As a developer, I want on-chain access control so that permissions are auditable and immutable.**

#### DevCycle 4.1: Access Control Smart Contract
**User Story:** As a developer, I want a smart contract to manage file permissions so that access control is decentralized.

**Tasks:**
- Write Solidity access control contract
- Implement grant/revoke functions
- Add expiration support
- Deploy to Autonomys EVM

**Function Test Requirements:**
- ✓ Contract deploys successfully
- ✓ Grant permission function works
- ✓ Revoke permission function works
- ✓ Expiration enforced on-chain
- ✓ Gas costs reasonable
- ✓ Events emitted correctly

**MoE:** 5 days

---

#### DevCycle 4.2: On-Chain Permission Checks
**User Story:** As a recipient, I want my access verified on-chain so that it's tamper-proof.

**Tasks:**
- Query contract before granting access
- Handle blockchain delays gracefully
- Cache results for performance
- Fall back to off-chain if blockchain unavailable

**Function Test Requirements:**
- ✓ Permission check queries contract
- ✓ Valid permissions grant access
- ✓ Invalid permissions deny access
- ✓ Caching reduces redundant queries
- ✓ Graceful degradation if chain unavailable

**MoE:** 3 days

---

#### DevCycle 4.3: Revocation Events
**User Story:** As a monitoring system, I want smart contract events so that I can track access changes.

**Tasks:**
- Emit events on grant/revoke
- Listen for events in UI
- Update ACL based on events
- Display event history

**Function Test Requirements:**
- ✓ Events emitted on all permission changes
- ✓ UI updates when events received
- ✓ Event history queryable
- ✓ Events include all relevant metadata
- ✓ Historical events accessible

**MoE:** 2 days

---

#### DevCycle 4.4: Time-Lock Mechanism
**User Story:** As a file owner, I want smart contract enforced expiration so that no one can bypass time limits.

**Tasks:**
- Implement time-lock in contract
- Auto-revoke on expiration
- Prevent backdating
- Handle clock skew

**Function Test Requirements:**
- ✓ Expired permissions automatically invalid
- ✓ Cannot set expiration in the past
- ✓ Clock skew handled properly
- ✓ Time-locked permissions work correctly
- ✓ Extension updates time-lock

**MoE:** 4 days

---

#### DevCycle 4.5: Gas Optimization
**User Story:** As a user, I want low transaction costs so that on-chain access control is affordable.

**Tasks:**
- Optimize contract storage
- Batch permission updates
- Use efficient data structures
- Minimize contract calls

**Function Test Requirements:**
- ✓ Grant permission <50k gas
- ✓ Revoke permission <30k gas
- ✓ Batch updates save 30%+ gas
- ✓ Read operations minimal gas
- ✓ Contract size within limits

**MoE:** 3 days

**Total User Intent 4 MoE:** 17 days

---

---

### User Intent 5: Intuitive Sharing UI
**As a user, I want an easy-to-use interface so that I can share files without technical knowledge.**

#### DevCycle 5.1: Share Modal/Dialog
**User Story:** As a file owner, I want a simple share dialog so that I can quickly share files.

**Tasks:**
- Design share modal UI
- Add "Share" button to file list
- Modal shows file details
- Cancel/confirm actions

**Function Test Requirements:**
- ✓ Modal opens from file actions
- ✓ File details displayed correctly
- ✓ Modal closes properly
- ✓ Keyboard navigation works (ESC, Tab)
- ✓ Mobile responsive

**MoE:** 2 days

---

#### DevCycle 5.2: Recipient Input
**User Story:** As a file owner, I want to enter multiple recipients easily so that I can share with groups.

**Tasks:**
- Add recipient input field
- Support wallet addresses
- Support email addresses
- Multiple recipients (tag-style)
- Validate inputs

**Function Test Requirements:**
- ✓ Add recipient by wallet address
- ✓ Add recipient by email
- ✓ Multiple recipients supported
- ✓ Invalid inputs rejected
- ✓ Duplicate detection works
- ✓ Remove recipients from list

**MoE:** 3 days

---

#### DevCycle 5.3: Share Link Generation
**User Story:** As a file owner, I want to generate shareable links so that I can easily distribute access.

**Tasks:**
- Generate unique share link
- Embed encrypted access credentials
- Copy link to clipboard
- Display share URL

**Function Test Requirements:**
- ✓ Unique link generated per share
- ✓ Link contains encrypted key
- ✓ Copy to clipboard works
- ✓ Link is properly formatted
- ✓ Link works in recipient browser

**MoE:** 2 days

---

#### DevCycle 5.4: QR Code for Shares
**User Story:** As a file owner, I want to share via QR code so that mobile users can easily access.

**Tasks:**
- Generate QR code for share link
- Display QR in share dialog
- Download QR as image
- Optimize QR size

**Function Test Requirements:**
- ✓ QR code generated correctly
- ✓ QR scannable by mobile devices
- ✓ Download QR as PNG
- ✓ QR contains valid share link
- ✓ QR optimized for size

**MoE:** 1 day

---

#### DevCycle 5.5: Expiration Time Picker
**User Story:** As a file owner, I want to set expiration easily so that I can control access duration.

**Tasks:**
- Add expiration picker UI
- Quick preset buttons
- Custom date/time picker
- Display selected expiration

**Function Test Requirements:**
- ✓ Presets set correct times
- ✓ Custom picker works
- ✓ Selected time displayed clearly
- ✓ Timezone handling correct
- ✓ Cannot select past dates

**MoE:** 2 days

---

#### DevCycle 5.6: Share Confirmation
**User Story:** As a file owner, I want confirmation after sharing so that I know it succeeded.

**Tasks:**
- Show success message
- Display share details
- List recipients
- Show share link

**Function Test Requirements:**
- ✓ Success message appears
- ✓ All share details shown
- ✓ Recipients listed
- ✓ Share link copyable
- ✓ Close confirmation returns to file list

**MoE:** 1 day

---

#### DevCycle 5.7: Active Shares Dashboard
**User Story:** As a file owner, I want to see all my shared files so that I can manage them in one place.

**Tasks:**
- Create "My Shares" page
- List all shared files
- Show recipient count per file
- Quick actions (view, revoke)

**Function Test Requirements:**
- ✓ All shared files displayed
- ✓ Recipient counts accurate
- ✓ Quick actions work
- ✓ Sorting and filtering
- ✓ Search by filename/recipient

**MoE:** 3 days

**Total User Intent 5 MoE:** 14 days

---

---

### User Intent 6: Seamless Recipient Access
**As a recipient, I want easy file access so that I can download shared files without hassle.**

#### DevCycle 6.1: Access Request Page
**User Story:** As a recipient, I want a landing page for share links so that I can access shared files.

**Tasks:**
- Create share link landing page
- Parse share link parameters
- Display file information
- Show access requirements

**Function Test Requirements:**
- ✓ Page loads from share link
- ✓ File info displayed
- ✓ Access requirements shown
- ✓ Invalid links handled gracefully
- ✓ Mobile responsive

**MoE:** 2 days

---

#### DevCycle 6.2: Recipient Authentication Flow
**User Story:** As a recipient, I want to authenticate quickly so that I can access files.

**Tasks:**
- Implement auth flow
- Wallet connection option
- Email verification option
- Passphrase option

**Function Test Requirements:**
- ✓ Wallet auth works
- ✓ Email verification works
- ✓ Passphrase auth works
- ✓ Auth errors handled
- ✓ Session persists

**MoE:** 3 days

---

#### DevCycle 6.3: File Preview
**User Story:** As a recipient, I want to preview files so that I know what I'm downloading.

**Tasks:**
- Implement preview for common types
- Support images, text, PDFs
- Preview without full download
- Fallback for unsupported types

**Function Test Requirements:**
- ✓ Images preview correctly
- ✓ Text files preview
- ✓ PDFs preview (if supported)
- ✓ Unsupported types show info
- ✓ Preview loads quickly

**MoE:** 3 days

---

#### DevCycle 6.4: Download with Decryption
**User Story:** As a recipient, I want one-click download so that I can get files easily.

**Tasks:**
- Implement download button
- Fetch encrypted file
- Decrypt file
- Trigger browser download

**Function Test Requirements:**
- ✓ Download button works
- ✓ File decrypts correctly
- ✓ Browser download triggered
- ✓ Progress shown for large files
- ✓ Errors handled gracefully

**MoE:** 2 days

---

#### DevCycle 6.5: Access Denied Messaging
**User Story:** As a recipient, I want clear error messages so that I understand why access failed.

**Tasks:**
- Detect access denial reasons
- Show specific error messages
- Suggest remediation steps
- Contact owner option

**Function Test Requirements:**
- ✓ Expired access message shown
- ✓ Revoked access message shown
- ✓ Invalid credentials message shown
- ✓ Messages are user-friendly
- ✓ Contact owner link works

**MoE:** 1 day

---

#### DevCycle 6.6: Files Shared With Me
**User Story:** As a recipient, I want to see all files shared with me so that I can access them later.

**Tasks:**
- Create "Shared With Me" page
- List received files
- Show expiration status
- Quick download action

**Function Test Requirements:**
- ✓ All received files shown
- ✓ Expiration status visible
- ✓ Quick download works
- ✓ Search and filter
- ✓ Updates when new shares received

**MoE:** 3 days

**Total User Intent 6 MoE:** 14 days

---

---

### User Intent 7: Activity Monitoring
**As a user, I want to track file sharing activity so that I'm informed of what's happening.**

#### DevCycle 7.1: Share Notification System
**User Story:** As a recipient, I want notifications when files are shared so that I know they're available.

**Tasks:**
- Implement notification system
- Trigger on new shares
- Display in-app notifications
- Notification history

**Function Test Requirements:**
- ✓ Notification appears on new share
- ✓ Notification dismissable
- ✓ Notification history accessible
- ✓ Notifications don't spam
- ✓ Clear all option works

**MoE:** 2 days

---

#### DevCycle 7.2: Access Tracking Logs
**User Story:** As a file owner, I want to see when recipients access files so that I can track usage.

**Tasks:**
- Log access events
- Store access timestamps
- Track download counts
- Display access history

**Function Test Requirements:**
- ✓ All accesses logged
- ✓ Timestamps accurate
- ✓ Download counts correct
- ✓ Access history displays
- ✓ Privacy considerations met

**MoE:** 2 days

---

#### DevCycle 7.3: Activity Feed
**User Story:** As a user, I want an activity feed so that I see recent share/access events.

**Tasks:**
- Create activity feed UI
- Show recent events
- Group related events
- Filter by type

**Function Test Requirements:**
- ✓ Recent events displayed
- ✓ Events grouped logically
- ✓ Filter works
- ✓ Real-time updates
- ✓ Load more pagination

**MoE:** 3 days

---

#### DevCycle 7.4: Email Notifications (Optional)
**User Story:** As a user, I want email alerts so that I'm notified even when not logged in.

**Tasks:**
- Implement email service integration
- Send email on share events
- Configurable preferences
- Unsubscribe option

**Function Test Requirements:**
- ✓ Emails sent on share events
- ✓ Email content accurate
- ✓ Preferences save correctly
- ✓ Unsubscribe works
- ✓ Email deliverability good

**MoE:** 3 days

---

#### DevCycle 7.5: Expiration Warnings
**User Story:** As a user, I want warnings before access expires so that I can take action.

**Tasks:**
- Detect upcoming expirations
- Send warnings 24h before
- Display in activity feed
- Option to extend

**Function Test Requirements:**
- ✓ Warnings sent 24h before expiration
- ✓ Warning message clear
- ✓ Extend option works
- ✓ Warning doesn't re-send
- ✓ Multiple expirations handled

**MoE:** 2 days

**Total User Intent 7 MoE:** 12 days

---

---

### User Intent 8: Existing App Integration
**As a developer, I want new features integrated seamlessly so that the app feels cohesive.**

#### DevCycle 8.1: Refactor Upload Flow
**User Story:** As a user, I want encryption as an upload option so that I can choose security level.

**Tasks:**
- Add encryption toggle to upload
- Modify upload logic
- Store encryption status
- Backward compatibility

**Function Test Requirements:**
- ✓ Encryption toggle works
- ✓ Encrypted uploads succeed
- ✓ Non-encrypted uploads still work
- ✓ Encryption status stored
- ✓ Existing files unaffected

**MoE:** 3 days

---

#### DevCycle 8.2: My Files Enhancement
**User Story:** As a user, I want share actions in file list so that sharing is quick.

**Tasks:**
- Add share button to file rows
- Show share status icon
- Quick share menu
- Integration with share modal

**Function Test Requirements:**
- ✓ Share button appears
- ✓ Share status visible
- ✓ Quick share works
- ✓ Modal integration smooth
- ✓ UI responsive

**MoE:** 2 days

---

#### DevCycle 8.3: Shared Files Section
**User Story:** As a user, I want separate sections for shared files so that I can organize my content.

**Tasks:**
- Add "Shared Files" tab
- Separate "Shared by Me" and "Shared with Me"
- Integrate with share dashboard
- Navigation between sections

**Function Test Requirements:**
- ✓ Tabs display correctly
- ✓ "Shared by Me" shows owner's shares
- ✓ "Shared with Me" shows received files
- ✓ Navigation works
- ✓ Counts accurate

**MoE:** 3 days

---

#### DevCycle 8.4: Migration for Existing Files
**User Story:** As a user with existing files, I want them to work so that I don't lose access.

**Tasks:**
- Detect unencrypted files
- Mark as "legacy"
- Support legacy file access
- Option to encrypt legacy files

**Function Test Requirements:**
- ✓ Legacy files identified
- ✓ Legacy files still accessible
- ✓ Legacy marker shown
- ✓ Encryption option available
- ✓ Migration successful

**MoE:** 2 days

---

#### DevCycle 8.5: Update Stats Page
**User Story:** As a user, I want sharing metrics so that I can see network usage.

**Tasks:**
- Add sharing stats to stats page
- Show total shares
- Show active shares
- Chart sharing trends

**Function Test Requirements:**
- ✓ Sharing stats displayed
- ✓ Counts accurate
- ✓ Charts render correctly
- ✓ Data refreshes
- ✓ Performance acceptable

**MoE:** 2 days

**Total User Intent 8 MoE:** 12 days

---

## MVP (Minimum Viable Product)

**Phase 1 - Basic Encrypted Sharing**

**User Intents Included:**
- User Intent 1: DevCycles 1.1, 1.2, 1.3 (Core encryption)
- User Intent 2: DevCycles 2.1, 2.2, 2.3 (Basic access control)
- User Intent 5: DevCycles 5.1, 5.2, 5.3 (Simple sharing UI)
- User Intent 6: DevCycles 6.1, 6.2, 6.4 (Recipient access)
- User Intent 8: DevCycles 8.1, 8.2 (Integration)

**Total MVP MoE:** 25 days

**MVP Success Criteria:**
- ✓ Encrypt file before upload
- ✓ Share file with wallet address
- ✓ Generate share link
- ✓ Recipient authenticates and downloads
- ✓ All function tests pass

---

## Release Roadmap

### Phase 2 - Time-Limited Access
**DevCycles:** All of User Intent 3
**MoE:** 12 days
**Success:** Time-limited shares work end-to-end

### Phase 3 - Advanced Features
**DevCycles:**
- User Intent 1: DC 1.4, 1.5 (Key exchange, passphrase)
- User Intent 2: DC 2.4, 2.5, 2.6 (Revocation, management)
- User Intent 5: DC 5.7 (Dashboard)
- User Intent 6: DC 6.3, 6.5, 6.6 (Preview, errors, dashboard)
- User Intent 7: All (Notifications)

**MoE:** 28 days
**Success:** Full feature set operational

### Phase 4 - Smart Contract (Optional)
**DevCycles:** All of User Intent 4
**MoE:** 17 days
**Success:** On-chain access control deployed and tested

---

## Technical Requirements

### Security (MUST HAVE)
- All encryption client-side (zero-knowledge)
- Keys never transmitted in plaintext
- Validate all access before decryption
- Use Web Crypto API
- Implement rate limiting

### Performance Targets
- Encryption: <2s for 10MB files
- Share link generation: <500ms
- Access validation: <200ms
- Page load: <3s

### Browser Support
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: Latest versions

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Share links created/week | 100+ |
| Successful file accesses | 95%+ |
| Average share setup time | <30s |
| Security incidents | 0 |
| Time-limited shares adoption | 60%+ |
| User satisfaction | 4.5/5 |

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Large file encryption slow | High | Medium | Implement Web Workers, show progress |
| Key recovery issues | Critical | Low | Implement key backup/export |
| Browser compatibility | Medium | Medium | Extensive cross-browser testing |
| Spam/abuse | Medium | High | Rate limiting, captcha |
| GDPR compliance | High | Medium | Privacy review, data retention policy |

---

## Open Questions

1. **Key Recovery:** Backup mechanism needed?
2. **Large Files:** Stream encryption for 100MB+ files?
3. **Mobile:** Native app needed or PWA sufficient?
4. **Pricing:** Free tier limits? Premium features?
5. **Email Service:** Which provider for notifications?

---

**Total Estimated Effort:** 108 days (all user intents)
**MVP Effort:** 25 days
**Phase 2 Effort:** 12 days
**Phase 3 Effort:** 28 days
**Phase 4 Effort:** 17 days (optional)
