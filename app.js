/**
 * app.js - Main application for AI3 Demo
 * 
 * Handles:
 * - Wallet connection (MetaMask/Coinbase) to Autonomys EVM
 * - File uploads to Auto Drive permanent storage
 * - QR code generation for file sharing
 * - User file management and credits display
 */

import { ethers } from 'ethers';
import QRCode from 'qrcode';
import { createAutoDriveApi } from '@autonomys/auto-drive';
import { NetworkId } from '@autonomys/auto-utils';

// Auto Drive configuration
const AUTO_DRIVE_GATEWAY = 'https://gateway.autonomys.xyz/file';
let autoDriveApi = null;

// Encrypted API key - decrypted only when user enters the correct passphrase
const ENCRYPTED_KEY = 'sRTm2nczbfeBVtEz:gQYaAYZWr38omAoFmMjrqA==:YnuCe7ZGJ2UwXcPwdb9IBRklccWzByqjQJrZCyanBOs=';

// Decrypt API key using Web Crypto API
async function decryptApiKey(secret) {
    try {
        const parts = ENCRYPTED_KEY.split(':');
        if (parts.length !== 3) return null;
        
        const iv = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0));
        const authTag = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
        const encrypted = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
        
        // Combine encrypted data with auth tag for GCM
        const ciphertext = new Uint8Array(encrypted.length + authTag.length);
        ciphertext.set(encrypted);
        ciphertext.set(authTag, encrypted.length);
        
        // Derive key from secret using PBKDF2
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: encoder.encode('autonomys-salt'), iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );
        
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        return null;
    }
}

// Check if input is the secret passphrase and decrypt
async function checkSecretKey(input) {
    const decrypted = await decryptApiKey(input);
    if (decrypted && decrypted.length === 32) {
        return decrypted;
    }
    return null;
}

// Autonomys Network Configuration
const AUTONOMYS_CONFIG = {
    chainId: '0x21fc', // 8700 in hex
    chainName: 'Autonomys EVM',
    nativeCurrency: {
        name: 'tAI3',
        symbol: 'tAI3',
        decimals: 18
    },
    rpcUrls: ['https://auto-evm.chronos.autonomys.xyz/ws'],
    blockExplorerUrls: ['https://explorer.auto-evm.chronos.autonomys.xyz/']
};

let provider = null;
let signer = null;
let currentAccount = null;
let injectedEthereum = null;
let isConnecting = false;

function formatAmountForDisplay(decimalString, maxDecimals = 4) {
    if (typeof decimalString !== 'string' || decimalString.length === 0) return '';
    if (maxDecimals <= 0) {
        const dot = decimalString.indexOf('.');
        return dot === -1 ? decimalString : decimalString.slice(0, dot);
    }

    const negative = decimalString.startsWith('-');
    const unsigned = negative ? decimalString.slice(1) : decimalString;
    const parts = unsigned.split('.');
    let whole = parts[0] || '0';
    const fractionRaw = parts[1] || '';

    if (fractionRaw.length === 0) return negative ? `-${whole}` : whole;

    const fractionPadded = fractionRaw.padEnd(maxDecimals + 1, '0');
    const kept = fractionPadded.slice(0, maxDecimals);
    const nextDigit = Number(fractionPadded.charAt(maxDecimals) || '0');

    let carry = nextDigit >= 5 ? 1 : 0;
    const keptDigits = kept.split('');
    for (let i = keptDigits.length - 1; i >= 0; i--) {
        if (carry === 0) break;
        const d = (keptDigits[i].charCodeAt(0) - 48) + carry;
        keptDigits[i] = String(d % 10);
        carry = d >= 10 ? 1 : 0;
    }

    if (carry === 1) {
        const wholeDigits = whole.split('');
        for (let i = wholeDigits.length - 1; i >= 0; i--) {
            const code = wholeDigits[i].charCodeAt(0);
            if (code < 48 || code > 57) continue;
            const d = (code - 48) + carry;
            wholeDigits[i] = String(d % 10);
            carry = d >= 10 ? 1 : 0;
            if (carry === 0) break;
        }
        if (carry === 1) wholeDigits.unshift('1');
        whole = wholeDigits.join('');
    }

    const fractionRoundedTrimmed = keptDigits.join('').replace(/0+$/g, '');
    const result = fractionRoundedTrimmed.length ? `${whole}.${fractionRoundedTrimmed}` : whole;
    return negative ? `-${result}` : result;
}

