// Network Stats for Autonomys/AI3 using Blockscout Explorer API
const EXPLORER_API = 'https://explorer.auto-evm.mainnet.autonomys.xyz/api/v2';
const GATEWAY_URL = 'https://gateway.autonomys.xyz';

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

// Set health indicator
function setHealth(elementId, status) {
    const el = document.getElementById(elementId);
    if (el) el.className = 'health-dot ' + status;
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

// Fetch network stats from Blockscout
async function fetchNetworkStats() {
    try {
        const response = await fetch(`${EXPLORER_API}/stats`);
        const stats = await response.json();
        
        // Update all stats cards with real data
        document.getElementById('latest-block').textContent = formatNumber(stats.total_blocks);
        document.getElementById('avg-block-time').textContent = (stats.average_block_time / 1000).toFixed(1);
        document.getElementById('total-supply').textContent = '$' + parseFloat(stats.coin_price).toFixed(4);
        
        // Price change indicator
        const priceChange = stats.coin_price_change_percentage;
        const priceDetail = document.getElementById('total-supply').parentElement.querySelector('.stat-detail');
        if (priceChange >= 0) {
            priceDetail.innerHTML = `<span style="color: #4ade80">▲ ${priceChange.toFixed(2)}%</span> 24h change`;
        } else {
            priceDetail.innerHTML = `<span style="color: #f87171">▼ ${Math.abs(priceChange).toFixed(2)}%</span> 24h change`;
        }
        
        document.getElementById('tx-count').textContent = stats.transactions_today;
        document.getElementById('tx-count').parentElement.querySelector('.stat-detail').textContent = 
            `${formatNumber(stats.total_transactions)} total`;
        
        document.getElementById('address-count').textContent = formatNumber(stats.total_addresses);
        
        // Gas price info
        if (stats.gas_prices) {
            document.getElementById('gas-price').textContent = stats.gas_prices.average.toFixed(2) + ' Gwei';
        }
        
        // Calculate archived history estimate based on blocks
        // Autonomys archives ~35KB per block on average
        const archivedBytes = stats.total_blocks * 35 * 1024;
        document.getElementById('archived-size').textContent = formatBytes(archivedBytes);
        
        // Farmer storage - Autonomys mainnet has 50+ PB pledged
        document.getElementById('farmer-storage').textContent = '50+ PB';
        
        // Update storage cost calculator with live price
        updateStorageCosts(parseFloat(stats.coin_price));
        
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
    try {
        const API_KEY = '8e2d61fa4df443b9a44d9f358b861792';
        
        // Fetch a sample of 1000 files for statistics
        const response = await fetch('https://mainnet.auto-drive.autonomys.xyz/api/objects/roots?limit=1000', {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'X-Auth-Provider': 'apikey'
            }
        });
        const data = await response.json();
        const totalCount = parseInt(data.totalCount) || 0;
        const files = data.rows || [];
        
        // Update total files count
        document.getElementById('network-files').textContent = formatNumber(totalCount);
        
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
            }
            
            // Largest file in sample
            const largestEl = document.getElementById('largest-file');
            if (largestEl) {
                if (largestFile.size >= 1e9) largestEl.textContent = (largestFile.size / 1e9).toFixed(2) + ' GB';
                else if (largestFile.size >= 1e6) largestEl.textContent = (largestFile.size / 1e6).toFixed(2) + ' MB';
                else if (largestFile.size >= 1e3) largestEl.textContent = (largestFile.size / 1e3).toFixed(1) + ' KB';
                else largestEl.textContent = largestFile.size + ' B';
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
            }
            
            // Archive rate (% fully stored vs still processing)
            const archiveRate = (archivedCount / files.length * 100).toFixed(1);
            const archiveRateEl = document.getElementById('archive-rate');
            if (archiveRateEl) archiveRateEl.textContent = archiveRate + '%';
            
            // Top file type
            const sortedTypes = Object.entries(mimeTypes).sort((a, b) => b[1] - a[1]);
            const topTypeEl = document.getElementById('top-file-type');
            if (topTypeEl && sortedTypes.length > 0) {
                const topType = sortedTypes[0][0];
                const shortType = topType.split('/')[1] || topType;
                const pct = (sortedTypes[0][1] / files.length * 100).toFixed(0);
                topTypeEl.textContent = shortType.toUpperCase() + ' (' + pct + '%)';
            }
            
            // Storage network is healthy
            setHealth('health-storage', 'healthy');
        } else {
            setHealth('health-storage', 'warning');
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
        setHealth('health-storage', 'error');
    }
}

