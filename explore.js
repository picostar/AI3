/**
 * explore.js - File browser for Autonomys DSN
 * 
 * Allows users to browse all files stored on the Autonomys
 * Distributed Storage Network (DSN) via Auto Drive API.
 * 
 * Features:
 * - Paginated file listing
 * - Search by filename or CID
 * - Filter by file type
 * - Sort by date/size
 * - Network toggle (Mainnet/Testnet)
 */

// Network configurations
const NETWORKS = {
    mainnet: {
        name: 'Mainnet',
        autoDriveApi: 'https://mainnet.auto-drive.autonomys.xyz/api',
        gateway: 'https://gateway.autonomys.xyz/file'
    },
    testnet: {
        name: 'Testnet (Taurus)',
        autoDriveApi: 'https://taurus.auto-drive.autonomys.xyz/api',
        gateway: 'https://gateway.taurus.autonomys.xyz/file'
    }
};

// Current network selection (default to mainnet, or load from localStorage)
let currentNetwork = localStorage.getItem('selectedNetwork') || 'mainnet';

const FILES_PER_PAGE = 20;

// Read-only API key for browsing public network files
const API_KEY = '8e2d61fa4df443b9a44d9f358b861792';

// Get current network config
function getNetwork() {
    return NETWORKS[currentNetwork];
}

let currentPage = 0;
let totalFiles = 0;
let allFiles = [];

// Format bytes to human readable
function formatBytes(bytes) {
    bytes = parseInt(bytes) || 0;
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
    return bytes + ' B';
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Truncate CID
function truncateCid(cid) {
    if (!cid) return 'N/A';
    return cid.slice(0, 8) + '...' + cid.slice(-6);
}

// Get file type icon
function getFileIcon(mimeType, name) {
    if (!mimeType) mimeType = '';
    if (mimeType.startsWith('image/')) return '[IMG]';
    if (mimeType.startsWith('video/')) return '[VID]';
    if (mimeType.startsWith('audio/')) return '[AUD]';
    if (mimeType.includes('json')) return '[J]';
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return '[ZIP]';
    if (mimeType.includes('pdf')) return '[PDF]';
    if (mimeType.startsWith('text/') || name?.endsWith('.txt') || name?.endsWith('.md')) return '[TXT]';
    return '[F]';
}

// Get status badge
function getStatusBadge(status) {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'archived') {
        return '<span class="status-badge status-archived">Archived</span>';
    } else if (statusLower === 'archiving') {
        return '<span class="status-badge status-pending">Archiving...</span>';
    } else {
        return '<span class="status-badge status-pending">' + (status || 'Pending') + '</span>';
    }
}