// Auto Drive API instance is created when API key is provided

// DOM Elements
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const walletInfo = document.getElementById('wallet-info');
const accountElement = document.getElementById('account');
const balanceElement = document.getElementById('balance');
const networkElement = document.getElementById('network');
const explorerLink = document.getElementById('explorerLink');

// File upload elements
const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadButton');
const uploadStatus = document.getElementById('upload-status');
const uploadForm = document.getElementById('upload-form');
const uploadSuccess = document.getElementById('upload-success');
const fileIdElement = document.getElementById('fileId');
const shareLinkElement = document.getElementById('shareLink');
const qrCodeContainer = document.getElementById('qr-code-container');
const copyLinkButton = document.getElementById('copyLinkButton');
const downloadQRButton = document.getElementById('downloadQRButton');
const uploadNewButton = document.getElementById('uploadNewButton');

// Credits elements
const creditsSection = document.getElementById('credits-section');
const creditsBar = document.getElementById('credits-bar');
const creditsUsed = document.getElementById('credits-used');
const creditsRemaining = document.getElementById('credits-remaining');
const creditsTotal = document.getElementById('credits-total');
const selectedFileSize = document.getElementById('selected-file-size');
const apiKeyInput = document.getElementById('apiKeyInput');

const FREE_TIER_MB = 100; // 100 MB free tier
const AUTO_DRIVE_API_BASE = 'https://mainnet.auto-drive.autonomys.xyz/api';

// Download elements
const downloadSection = document.getElementById('download-section');
const fileInfoText = document.getElementById('file-info-text');
const downloadFileButton = document.getElementById('downloadFileButton');
let currentDownloadFileId = null;

function getInjectedEthereum() {
    const eth = window.ethereum;
    if (!eth) return null;

    // Some browsers expose multiple injected providers via window.ethereum.providers
    const providers = Array.isArray(eth.providers) ? eth.providers : null;
    if (providers && providers.length > 0) {
        const coinbase = providers.find((p) => p && p.isCoinbaseWallet);
        if (coinbase) return coinbase;

        const metamask = providers.find((p) => p && p.isMetaMask);
        if (metamask) return metamask;

        return providers[0];
    }

    return eth;
}

function getWalletLabel(eth) {
    if (!eth) return 'wallet';
    if (eth.isCoinbaseWallet) return 'Coinbase Wallet';
    if (eth.isMetaMask) return 'MetaMask';
    return 'wallet';
}

// Check if an injected EVM wallet provider is available
function isWalletInstalled() {
    return getInjectedEthereum() !== null;
}

// Add Autonomys Network to MetaMask
async function addAutonomysNetwork() {
    try {
        await injectedEthereum.request({
            method: 'wallet_addEthereumChain',
            params: [AUTONOMYS_CONFIG]
        });
        return true;
    } catch (error) {
        console.error('Error adding network:', error);
        return false;
    }
}

// Switch to Autonomys Network
async function switchToAutonomysNetwork() {
    try {
        await injectedEthereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: AUTONOMYS_CONFIG.chainId }]
        });
        return true;
    } catch (error) {
        if (error.code === 4902) {
            // Network not added yet
            return await addAutonomysNetwork();
        }
        console.error('Error switching network:', error);
        return false;
    }
}

