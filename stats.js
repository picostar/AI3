/**
 * stats.js - Network statistics for Autonomys/AI3
 * 
 * Fetches and displays real-time network health metrics from:
 * - Blockscout Explorer API (EVM stats, blocks, transactions)
 * - Auto Drive API (file storage statistics)
 * - Subscan API (consensus layer health)
 * 
 * Auto-refreshes every 30 seconds.
 * Supports switching between Mainnet and Testnet.
 */

// Network configurations
const NETWORKS = {
    mainnet: {
        name: 'Mainnet',
        explorerApi: 'https://explorer.auto-evm.mainnet.autonomys.xyz/api/v2',
        autoDriveApi: 'https://mainnet.auto-drive.autonomys.xyz/api',
        gateway: 'https://gateway.autonomys.xyz',
        rpcUrl: 'https://auto-evm.mainnet.autonomys.xyz/ws',
        altRpcUrl: 'https://rpc.auto-evm.mainnet.autonomys.xyz',
        subscanApi: 'https://autonomys.api.subscan.io',
        explorerUrl: 'https://explorer.auto-evm.mainnet.autonomys.xyz'
    },
    testnet: {
        name: 'Testnet (Chronos)',
        explorerApi: 'https://explorer.auto-evm.chronos.autonomys.xyz/api/v2',
        autoDriveApi: null, // Auto Drive only available on mainnet
        gateway: 'https://gateway.autonomys.xyz', // Uses mainnet gateway (testnet not available)
        rpcUrl: 'https://auto-evm.chronos.autonomys.xyz/ws',
        altRpcUrl: 'https://rpc.auto-evm.chronos.autonomys.xyz',
        subscanApi: 'https://autonomys-chronos.api.subscan.io',
        explorerUrl: 'https://explorer.auto-evm.chronos.autonomys.xyz'
    }
};

// Current network selection (default to mainnet, or load from localStorage)
let currentNetwork = localStorage.getItem('selectedNetwork') || 'mainnet';

// Get API key from sessionStorage (set on home page, cleared when tab closes)
function getApiKey() {
    return sessionStorage.getItem('autoDriveApiKey') || '';
}

// Get current network config
function getNetwork() {
    return NETWORKS[currentNetwork];
}

// Track when services first went down (for escalating from warning to error)
const healthDownSince = {};
const DOWNTIME_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

// Format large numbers
function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
}

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes >= 1e15) return (bytes / 1e15).toFixed(2) + ' PB';
    if (bytes >= 1e12) return (bytes / 1e12).toFixed(2) + ' TB';
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
    return bytes.toLocaleString() + ' bytes';
}

// Format time ago from ISO string
function timeAgoISO(isoString) {
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// Truncate hash
function truncateHash(hash) {
    if (!hash) return 'N/A';
    return hash.slice(0, 10) + '...' + hash.slice(-6);
}

// Set health indicator with downtime tracking
// Orange (warning) when first down, Red (error) after 15+ minutes down
function setHealth(elementId, status) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (status === 'healthy' || status === 'loading') {
        // Service is up or loading - clear any tracked downtime
        delete healthDownSince[elementId];
        el.className = 'health-dot ' + status;
    } else if (status === 'na') {
        // Service not available for this network (e.g., Auto Drive on testnet)
        delete healthDownSince[elementId];
        el.className = 'health-dot na';
        el.title = 'Not available on Testnet - Auto Drive is only available on Mainnet';
    } else if (status === 'down' || status === 'warning' || status === 'error') {
        // Service is down - track when it first went down
        if (!healthDownSince[elementId]) {
            healthDownSince[elementId] = Date.now();
        }
        
        const downDuration = Date.now() - healthDownSince[elementId];
        if (downDuration >= DOWNTIME_THRESHOLD_MS) {
            // Down for 15+ minutes - show red
            el.className = 'health-dot error';
        } else {
            // Just went down - show orange
            el.className = 'health-dot warning';
        }
    }
}