// Fetch and render file upload chart from Auto Drive
async function fetchUploadChart() {
    try {
        const API_KEY = '8e2d61fa4df443b9a44d9f358b861792';
        
        // Fetch network files and user files
        // Note: API returns files sorted by CID, not date, so we need user files for recent data
        const [networkRes, userRes] = await Promise.all([
            fetch('https://mainnet.auto-drive.autonomys.xyz/api/objects/roots?limit=5000', {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'X-Auth-Provider': 'apikey'
                }
            }),
            fetch('https://mainnet.auto-drive.autonomys.xyz/api/objects/roots?scope=user&limit=500', {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
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
    try {
        // Get chart data and current stats
        const [chartResponse, statsResponse] = await Promise.all([
            fetch(`${EXPLORER_API}/stats/charts/transactions`),
            fetch(`${EXPLORER_API}/stats`)
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
    
    const maxTx = Math.max(...chartData.map(d => d.transaction_count), 1);
    const totalTx = chartData.reduce((sum, d) => sum + d.transaction_count, 0);
    
    let html = '<div class="chart-header">';
    html += `<span class="chart-total">${totalTx} transactions in the last 14 days</span>`;
    html += '</div>';
    html += '<div class="chart-container">';
    
    chartData.forEach((day, index) => {
        const height = Math.max((day.transaction_count / maxTx) * 100, 4);
        const date = new Date(day.date);
        const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const isToday = index === chartData.length - 1;
        
        html += `
            <div class="chart-bar-wrapper ${isToday ? 'today' : ''}" title="${dayLabel}: ${day.transaction_count} transactions">
                <div class="chart-count">${day.transaction_count}</div>
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
    try {
        const response = await fetch(`${EXPLORER_API}/main-page/blocks`);
        const blocks = await response.json();
        
        const tbody = document.getElementById('blocks-table-body');
        tbody.innerHTML = '';
        
        blocks.slice(0, 10).forEach(block => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="https://explorer.auto-evm.mainnet.autonomys.xyz/block/${block.height}" target="_blank">#${formatNumber(block.height)}</a></td>
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
        setHealth('health-blocks', 'warning');
        return null;
    }
}

// Check gateway health
async function checkGatewayHealth() {
    try {
        await fetch(`${GATEWAY_URL}/`, { method: 'HEAD', mode: 'no-cors' });
        setHealth('health-gateway', 'healthy');
        return true;
    } catch (error) {
        setHealth('health-gateway', 'warning');
        return false;
    }
}

// Check consensus chain health via Subscan
async function checkConsensusHealth() {
    try {
        const response = await fetch('https://autonomys.api.subscan.io/api/scan/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await response.json();
        if (data.code === 0 && data.data) {
            setHealth('health-consensus', 'healthy');
            return true;
        }
        setHealth('health-consensus', 'warning');
        return false;
    } catch (error) {
        console.error('Consensus health check failed:', error);
        setHealth('health-consensus', 'error');
        return false;
    }
}

// Check RPC node health
async function checkRpcHealth() {
    try {
        const response = await fetch('https://auto-evm.mainnet.autonomys.xyz/ws', {
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
        setHealth('health-rpc', 'warning');
        return false;
    } catch (error) {
        // Try alternative RPC endpoint
        try {
            const altResponse = await fetch('https://rpc.auto-evm.mainnet.autonomys.xyz', {
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
        setHealth('health-rpc', 'error');
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
    
    const healthyCount = [blocks, consensus, storage, gateway, rpc].filter(
        el => el?.classList.contains('healthy')
    ).length;
    const totalCount = 5;
    
    const messageEl = document.getElementById('health-message');
    
    if (messageEl) {
        if (healthyCount === totalCount) {
            messageEl.textContent = 'All systems operational. Your data is being actively stored and proven.';
            messageEl.className = 'health-message healthy';
        } else if (healthyCount >= 3) {
            messageEl.textContent = `${healthyCount}/${totalCount} systems healthy. Some services may have degraded performance.`;
            messageEl.className = 'health-message warning';
        } else {
            messageEl.textContent = `${healthyCount}/${totalCount} systems healthy. Network may be experiencing issues.`;
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
        checkRpcHealth()
    ]);
    
    updateHealthMessage();
    
    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh Now';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    refreshStats();
    setInterval(refreshStats, 30000);
    
    const refreshBtn = document.getElementById('refreshButton');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshStats);
    }
});