function parseChainId(chainId) {
    if (typeof chainId === 'number') return chainId;
    if (typeof chainId !== 'string') return NaN;

    // EIP-1193 returns hex string like 0x1
    if (chainId.startsWith('0x') || chainId.startsWith('0X')) {
        return Number.parseInt(chainId, 16);
    }

    // Some UIs may provide decimal strings
    return Number.parseInt(chainId, 10);
}

async function ensureAutonomysNetwork(walletLabel) {
    try {
        const currentChainIdRaw = await injectedEthereum.request({ method: 'eth_chainId' });
        const currentChainId = parseChainId(currentChainIdRaw);
        if (currentChainId === 8700) {
            return true;
        }
    } catch (error) {
        // If eth_chainId fails, fall back to switch attempt below.
        console.warn('Unable to read eth_chainId before switching:', error);
    }

    try {
        const switched = await switchToAutonomysNetwork();
        if (!switched) return false;

        const chainIdAfterRaw = await injectedEthereum.request({ method: 'eth_chainId' });
        const chainIdAfter = parseChainId(chainIdAfterRaw);
        return chainIdAfter === 8700;
    } catch (error) {
        console.error('Error ensuring Autonomys network:', error);
        alert(`Network switch failed in ${walletLabel}. If Autonomys EVM is selected in your wallet, reload this page and try again.\n\nDetails: ${error?.message || error}`);
        return false;
    }
}

// Connect Wallet
async function connectWallet() {
    if (isConnecting) return;
    if (!isWalletInstalled()) {
        alert('No injected EVM wallet detected. Install a browser wallet like Coinbase Wallet or MetaMask, then reload this page.');
        return;
    }

    try {
        isConnecting = true;
        injectedEthereum = getInjectedEthereum();
        const walletLabel = getWalletLabel(injectedEthereum);

        // Request account access
        const accounts = await injectedEthereum.request({
            method: 'eth_requestAccounts'
        });

        // Switch to Autonomys Network
        const onAutonomys = await ensureAutonomysNetwork(walletLabel);
        if (!onAutonomys) {
            alert(`Please switch your ${walletLabel} to the Autonomys EVM network (Chain ID 8700), then reconnect.`);
            return;
        }

        // Set up provider and signer
        provider = new ethers.BrowserProvider(injectedEthereum);
        signer = await provider.getSigner();
        currentAccount = accounts[0];

        // Verify chain
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== 8700) {
            alert(`Connected to the wrong network (Chain ID ${network.chainId}). Switch to Autonomys EVM (Chain ID 8700) and try again.`);
            disconnectWallet();
            return;
        }

        // Update UI
        await updateWalletInfo();
        connectButton.classList.add('hidden');
        walletInfo.classList.remove('hidden');

        console.log('Connected to Autonomys Network!');
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet: ' + error.message);
    } finally {
        isConnecting = false;
    }
}

// Update Wallet Information
async function updateWalletInfo() {
    if (!provider || !currentAccount) return;

    try {
        // Get balance
        const balance = await provider.getBalance(currentAccount);
        const balanceInEth = ethers.formatEther(balance);

        // Get network
        const network = await provider.getNetwork();
        const chainIdNumber = Number(network.chainId);
        const networkLabel = chainIdNumber === 8700 ? 'Autonomys EVM' : (network.name || 'unknown');

        // Update UI
        accountElement.textContent = `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`;
        balanceElement.textContent = formatAmountForDisplay(balanceInEth, 4);
        networkElement.textContent = `${networkLabel} (${chainIdNumber})`;
        if (explorerLink) {
            explorerLink.href = `https://explorer.auto-evm.chronos.autonomys.xyz/address/${currentAccount}`;
        }
    } catch (error) {
        console.error('Error updating wallet info:', error);
    }
}

// Disconnect Wallet
function disconnectWallet() {
    provider = null;
    signer = null;
    currentAccount = null;
    injectedEthereum = null;

    connectButton.classList.remove('hidden');
    walletInfo.classList.add('hidden');
}