// Update storage cost calculator with live AI3 price
function updateStorageCosts(ai3Price) {
    // VERIFIED from blockchain: transactionByteFee = 312,497,241,916 shannon/byte
    // Cost per GB = (byte_fee * bytes_per_GB) / 10^18
    // = (312497241916 * 1073741824) / 10^18 = ~335.5 AI3 per GB
    const ai3PerGB = 335.54; // Verified from blockchain transaction byte fee
    const costPerGB = ai3PerGB * ai3Price;
    
    // Update the calculator display
    const priceEl = document.getElementById('price-per-gb');
    if (priceEl) priceEl.textContent = costPerGB.toFixed(2);
    
    const currentPriceEl = document.getElementById('current-price');
    if (currentPriceEl) currentPriceEl.textContent = ai3Price.toFixed(4);
    
    // Update the comparison table with live price
    const adPriceEl = document.getElementById('ad-price');
    if (adPriceEl) adPriceEl.textContent = '$' + costPerGB.toFixed(2);
}

// Fetch and update Arweave storage cost from their API
async function fetchArweaveCost() {
    try {
        // Fetch Arweave price for 1GB in winston (1 AR = 10^12 winston)
        const [priceRes, rateRes] = await Promise.all([
            fetch('https://arweave.net/price/1073741824'), // 1GB in bytes
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=arweave&vs_currencies=usd')
        ]);
        
        const winstonPerGB = parseInt(await priceRes.text());
        const rateData = await rateRes.json();
        const arUsdPrice = rateData.arweave?.usd;
        
        if (winstonPerGB && arUsdPrice) {
            // Convert winston to AR (1 AR = 10^12 winston), then to USD
            const arPerGB = winstonPerGB / 1e12;
            const costPerGB = arPerGB * arUsdPrice;
            
            // Update all Arweave price displays
            const arPriceEls = document.querySelectorAll('.ar-price');
            arPriceEls.forEach(el => {
                el.textContent = '~$' + costPerGB.toFixed(2);
                el.title = `${arPerGB.toFixed(2)} AR × $${arUsdPrice.toFixed(2)}/AR (live from Arweave API)`;
            });
            
            console.log(`Arweave cost: ${arPerGB.toFixed(2)} AR × $${arUsdPrice.toFixed(2)} = $${costPerGB.toFixed(2)}/GB`);
        }
    } catch (error) {
        console.error('Failed to fetch Arweave pricing:', error);
        // Keep default ~$13 estimate on error
    }
}

// Fetch network stats from Blockscout
async function fetchNetworkStats() {
    const network = getNetwork();
    try {
        const response = await fetch(`${network.explorerApi}/stats`);
        const stats = await response.json();
        
        // Update all stats cards with real data
        document.getElementById('latest-block').textContent = formatNumber(stats.total_blocks);
        document.getElementById('avg-block-time').textContent = (stats.average_block_time / 1000).toFixed(1);
        
        // Price - only available on mainnet (testnet has no real token value)
        const priceEl = document.getElementById('total-supply');
        const priceDetail = priceEl.parentElement.querySelector('.stat-detail');
        if (stats.coin_price && !isNaN(parseFloat(stats.coin_price))) {
            priceEl.textContent = '$' + parseFloat(stats.coin_price).toFixed(4);
            priceEl.title = ''; // Clear any testnet tooltip
            
            // Price change indicator
            const priceChange = parseFloat(stats.coin_price_change_percentage) || 0;
            if (priceChange >= 0) {
                priceDetail.innerHTML = `<span style="color: #4ade80">+${priceChange.toFixed(2)}%</span> 24h change`;
            } else {
                priceDetail.innerHTML = `<span style="color: #f87171">${priceChange.toFixed(2)}%</span> 24h change`;
            }
            
            // Update storage cost calculator with live price
            updateStorageCosts(parseFloat(stats.coin_price));
        } else {
            // Testnet - no real price
            priceEl.textContent = 'N/A';
            priceEl.title = 'Testnet tokens have no real value';
            priceDetail.textContent = 'Testnet (no market value)';
        }
        
        document.getElementById('tx-count').textContent = parseInt(stats.transactions_today) || 0;
        document.getElementById('tx-count').parentElement.querySelector('.stat-detail').textContent = 
            `${formatNumber(stats.total_transactions)} total`;
        
        document.getElementById('address-count').textContent = formatNumber(stats.total_addresses);
        
        // Gas price info
        if (stats.gas_prices) {
            document.getElementById('gas-price').textContent = stats.gas_prices.average.toFixed(2) + ' Gwei';
        }
        
        // Note: Archived History and Farmer Storage are updated from Subscan API
        // in checkConsensusHealth() with real blockchain data
        
        setHealth('health-blocks', 'healthy');
        return stats;
    } catch (error) {
        console.error('Failed to fetch network stats:', error);
        setHealth('health-blocks', 'warning');
        return null;
    }
}