// Fetch files from network
async function fetchFiles(page = 0) {
    const network = getNetwork();
    const loadingEl = document.getElementById('files-loading');
    const tableContainer = document.getElementById('files-table-container');
    
    loadingEl.classList.remove('hidden');
    tableContainer.classList.add('hidden');

    try {
        // Fetch more files to get a better sample for sorting (API doesn't support sort)
        const limit = 100; // Fetch 100 to find recent files
        const response = await fetch(`${network.autoDriveApi}/objects/roots?limit=${limit}&offset=0`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'X-Auth-Provider': 'apikey'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        totalFiles = parseInt(data.totalCount) || 0;
        allFiles = data.rows || [];
        
        // Sort by date (newest first) since API returns by CID
        allFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        currentPage = page;

        // Update stats
        document.getElementById('total-files').textContent = totalFiles.toLocaleString();

        // Paginate from sorted array
        const startIdx = page * FILES_PER_PAGE;
        const pageFiles = allFiles.slice(startIdx, startIdx + FILES_PER_PAGE);

        // Render table
        renderFilesTable(pageFiles);

        // Render pagination
        renderPagination();

        loadingEl.classList.add('hidden');
        tableContainer.classList.remove('hidden');

    } catch (error) {
        console.error('Failed to fetch files:', error);
        loadingEl.innerHTML = '<p class="error">Failed to load files: ' + error.message + '</p>';
    }
}

// Render files table
function renderFilesTable(files) {
    const network = getNetwork();
    const tbody = document.getElementById('explore-table-body');
    tbody.innerHTML = '';

    if (!files || files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No files found</td></tr>';
        return;
    }

    files.forEach(file => {
        const row = document.createElement('tr');
        const cid = file.headCid || file.cid || 'N/A';
        const gatewayUrl = `${network.gateway}/${cid}`;
        const icon = getFileIcon(file.mimeType, file.name);
        const name = file.name || 'Unnamed';
        const displayName = name.length > 35 ? name.slice(0, 32) + '...' : name;

        row.innerHTML = `
            <td title="${name}">
                <span class="file-icon">${icon}</span>
                ${displayName}
            </td>
            <td><span class="mime-type">${file.mimeType || 'unknown'}</span></td>
            <td>${formatBytes(file.size)}</td>
            <td>${getStatusBadge(file.status)}</td>
            <td>${formatDate(file.createdAt)}</td>
            <td class="cid-cell">
                <span class="monospace" title="${cid}">${truncateCid(cid)}</span>
                <button class="btn-copy-small" onclick="copyToClipboard('${cid}')" title="Copy CID">Copy</button>
            </td>
            <td class="actions-cell">
                <a href="${gatewayUrl}" target="_blank" class="btn btn-small btn-primary">View</a>
                <button class="btn btn-small btn-secondary" onclick="copyToClipboard('${gatewayUrl}')" title="Copy link">Link</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render pagination
function renderPagination() {
    const paginationEl = document.getElementById('pagination');
    const totalPages = Math.ceil(totalFiles / FILES_PER_PAGE);

    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let html = '';
    
    // Previous button
    if (currentPage > 0) {
        html += `<button class="btn btn-small btn-secondary" onclick="goToPage(${currentPage - 1})">← Prev</button>`;
    }

    // Page numbers
    const startPage = Math.max(0, currentPage - 2);
    const endPage = Math.min(totalPages - 1, currentPage + 2);

    if (startPage > 0) {
        html += `<button class="btn btn-small btn-secondary" onclick="goToPage(0)">1</button>`;
        if (startPage > 1) html += '<span class="pagination-dots">...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'btn-primary' : 'btn-secondary';
        html += `<button class="btn btn-small ${activeClass}" onclick="goToPage(${i})">${i + 1}</button>`;
    }

    if (endPage < totalPages - 1) {
        if (endPage < totalPages - 2) html += '<span class="pagination-dots">...</span>';
        html += `<button class="btn btn-small btn-secondary" onclick="goToPage(${totalPages - 1})">${totalPages}</button>`;
    }

    // Next button
    if (currentPage < totalPages - 1) {
        html += `<button class="btn btn-small btn-secondary" onclick="goToPage(${currentPage + 1})">Next →</button>`;
    }

    // Page info
    html += `<span class="page-info">Page ${currentPage + 1} of ${totalPages}</span>`;

    paginationEl.innerHTML = html;
}

// Go to specific page
function goToPage(page) {
    fetchFiles(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Could show a toast notification here
    });
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            renderFilesTable(allFiles);
            return;
        }

        const filtered = allFiles.filter(file => {
            const name = (file.name || '').toLowerCase();
            const cid = (file.headCid || file.cid || '').toLowerCase();
            return name.includes(query) || cid.includes(query);
        });

        renderFilesTable(filtered);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });
}

// Filter functionality
function setupFilters() {
    const typeFilter = document.getElementById('type-filter');
    const sortFilter = document.getElementById('sort-filter');

    typeFilter.addEventListener('change', applyFilters);
    sortFilter.addEventListener('change', applyFilters);
}

function applyFilters() {
    const typeFilter = document.getElementById('type-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;

    let filtered = [...allFiles];

    // Type filter
    if (typeFilter) {
        filtered = filtered.filter(file => {
            const mime = (file.mimeType || '').toLowerCase();
            return mime.includes(typeFilter);
        });
    }

    // Sort
    switch (sortFilter) {
        case 'oldest':
            filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'newest':
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'largest':
            filtered.sort((a, b) => parseInt(b.size || 0) - parseInt(a.size || 0));
            break;
        case 'smallest':
            filtered.sort((a, b) => parseInt(a.size || 0) - parseInt(b.size || 0));
            break;
    }

    renderFilesTable(filtered);
}

// Make goToPage and copyToClipboard global
window.goToPage = goToPage;
window.copyToClipboard = copyToClipboard;

// Switch network and refresh files
function switchNetwork(network) {
    if (network === currentNetwork) return;
    
    currentNetwork = network;
    localStorage.setItem('selectedNetwork', network);
    
    // Update toggle buttons
    const mainnetBtn = document.getElementById('mainnet-btn');
    const testnetBtn = document.getElementById('testnet-btn');
    
    if (network === 'mainnet') {
        mainnetBtn?.classList.add('active');
        testnetBtn?.classList.remove('active');
    } else {
        mainnetBtn?.classList.remove('active');
        testnetBtn?.classList.add('active');
    }
    
    // Refresh files with new network
    fetchFiles(0);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set up network toggle buttons
    const mainnetBtn = document.getElementById('mainnet-btn');
    const testnetBtn = document.getElementById('testnet-btn');
    
    // Restore saved network preference
    if (currentNetwork === 'testnet') {
        mainnetBtn?.classList.remove('active');
        testnetBtn?.classList.add('active');
    }
    
    mainnetBtn?.addEventListener('click', () => switchNetwork('mainnet'));
    testnetBtn?.addEventListener('click', () => switchNetwork('testnet'));
    
    fetchFiles(0);
    setupSearch();
    setupFilters();
});