// Initialize Auto Drive API with the provided API key
function initializeAutoDrive(apiKey) {
    if (!apiKey || apiKey.trim().length === 0) {
        autoDriveApi = null;
        return false;
    }
    try {
        autoDriveApi = createAutoDriveApi({
            apiKey: apiKey.trim(),
            network: NetworkId.MAINNET
        });
        return true;
    } catch (error) {
        console.error('Error initializing Auto Drive API:', error);
        autoDriveApi = null;
        return false;
    }
}

// Upload file to AI3 via Auto Drive SDK
async function uploadFile() {
    const file = fileInput.files[0];
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

    if (!apiKey) {
        showUploadStatus('Please enter your Auto Drive API key (get one at ai3.storage)', 'error');
        return;
    }

    if (!file) {
        showUploadStatus('Please select a file', 'error');
        return;
    }

    // Auto Drive free tier has 100MB/month limit; warn for large files
    if (file.size > 20 * 1024 * 1024) {
        showUploadStatus('File size must be less than 20MB (Auto Drive free tier limit)', 'error');
        return;
    }

    try {
        showUploadStatus('Initializing Auto Drive...', 'pending');
        uploadButton.disabled = true;

        if (!initializeAutoDrive(apiKey)) {
            showUploadStatus('Invalid API key or failed to initialize Auto Drive', 'error');
            uploadButton.disabled = false;
            return;
        }

        showUploadStatus('Uploading to AI3 (Auto Drive)...', 'pending');

        // Upload using the Auto Drive SDK - use uploadFileFromInput for browser File objects
        const cid = await autoDriveApi.uploadFileFromInput(file, {
            compression: false,
            onProgress: (progress) => {
                showUploadStatus(`Uploading to AI3... ${Math.round(progress)}%`, 'pending');
            }
        });

        // Generate share link using the gateway
        const shareLink = `${AUTO_DRIVE_GATEWAY}/${cid}`;

        // Generate QR code
        try {
            qrCodeContainer.innerHTML = '';
            const canvas = document.createElement('canvas');
            qrCodeContainer.appendChild(canvas);
            await QRCode.toCanvas(canvas, shareLink, { width: 300 });
        } catch (err) {
            console.error('Error generating QR code:', err);
        }

        // Show success with file details
        fileIdElement.textContent = cid;
        shareLinkElement.textContent = shareLink;
        
        // Set file size
        const uploadedFileSizeEl = document.getElementById('uploadedFileSize');
        if (uploadedFileSizeEl) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            uploadedFileSizeEl.textContent = `${sizeMB} MB (${sizeMB} credits)`;
        }
        
        // Set gateway link
        const gatewayLinkEl = document.getElementById('gatewayLink');
        if (gatewayLinkEl) {
            gatewayLinkEl.href = shareLink;
        }
        
        uploadForm.classList.add('hidden');
        uploadSuccess.classList.remove('hidden');
        uploadStatus.classList.add('hidden');

        showUploadStatus('File uploaded to AI3 successfully!', 'success');

        // Refresh credits display after upload
        if (creditsSection && !creditsSection.classList.contains('hidden')) {
            checkCredits();
        }
        
        // Refresh files list
        loadMyFiles(0);

    } catch (error) {
        console.error('Upload error:', error);
        let msg = error.message || 'Unknown error';
        if (msg.includes('401') || msg.includes('Unauthorized')) {
            msg = 'Invalid API key. Get one at ai3.storage';
        }
        showUploadStatus(`Upload failed: ${msg}`, 'error');
    } finally {
        uploadButton.disabled = false;
    }
}

// Show upload status
function showUploadStatus(message, type) {
    uploadStatus.innerHTML = message;
    uploadStatus.className = type;
    uploadStatus.classList.remove('hidden');
}