// Fetch network files count and stats from Auto Drive
async function fetchNetworkFilesCount() {
    const network = getNetwork();
    const naTooltip = 'Auto Drive is only available on Mainnet. Switch to Mainnet to view storage stats.';
    
    // Auto Drive only available on mainnet
    if (!network.autoDriveApi) {
        const networkFilesEl = document.getElementById('network-files');
        if (networkFilesEl) {
            networkFilesEl.textContent = 'N/A';
            networkFilesEl.title = naTooltip;
        }
        const avgSizeEl = document.getElementById('avg-file-size');
        if (avgSizeEl) {
            avgSizeEl.textContent = 'N/A';
            avgSizeEl.title = naTooltip;
        }
        const largestEl = document.getElementById('largest-file');
        if (largestEl) {
            largestEl.textContent = 'N/A';
            largestEl.title = naTooltip;
        }
        const rateEl = document.getElementById('archive-rate');
        if (rateEl) {
            rateEl.textContent = 'N/A';
            rateEl.title = naTooltip;
        }
        const totalStorageEl = document.getElementById('total-storage');
        if (totalStorageEl) {
            totalStorageEl.textContent = 'N/A';
            totalStorageEl.title = naTooltip;
        }
        const topTypeEl = document.getElementById('top-file-type');
        if (topTypeEl) {
            topTypeEl.textContent = 'N/A';
            topTypeEl.title = naTooltip;
        }
        // Mark storage as unavailable (not down) for testnet
        setHealth('health-storage', 'na');
        setHealth('health-gateway', 'na');
        console.log('Auto Drive API not available for testnet');
        return;
    }
    
    try {
        const apiKey = getApiKey();
        if (!apiKey) {
            // No API key - show N/A for Auto Drive stats
            const networkFilesEl = document.getElementById('network-files');
            if (networkFilesEl) {
                networkFilesEl.textContent = 'N/A';
                networkFilesEl.title = 'Enter API key on Home page to view Auto Drive stats';
            }
            setHealth('health-storage', 'na');
            return;
        }
        
        // Fetch a sample of 1000 files for statistics
        const response = await fetch(`${network.autoDriveApi}/objects/roots?limit=1000`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Auth-Provider': 'apikey'
            }
        });
        const data = await response.json();
        const totalCount = parseInt(data.totalCount) || 0;
        const files = data.rows || [];
        
        // Update total files count
        const networkFilesEl = document.getElementById('network-files');
        networkFilesEl.textContent = formatNumber(totalCount);
        networkFilesEl.title = ''; // Clear any testnet tooltip
        
        // API responded successfully - storage is healthy
        setHealth('health-storage', 'healthy');
        
        // Calculate additional stats from sample
        if (files.length > 0) {
            // Total storage estimate (sample avg × total count)
            let sampleSize = 0;
            let archivedCount = 0;
            let largestFile = { size: 0, name: '' };
            const mimeTypes = {};
            
            files.forEach(f => {
                const fileSize = parseInt(f.size) || 0;
                sampleSize += fileSize;
                if (f.status === 'Archived') archivedCount++;
                if (fileSize > largestFile.size) {
                    largestFile = { size: fileSize, name: f.name || 'Unnamed' };
                }
                const type = f.mimeType || 'unknown';
                mimeTypes[type] = (mimeTypes[type] || 0) + 1;
            });
            
            // Average file size
            const avgSize = sampleSize / files.length;
            const avgSizeEl = document.getElementById('avg-file-size');
            if (avgSizeEl) {
                if (avgSize >= 1e6) avgSizeEl.textContent = (avgSize / 1e6).toFixed(1) + ' MB';
                else if (avgSize >= 1e3) avgSizeEl.textContent = (avgSize / 1e3).toFixed(1) + ' KB';
                else avgSizeEl.textContent = Math.round(avgSize) + ' B';
                avgSizeEl.title = ''; // Clear testnet tooltip
            }
            
            // Largest file in sample
            const largestEl = document.getElementById('largest-file');
            if (largestEl) {
                if (largestFile.size >= 1e9) largestEl.textContent = (largestFile.size / 1e9).toFixed(2) + ' GB';
                else if (largestFile.size >= 1e6) largestEl.textContent = (largestFile.size / 1e6).toFixed(2) + ' MB';
                else if (largestFile.size >= 1e3) largestEl.textContent = (largestFile.size / 1e3).toFixed(1) + ' KB';
                else largestEl.textContent = largestFile.size + ' B';
                largestEl.title = ''; // Clear testnet tooltip
            }
            // Show largest file name in tooltip
            const largestCard = document.getElementById('largest-file-card');
            if (largestCard) {
                const shortName = largestFile.name.length > 30 ? largestFile.name.slice(0, 27) + '...' : largestFile.name;
                largestCard.title = `Largest file in sample: "${largestFile.name}" (${formatBytes(largestFile.size)})`;
            }
            
            // Estimated total storage
            const estTotalStorage = avgSize * totalCount;
            const totalStorageEl = document.getElementById('total-storage');
            if (totalStorageEl) {
                if (estTotalStorage >= 1e12) totalStorageEl.textContent = (estTotalStorage / 1e12).toFixed(2) + ' TB';
                else if (estTotalStorage >= 1e9) totalStorageEl.textContent = (estTotalStorage / 1e9).toFixed(2) + ' GB';
                else totalStorageEl.textContent = (estTotalStorage / 1e6).toFixed(2) + ' MB';
                totalStorageEl.title = ''; // Clear testnet tooltip
            }
            
            // Archive rate (% fully stored vs still processing)
            const archiveRate = (archivedCount / files.length * 100).toFixed(1);
            const archiveRateEl = document.getElementById('archive-rate');
            if (archiveRateEl) {
                archiveRateEl.textContent = archiveRate + '%';
                archiveRateEl.title = ''; // Clear testnet tooltip
            }
            
            // Top file type
            const sortedTypes = Object.entries(mimeTypes).sort((a, b) => b[1] - a[1]);
            const topTypeEl = document.getElementById('top-file-type');
            if (topTypeEl && sortedTypes.length > 0) {
                const topType = sortedTypes[0][0];
                const shortType = topType.split('/')[1] || topType;
                const pct = (sortedTypes[0][1] / files.length * 100).toFixed(0);
                topTypeEl.textContent = shortType.toUpperCase() + ' (' + pct + '%)';
                topTypeEl.title = ''; // Clear testnet tooltip
            }
            
        }
    } catch (error) {
        console.error('Failed to fetch network files:', error);
        document.getElementById('network-files').textContent = 'N/A';
        // Set all Auto Drive stats to N/A on error
        const autoStats = ['total-storage', 'avg-file-size', 'largest-file', 'archive-rate', 'top-file-type'];
        autoStats.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'N/A';
        });
        setHealth('health-storage', 'down');
    }
}