// Copy share link
function copyShareLink() {
    const link = shareLinkElement.textContent;
    navigator.clipboard.writeText(link).then(() => {
        copyLinkButton.textContent = 'Copied!';
        setTimeout(() => {
            copyLinkButton.textContent = 'Copy Link';
        }, 2000);
    });
}

// Download QR Code as image
function downloadQRCodeImage() {
    const canvas = qrCodeContainer.querySelector('canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'file-share-qr-code.png';
        link.click();
    }
}

// Reset upload form
function resetUploadForm() {
    fileInput.value = '';
    uploadStatus.classList.add('hidden');
    uploadForm.classList.remove('hidden');
    uploadSuccess.classList.add('hidden');
}

// Download file by CID via Auto Drive gateway
function downloadFileById() {
    if (!currentDownloadFileId) {
        fileInfoText.textContent = 'No file CID provided';
        return;
    }
    // Open the gateway URL directly; the browser will handle the download
    const gatewayUrl = `${AUTO_DRIVE_GATEWAY}/${currentDownloadFileId}`;
    window.open(gatewayUrl, '_blank');
}

// Check for file CID in URL parameters
function checkFileIdInUrl() {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('fileId') || params.get('cid');

    if (cid) {
        currentDownloadFileId = cid;
        const gatewayUrl = `${AUTO_DRIVE_GATEWAY}/${cid}`;
        fileInfoText.innerHTML = `
            <p><strong>CID:</strong> <span class="monospace">${cid.slice(0, 12)}...${cid.slice(-6)}</span></p>
            <p><strong>Gateway URL:</strong> <a href="${gatewayUrl}" target="_blank" rel="noopener">${gatewayUrl.slice(0, 50)}...</a></p>
            <p>Click the button below to download from AI3 permanent storage.</p>
        `;
        downloadSection.classList.remove('hidden');
    }
}

// Copy CID to clipboard
function copyCid() {
    const cid = fileIdElement.textContent;
    navigator.clipboard.writeText(cid).then(() => {
        const btn = document.getElementById('copyCidButton');
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = 'Copy';
        }, 2000);
    });
}

// Event Listeners
connectButton.addEventListener('click', connectWallet);
disconnectButton.addEventListener('click', disconnectWallet);
uploadButton.addEventListener('click', uploadFile);
copyLinkButton.addEventListener('click', copyShareLink);
downloadQRButton.addEventListener('click', downloadQRCodeImage);
uploadNewButton.addEventListener('click', resetUploadForm);
downloadFileButton.addEventListener('click', downloadFileById);

const copyCidButton = document.getElementById('copyCidButton');
if (copyCidButton) {
    copyCidButton.addEventListener('click', copyCid);
}

// My Files elements
const filesLoading = document.getElementById('files-loading');
const filesList = document.getElementById('files-list');
const filesTableBody = document.getElementById('files-table-body');
const filesPagination = document.getElementById('files-pagination');
const filesError = document.getElementById('files-error');

let currentFilesPage = 0;
const FILES_PER_PAGE = 10;

// Load My Files
async function loadMyFiles(page = 0) {
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

    if (!apiKey) {
        return;
    }

    try {
        filesLoading.classList.remove('hidden');
        filesList.classList.add('hidden');
        filesError.classList.add('hidden');

        // Call API directly with scope=user to get only user's files
        const offset = page * FILES_PER_PAGE;
        const response = await fetch(`${AUTO_DRIVE_API_BASE}/objects/roots?scope=user&limit=${FILES_PER_PAGE}&offset=${offset}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Auth-Provider': 'apikey'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const myFiles = await response.json();
        currentFilesPage = page;

        // Render files table
        filesTableBody.innerHTML = '';
        
        if (!myFiles.rows || myFiles.rows.length === 0) {
            filesTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No files found. Upload a file to store it on AI3.</td></tr>';
        } else {
            for (const file of myFiles.rows) {
                const row = document.createElement('tr');
                const sizeMB = file.size ? (file.size / (1024 * 1024)).toFixed(2) : '0.00';
                const credits = sizeMB;
                const cid = file.headCid || file.cid || 'N/A';
                const gatewayUrl = `${AUTO_DRIVE_GATEWAY}/${cid}`;
                const shortCid = cid.length > 16 ? `${cid.slice(0, 8)}...${cid.slice(-6)}` : cid;
                
                row.innerHTML = `
                    <td title="${file.name || 'Unnamed'}">${(file.name || 'Unnamed').slice(0, 25)}${(file.name || '').length > 25 ? '...' : ''}</td>
                    <td>${sizeMB} MB<br><small style="color: #667eea;">(${credits} credits)</small></td>
                    <td class="monospace cid-cell">
                        <span title="${cid}">${shortCid}</span>
                        <button class="btn-copy-small" onclick="navigator.clipboard.writeText('${cid}')" title="Copy CID">Copy</button>
                    </td>
                    <td class="actions-cell">
                        <a href="${gatewayUrl}" target="_blank" class="btn btn-small btn-primary">View</a>
                        <button class="btn btn-small btn-secondary" onclick="navigator.clipboard.writeText('${gatewayUrl}')" title="Copy gateway link">Link</button>
                    </td>
                `;
                filesTableBody.appendChild(row);
            }
        }

        // Render pagination
        const totalPages = Math.ceil((parseInt(myFiles.totalCount) || 0) / FILES_PER_PAGE);
        renderFilesPagination(totalPages, page);

        filesLoading.classList.add('hidden');
        filesList.classList.remove('hidden');

    } catch (error) {
        console.error('Error loading files:', error);
        let msg = error.message || 'Unknown error';
        if (msg.includes('401') || msg.includes('Unauthorized')) {
            msg = 'Invalid API key';
        }
        showFilesError(`Failed to load files: ${msg}`);
    } finally {
        filesLoading.classList.add('hidden');
    }
}

function renderFilesPagination(totalPages, currentPage) {
    filesPagination.innerHTML = '';
    
    if (totalPages <= 1) return;

    for (let i = 0; i < totalPages && i < 10; i++) {
        const btn = document.createElement('button');
        btn.textContent = i + 1;
        btn.className = `btn btn-small ${i === currentPage ? 'btn-primary' : 'btn-secondary'}`;
        btn.onclick = () => loadMyFiles(i);
        filesPagination.appendChild(btn);
    }
}

function showFilesError(message) {
    filesError.textContent = message;
    filesError.classList.remove('hidden');
    filesList.classList.add('hidden');
    filesLoading.classList.add('hidden');
}

// Format bytes to MB with decimal precision
function formatBytesToMB(bytes) {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2);
}

// Format credits (1 credit = 1 MB)
function bytesToCredits(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2);
}

// Check and display credits usage
async function checkCredits() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

    if (!apiKey) {
        return;
    }

    try {
        // Call API directly - SDK has a bug calling wrong endpoint (/api@me instead of /api/accounts/@me)
        const response = await fetch(`${AUTO_DRIVE_API_BASE}/accounts/@me`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Auth-Provider': 'apikey'
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch account info:', response.status);
            creditsSection.classList.remove('hidden');
            return;
        }

        const accountInfo = await response.json();
        console.log('Account info:', accountInfo);

        // Values are in bytes
        const uploadLimitBytes = accountInfo.uploadLimit || 0;
        const remainingBytes = accountInfo.pendingUploadCredits || 0;
        const usedBytes = uploadLimitBytes - remainingBytes;

        // Convert to MB
        const totalMB = uploadLimitBytes / (1024 * 1024);
        const usedMB = usedBytes / (1024 * 1024);
        const remainingMB = remainingBytes / (1024 * 1024);

        // Calculate percentage
        const usedPercent = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;

        // Update UI
        if (creditsBar) {
            creditsBar.style.width = `${Math.min(usedPercent, 100)}%`;
            
            // Color based on usage
            if (usedPercent > 90) {
                creditsBar.style.backgroundColor = 'var(--error)';
            } else if (usedPercent > 70) {
                creditsBar.style.backgroundColor = 'var(--warning)';
            } else {
                creditsBar.style.backgroundColor = 'var(--success)';
            }
        }

        if (creditsUsed) creditsUsed.textContent = `${usedMB.toFixed(2)} MB`;
        if (creditsRemaining) creditsRemaining.textContent = `${remainingMB.toFixed(2)} MB`;
        if (creditsTotal) creditsTotal.textContent = `${totalMB.toFixed(2)} MB`;

        creditsSection.classList.remove('hidden');

    } catch (error) {
        console.error('Error checking credits:', error);
        creditsSection.classList.remove('hidden');
    }
}

// Display selected file size
function displaySelectedFileSize() {
    const file = fileInput.files[0];
    if (file) {
        const sizeMB = formatBytesToMB(file.size);
        const credits = bytesToCredits(file.size);
        selectedFileSize.textContent = `File size: ${sizeMB} MB (${credits} credits)`;
        
        // Warn if file is large
        if (parseFloat(sizeMB) > FREE_TIER_MB) {
            selectedFileSize.classList.add('warning');
            selectedFileSize.textContent += ' - Exceeds free tier limit!';
        } else {
            selectedFileSize.classList.remove('warning');
        }
    } else {
        selectedFileSize.textContent = '';
    }
}

fileInput.addEventListener('change', displaySelectedFileSize);

// API status element
const apiStatus = document.getElementById('api-status');

// Auto-load credits and files when API key is entered
let apiKeyDebounceTimer = null;
apiKeyInput.addEventListener('input', () => {
    clearTimeout(apiKeyDebounceTimer);
    const key = apiKeyInput.value.trim();
    
    // Hide status when key is cleared
    if (key.length < 6) {
        if (apiStatus) apiStatus.classList.add('hidden');
        creditsSection.classList.add('hidden');
        filesList.classList.add('hidden');
        return;
    }
    
    // Trigger check after typing stops
    apiKeyDebounceTimer = setTimeout(async () => {
        let finalKey = key;
        
        // Check if it's a passphrase (short) that decrypts to an API key
        if (key.length < 20) {
            const decrypted = await checkSecretKey(key);
            if (decrypted) {
                finalKey = decrypted;
                apiKeyInput.value = decrypted;
                apiKeyInput.type = 'password'; // Hide the key
                showUploadStatus('API key unlocked!', 'success');
                setTimeout(() => {
                    const uploadStatus = document.getElementById('upload-status');
                    if (uploadStatus) uploadStatus.classList.add('hidden');
                }, 2000);
            } else {
                // Not a valid passphrase or key
                return;
            }
        }
        
        await checkCredits();
        await loadMyFiles(0);
        // Show API connected status
        if (apiStatus && autoDriveApi) {
            apiStatus.classList.remove('hidden');
        }
    }, 500);
});

// Listen for account changes
if (isWalletInstalled()) {
    const eth = getInjectedEthereum();
    if (eth && typeof eth.on === 'function') {
        eth.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (currentAccount && accounts[0] !== currentAccount) {
            currentAccount = accounts[0];
            updateWalletInfo();
        }
        });

        eth.on('chainChanged', async (newChainId) => {
            const parsed = parseChainId(newChainId);
            if (parsed !== 8700) {
                disconnectWallet();
                alert('Wallet switched to a different network. Please switch back to Autonomys EVM (Chain ID 8700) and reconnect.');
                return;
            }

            if (provider) {
                provider = new ethers.BrowserProvider(eth);
                signer = await provider.getSigner();
                updateWalletInfo();
            }
        });
    }
}

// Removed auto-connect on load to avoid aggressive reconnection loops
// Check for file ID in URL on initial load
checkFileIdInUrl();