// Fetch and render file upload chart from Auto Drive
async function fetchUploadChart() {
    const network = getNetwork();
    
    // Auto Drive only available on mainnet
    if (!network.autoDriveApi) {
        console.log('Auto Drive API not available for testnet - skipping chart');
        const chartEl = document.getElementById('upload-chart');
        if (chartEl) {
            chartEl.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-secondary);">Auto Drive data only available on Mainnet</div>';
        }
        return;
    }
    
    try {
        const apiKey = getApiKey();
        if (!apiKey) {
            const chartEl = document.getElementById('upload-chart');
            if (chartEl) {
                chartEl.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-secondary);">Enter API key on Home page to view upload data</div>';
            }
            return;
        }
        
        // Fetch network files and user files
        // Note: API returns files sorted by CID, not date, so we need user files for recent data
        const [networkRes, userRes] = await Promise.all([
            fetch(`${network.autoDriveApi}/objects/roots?limit=5000`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'X-Auth-Provider': 'apikey'
                }
            }),
            fetch(`${network.autoDriveApi}/objects/roots?scope=user&limit=500`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'X-Auth-Provider': 'apikey'
                }
            })
        ]);
        
        const networkData = await networkRes.json();
        const userData = await userRes.json();
        
        const networkFiles = networkData.rows || [];
        const userFiles = userData.rows || [];
        const totalCount = networkData.totalCount || 0;
        
        // Combine and deduplicate by headCid
        const seenCids = new Set(networkFiles.map(f => f.headCid));
        const allFiles = [...networkFiles];
        userFiles.forEach(f => {
            if (!seenCids.has(f.headCid)) {
                allFiles.push(f);
                seenCids.add(f.headCid);
            }
        });
        
        console.log('Upload chart: Processing', allFiles.length, 'files,', totalCount, 'total on network');
        
        // Aggregate uploads by date (last 14 days) using LOCAL date
        const uploadsByDate = {};
        const now = new Date();
        
        // Initialize last 14 days with 0 (using local dates)
        for (let i = 13; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            // Use local date format YYYY-MM-DD
            const dateStr = date.getFullYear() + '-' + 
                String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                String(date.getDate()).padStart(2, '0');
            uploadsByDate[dateStr] = 0;
        }
        
        console.log('Date range:', Object.keys(uploadsByDate)[0], 'to', Object.keys(uploadsByDate)[13]);
        
        // Count uploads by date (convert to local date)
        let matchedCount = 0;
        allFiles.forEach(file => {
            if (file.createdAt) {
                const fileDate = new Date(file.createdAt);
                const dateStr = fileDate.getFullYear() + '-' + 
                    String(fileDate.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(fileDate.getDate()).padStart(2, '0');
                if (uploadsByDate.hasOwnProperty(dateStr)) {
                    uploadsByDate[dateStr]++;
                    matchedCount++;
                }
            }
        });
        
        console.log('Upload chart: Matched', matchedCount, 'files in last 14 days');
        
        // Convert to chart data format
        const chartData = Object.entries(uploadsByDate).map(([date, count]) => ({
            date: date,
            upload_count: count
        }));
        
        renderUploadChart(chartData, totalCount);
    } catch (error) {
        console.error('Failed to fetch upload chart:', error);
        const container = document.getElementById('upload-chart');
        if (container) container.innerHTML = '<p style="color: #888;">Unable to load upload history</p>';
    }
}

// Render file upload chart
function renderUploadChart(chartData, totalNetworkFiles) {
    const container = document.getElementById('upload-chart');
    if (!container) return;
    
    const maxUploads = Math.max(...chartData.map(d => d.upload_count), 1);
    const totalUploads = chartData.reduce((sum, d) => sum + d.upload_count, 0);
    
    let html = '<div class="chart-header">';
    html += `<span class="chart-total">${totalUploads.toLocaleString()} uploads in last 14 days (${totalNetworkFiles?.toLocaleString() || 'N/A'} total on network)</span>`;
    html += '</div>';
    html += '<div class="chart-container">';
    
    chartData.forEach((day, index) => {
        const height = Math.max((day.upload_count / maxUploads) * 100, 4);
        const date = new Date(day.date);
        const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const isToday = index === chartData.length - 1;
        
        html += `
            <div class="chart-bar-wrapper ${isToday ? 'today' : ''}" title="${dayLabel}: ${day.upload_count} files uploaded">
                <div class="chart-count">${day.upload_count}</div>
                <div class="chart-bar upload-bar" style="height: ${height}%"></div>
                <div class="chart-label">${dayLabel}</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// Fetch and render transaction chart
async function fetchTransactionChart() {
    const network = getNetwork();
    try {
        // Get chart data and current stats
        const [chartResponse, statsResponse] = await Promise.all([
            fetch(`${network.explorerApi}/stats/charts/transactions`),
            fetch(`${network.explorerApi}/stats`)
        ]);
        
        const chartData = await chartResponse.json();
        const stats = await statsResponse.json();
        
        if (chartData.chart_data && chartData.chart_data.length > 0) {
            // Get last 13 days from chart API (it often lags by 1 day)
            let days = chartData.chart_data.slice(0, 13).reverse();
            
            // Add today's data from stats if not already included
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const lastChartDate = days.length > 0 ? days[days.length - 1].date : null;
            
            if (lastChartDate !== today && stats.transactions_today !== undefined) {
                days.push({
                    date: today,
                    transaction_count: stats.transactions_today
                });
            }
            
            renderChart(days);
        }
    } catch (error) {
        console.error('Failed to fetch transaction chart:', error);
    }
}

// Render simple bar chart
function renderChart(chartData) {
    const container = document.getElementById('tx-chart');
    if (!container) return;
    
    // Ensure all transaction counts are valid numbers
    const maxTx = Math.max(...chartData.map(d => parseInt(d.transaction_count) || 0), 1);
    const totalTx = chartData.reduce((sum, d) => sum + (parseInt(d.transaction_count) || 0), 0);
    
    let html = '<div class="chart-header">';
    html += `<span class="chart-total">${totalTx.toLocaleString()} transactions in the last 14 days</span>`;
    html += '</div>';
    html += '<div class="chart-container">';
    
    chartData.forEach((day, index) => {
        const txCount = parseInt(day.transaction_count) || 0;
        const height = Math.max((txCount / maxTx) * 100, 4);
        const date = new Date(day.date);
        const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const isToday = index === chartData.length - 1;
        
        html += `
            <div class="chart-bar-wrapper ${isToday ? 'today' : ''}" title="${dayLabel}: ${txCount.toLocaleString()} transactions">
                <div class="chart-count">${txCount.toLocaleString()}</div>
                <div class="chart-bar" style="height: ${height}%"></div>
                <div class="chart-label">${dayLabel}</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// Fetch recent blocks from Blockscout
async function fetchRecentBlocks() {
    const network = getNetwork();
    try {
        const response = await fetch(`${network.explorerApi}/main-page/blocks`);
        const blocks = await response.json();
        
        const tbody = document.getElementById('blocks-table-body');
        tbody.innerHTML = '';
        
        blocks.slice(0, 10).forEach(block => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="${network.explorerUrl}/block/${block.height}" target="_blank">#${formatNumber(block.height)}</a></td>
                <td>${timeAgoISO(block.timestamp)}</td>
                <td>${block.transaction_count || 0}</td>
                <td>${block.size ? formatNumber(block.size) + ' B' : '-'}</td>
                <td title="${block.hash}">${truncateHash(block.hash)}</td>
            `;
            tbody.appendChild(row);
        });
        
        document.getElementById('blocks-loading').classList.add('hidden');
        document.getElementById('recent-blocks').classList.remove('hidden');
        setHealth('health-blocks', 'healthy');
        
        return blocks;
    } catch (error) {
        console.error('Failed to fetch blocks:', error);
        document.getElementById('blocks-loading').textContent = 'Failed to load blocks';
        setHealth('health-blocks', 'down');
        return null;
    }
}

// Check gateway health
async function checkGatewayHealth() {
    const network = getNetwork();
    try {
        await fetch(`${network.gateway}/`, { method: 'HEAD', mode: 'no-cors' });
        setHealth('health-gateway', 'healthy');
        return true;
    } catch (error) {
        setHealth('health-gateway', 'down');
        return false;
    }
}

// Check consensus chain health via Subscan and update network stats
async function checkConsensusHealth() {
    const network = getNetwork();
    try {
        const response = await fetch(`${network.subscanApi}/api/scan/metadata`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await response.json();
        if (data.code === 0 && data.data) {
            setHealth('health-consensus', 'healthy');
            
            // Update Archived History from real blockchain data
            const historySize = parseInt(data.data.blockChainHistorySize) || 0;
            if (historySize > 0) {
                document.getElementById('archived-size').textContent = formatBytes(historySize);
            }
            
            // Update Farmer Storage from real consensus space data
            const consensusSpace = parseInt(data.data.consensusSpace) || 0;
            if (consensusSpace > 0) {
                // Format as PB with 1 decimal
                const petabytes = consensusSpace / 1e15;
                document.getElementById('farmer-storage').textContent = petabytes.toFixed(1) + ' PB';
            }
            
            return true;
        }
        setHealth('health-consensus', 'down');
        return false;
    } catch (error) {
        console.error('Consensus health check failed:', error);
        setHealth('health-consensus', 'down');
        return false;
    }
}

// Check RPC node health
async function checkRpcHealth() {
    const network = getNetwork();
    try {
        const response = await fetch(network.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1
            })
        });
        const data = await response.json();
        if (data.result) {
            setHealth('health-rpc', 'healthy');
            return true;
        }
        setHealth('health-rpc', 'down');
        return false;
    } catch (error) {
        // Try alternative RPC endpoint
        try {
            const altResponse = await fetch(network.altRpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1
                })
            });
            const altData = await altResponse.json();
            if (altData.result) {
                setHealth('health-rpc', 'healthy');
                return true;
            }
        } catch (e) {}
        console.error('RPC health check failed:', error);
        setHealth('health-rpc', 'down');
        return false;
    }
}

// Update health message
function updateHealthMessage() {
    const blocks = document.getElementById('health-blocks');
    const consensus = document.getElementById('health-consensus');
    const storage = document.getElementById('health-storage');
    const gateway = document.getElementById('health-gateway');
    const rpc = document.getElementById('health-rpc');
    
    const allIndicators = [blocks, consensus, storage, gateway, rpc];
    
    // Count healthy services
    const healthyCount = allIndicators.filter(
        el => el?.classList.contains('healthy')
    ).length;
    
    // Count N/A services (not available on this network, not down)
    const naCount = allIndicators.filter(
        el => el?.classList.contains('na')
    ).length;
    
    // Total available services (exclude N/A from total)
    const availableCount = allIndicators.length - naCount;
    
    const messageEl = document.getElementById('health-message');
    
    if (messageEl) {
        if (availableCount === 0) {
            // All services N/A (shouldn't happen)
            messageEl.textContent = 'No services available to monitor on this network.';
            messageEl.className = 'health-message';
        } else if (healthyCount === availableCount) {
            // All available services are healthy
            if (naCount > 0) {
                messageEl.textContent = `All ${healthyCount} available systems operational. ${naCount} service${naCount > 1 ? 's' : ''} not available on Testnet.`;
            } else {
                messageEl.textContent = 'All systems operational. Your data is being actively stored and proven.';
            }
            messageEl.className = 'health-message healthy';
        } else if (healthyCount >= Math.ceil(availableCount * 0.6)) {
            messageEl.textContent = `${healthyCount}/${availableCount} systems healthy. Some services may have degraded performance.`;
            messageEl.className = 'health-message warning';
        } else {
            messageEl.textContent = `${healthyCount}/${availableCount} systems healthy. Network may be experiencing issues.`;
            messageEl.className = 'health-message warning';
        }
    }
}

// Refresh all stats
async function refreshStats() {
    const refreshBtn = document.getElementById('refreshButton');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
    }
    
    setHealth('health-blocks', 'loading');
    setHealth('health-consensus', 'loading');
    setHealth('health-storage', 'loading');
    setHealth('health-gateway', 'loading');
    setHealth('health-rpc', 'loading');
    
    await Promise.all([
        fetchNetworkStats(),
        fetchRecentBlocks(),
        fetchTransactionChart(),
        fetchUploadChart(),
        fetchNetworkFilesCount(),
        checkGatewayHealth(),
        checkConsensusHealth(),
        checkRpcHealth(),
        fetchArweaveCost()
    ]);
    
    updateHealthMessage();
    
    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh Now';
    }
}

// Switch network and refresh stats
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
    
    // Clear health message immediately while loading
    const messageEl = document.getElementById('health-message');
    if (messageEl) {
        messageEl.textContent = 'Checking network health...';
        messageEl.className = 'health-message';
    }
    
    // Refresh all stats with new network
    refreshStats();
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
    
    refreshStats();
    setInterval(refreshStats, 30000);
    
    const refreshBtn = document.getElementById('refreshButton');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshStats);
    }
});
