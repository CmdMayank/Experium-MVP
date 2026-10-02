const CONFIG = {
    SepoliaChainId: '0xaa36a7',
    DIDRegistryAddress: "0x0000000000000000000000000000000000000000", // Placeholder
    AssetNFTAddress: "0x0000000000000000000000000000000000000000", // Placeholder
    DIDRegistryABI: [
        "function createDID() external",
        "function hasDID(address a) external view returns (bool)",
        "function didOf(address) view returns (string)",
        "event DIDCreated(address indexed owner, string did, uint256 time)"
    ],
    AssetNFTABI: [
        "function mint(address to, string calldata uri, bool sb) external returns (uint256)",
        "function ownerOf(uint256 id) view returns (address)",
        "function tokenURI(uint256 id) view returns (string)",
        "function issuerOf(uint256 id) view returns (address)",
        "function grantRole(bytes32 role, address account) external",
        "function revokeRole(bytes32 role, address account) external",
        "event AssetMinted(uint256 indexed tokenId, address indexed to, address indexed issuer, string uri)"
    ]
};

// UI Elements
const modeSwitch = document.getElementById('mode-switch');
const connectBtn = document.getElementById('connect-btn');
const toastContainer = document.getElementById('toast-container');
const logsContainer = document.getElementById('audit-logs');

// State
let isLiveMode = false;
let demoAccount = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
let liveProvider = null;
let liveSigner = null;
let liveAccount = null;

// Demo State
const demoData = {
    dids: {}, // address -> did string
    assets: {}, // id -> {owner, uri, issuer, sb}
    roles: {}, // role -> Set of addresses
    logs: [],
    nextAssetId: 1
};

// Setup Listeners
document.addEventListener('DOMContentLoaded', () => {
    modeSwitch.addEventListener('change', toggleMode);
    connectBtn.addEventListener('click', connectWallet);
    
    document.getElementById('btn-create-did').addEventListener('click', handleCreateDID);
    document.getElementById('btn-read-did').addEventListener('click', handleReadDID);
    document.getElementById('btn-mint').addEventListener('click', handleMint);
    document.getElementById('btn-read-asset').addEventListener('click', handleReadAsset);
    document.getElementById('btn-grant-role').addEventListener('click', () => handleRole('grant'));
    document.getElementById('btn-revoke-role').addEventListener('click', () => handleRole('revoke'));
    document.getElementById('btn-refresh-logs').addEventListener('click', fetchLogs);

    // Initial load
    updateUI();
});

// Toast System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'error' ? '⚠️' : '✅'}</span>
        <div>${message}</div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Mode Toggle
async function toggleMode(e) {
    isLiveMode = e.target.checked;
    if (isLiveMode) {
        connectBtn.classList.remove('disabled');
        connectBtn.textContent = 'Connect MetaMask';
        if (window.ethereum && liveAccount) {
            connectBtn.textContent = `Connected: ${liveAccount.slice(0,6)}...${liveAccount.slice(-4)}`;
        }
    } else {
        connectBtn.classList.add('disabled');
        connectBtn.textContent = 'Demo Wallet Connected';
    }
    updateUI();
    fetchLogs();
}

async function connectWallet() {
    if (!isLiveMode) return;
    
    if (!window.ethereum) {
        showToast("MetaMask is not installed. Please install it to use Live mode.", "error");
        modeSwitch.checked = false;
        toggleMode({target: {checked: false}});
        return;
    }

    try {
        liveProvider = new ethers.BrowserProvider(window.ethereum);
        const network = await liveProvider.getNetwork();
        
        if (network.chainId !== BigInt(CONFIG.SepoliaChainId)) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: CONFIG.SepoliaChainId }],
                });
                liveProvider = new ethers.BrowserProvider(window.ethereum);
            } catch (switchError) {
                if (switchError.code === 4902) {
                    showToast("Sepolia network not found in your wallet.", "error");
                } else {
                    throw switchError;
                }
                return;
            }
        }

        const accounts = await liveProvider.send("eth_requestAccounts", []);
        liveAccount = accounts[0];
        liveSigner = await liveProvider.getSigner();
        
        connectBtn.textContent = `Connected: ${liveAccount.slice(0,6)}...${liveAccount.slice(-4)}`;
        showToast("Wallet connected successfully on Sepolia.");
        fetchLogs();
    } catch (err) {
        console.error(err);
        showToast(err.message || "Failed to connect wallet", "error");
    }
}

function updateUI() {
    document.getElementById('did-result').classList.add('hidden');
    document.getElementById('asset-result').classList.add('hidden');
}

// Ensure Signer
function checkLiveSetup() {
    if (isLiveMode && !liveSigner) {
        showToast("Please connect your wallet first.", "error");
        return false;
    }
    return true;
}

// DID Management
async function handleCreateDID() {
    if (!isLiveMode) {
        // Demo Mode
        if (demoData.dids[demoAccount]) {
            return showToast("DID already exists for demo account", "error");
        }
        const didStr = `did:ethr:${demoAccount}`;
        demoData.dids[demoAccount] = didStr;
        
        demoData.logs.unshift({
            type: 'DIDCreated',
            owner: demoAccount,
            did: didStr,
            time: new Date().toLocaleString()
        });
        showToast("Demo DID Created: " + didStr);
        fetchLogs();
        return;
    }

    // Live Mode
    if (!checkLiveSetup()) return;
    try {
        const contract = new ethers.Contract(CONFIG.DIDRegistryAddress, CONFIG.DIDRegistryABI, liveSigner);
        const tx = await contract.createDID();
        showToast("Transaction submitted: " + tx.hash);
        await tx.wait();
        showToast("DID Created successfully!");
        fetchLogs();
    } catch (err) {
        showToast("Failed to create DID: " + (err.reason || err.message), "error");
    }
}

async function handleReadDID() {
    const address = document.getElementById('input-did-address').value.trim();
    if (!address) return showToast("Please enter an address", "error");
    const resBox = document.getElementById('did-result');
    
    if (!isLiveMode) {
        // Demo Mode
        const did = demoData.dids[address];
        resBox.classList.remove('hidden');
        resBox.innerHTML = did ? `DID: ${did}` : `No DID found for this address.`;
        return;
    }

    // Live Mode
    if (!checkLiveSetup()) return;
    try {
        const contract = new ethers.Contract(CONFIG.DIDRegistryAddress, CONFIG.DIDRegistryABI, liveProvider);
        const has = await contract.hasDID(address);
        resBox.classList.remove('hidden');
        if (has) {
            const did = await contract.didOf(address);
            resBox.innerHTML = `DID: ${did}`;
        } else {
            resBox.innerHTML = `No DID found.`;
        }
    } catch (err) {
        showToast("Error reading DID: " + err.message, "error");
    }
}

// Asset Management
async function handleMint() {
    const to = document.getElementById('mint-to').value.trim();
    const uri = document.getElementById('mint-uri').value.trim();
    const sb = document.getElementById('mint-sb').checked;

    if (!to || !uri) return showToast("Please fill recipient and URI", "error");

    if (!isLiveMode) {
        // Demo mode logic
        if (!demoData.dids[to]) return showToast("Demo Recipient has no DID", "error");
        
        const id = demoData.nextAssetId++;
        demoData.assets[id] = { owner: to, uri, issuer: demoAccount, sb };
        demoData.logs.unshift({
            type: 'AssetMinted',
            tokenId: id,
            to: to,
            issuer: demoAccount,
            uri: uri
        });
        showToast(`Demo Asset #${id} Minted!`);
        fetchLogs();
        return;
    }

    // Live Mode
    if (!checkLiveSetup()) return;
    try {
        const contract = new ethers.Contract(CONFIG.AssetNFTAddress, CONFIG.AssetNFTABI, liveSigner);
        const tx = await contract.mint(to, uri, sb);
        showToast("Transaction submitted: " + tx.hash);
        await tx.wait();
        showToast("Asset Minted successfully!");
        fetchLogs();
    } catch (err) {
        showToast("Failed to mint: " + (err.reason || err.message), "error");
    }
}

async function handleReadAsset() {
    const id = document.getElementById('input-token-id').value;
    if (!id) return showToast("Please enter Token ID", "error");
    const resBox = document.getElementById('asset-result');

    if (!isLiveMode) {
        // Demo
        const asset = demoData.assets[id];
        resBox.classList.remove('hidden');
        if (asset) {
            resBox.innerHTML = `Owner: ${asset.owner}<br>Issuer: ${asset.issuer}<br>URI: ${asset.uri}<br>Soulbound: ${asset.sb}`;
        } else {
            resBox.innerHTML = `Asset #${id} does not exist.`;
        }
        return;
    }

    // Live Mode
    if (!checkLiveSetup()) return;
    try {
        const contract = new ethers.Contract(CONFIG.AssetNFTAddress, CONFIG.AssetNFTABI, liveProvider);
        const owner = await contract.ownerOf(id);
        const issuer = await contract.issuerOf(id);
        const uri = await contract.tokenURI(id);
        resBox.classList.remove('hidden');
        resBox.innerHTML = `Owner: ${owner}<br>Issuer: ${issuer}<br>URI: ${uri}`;
    } catch (err) {
        resBox.classList.remove('hidden');
        resBox.innerHTML = `Asset not found or error occurred.`;
        showToast("Error reading asset: " + err.message, "error");
    }
}

// Access Control
async function handleRole(action) {
    const roleName = document.getElementById('role-select').value;
    const target = document.getElementById('role-address').value.trim();
    if (!target) return showToast("Please enter target address", "error");

    // Ethers v6 hashing for roles
    let roleHash = ethers.id(roleName); // default for MANAGER, AUDITOR
    if (roleName === "DEFAULT_ADMIN_ROLE") {
        roleHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    }

    if (!isLiveMode) {
        // Demo mode
        if (!demoData.roles[roleName]) demoData.roles[roleName] = new Set();
        if (action === 'grant') {
            demoData.roles[roleName].add(target);
            showToast(`Demo: Granted ${roleName} to ${target.slice(0,6)}...`);
        } else {
            demoData.roles[roleName].delete(target);
            showToast(`Demo: Revoked ${roleName} from ${target.slice(0,6)}...`);
        }
        return;
    }

    // Live Mode
    if (!checkLiveSetup()) return;
    try {
        const contract = new ethers.Contract(CONFIG.AssetNFTAddress, CONFIG.AssetNFTABI, liveSigner);
        const tx = action === 'grant' 
            ? await contract.grantRole(roleHash, target)
            : await contract.revokeRole(roleHash, target);
        
        showToast("Transaction submitted: " + tx.hash);
        await tx.wait();
        showToast(`Role ${action} successful!`);
    } catch (err) {
        showToast(`Failed to ${action} role: ` + (err.reason || err.message), "error");
    }
}

// Audit Log Fetching
async function fetchLogs() {
    logsContainer.innerHTML = '';

    if (!isLiveMode) {
        // Demo Logs
        if (demoData.logs.length === 0) {
            logsContainer.innerHTML = '<div class="log-placeholder">No events found in demo mode.</div>';
            return;
        }
        demoData.logs.forEach(log => {
            const div = document.createElement('div');
            div.className = `log-item ${log.type === 'AssetMinted' ? 'mint' : ''}`;
            
            if (log.type === 'DIDCreated') {
                div.innerHTML = `
                    <div class="log-meta"><span>DID Created</span> <span>${log.time}</span></div>
                    <div class="log-content"><strong>Owner:</strong> ${log.owner}<br><strong>DID:</strong> ${log.did}</div>
                `;
            } else {
                div.innerHTML = `
                    <div class="log-meta"><span>Asset Minted #${log.tokenId}</span> <span>Demo Time</span></div>
                    <div class="log-content"><strong>To:</strong> ${log.to}<br><strong>Issuer:</strong> ${log.issuer}<br><strong>URI:</strong> ${log.uri}</div>
                `;
            }
            logsContainer.appendChild(div);
        });
        return;
    }

    // Live Mode Logs
    if (!liveProvider) {
        logsContainer.innerHTML = '<div class="log-placeholder">Connect wallet to view live logs.</div>';
        return;
    }

    try {
        logsContainer.innerHTML = '<div class="log-placeholder">Loading events from Sepolia...</div>';
        
        const didContract = new ethers.Contract(CONFIG.DIDRegistryAddress, CONFIG.DIDRegistryABI, liveProvider);
        const assetContract = new ethers.Contract(CONFIG.AssetNFTAddress, CONFIG.AssetNFTABI, liveProvider);
        
        // Use a small block range for demo purposes or 'earliest' (can be slow on public RPCs)
        const currentBlock = await liveProvider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 50000); 

        const didFilter = didContract.filters.DIDCreated();
        const assetFilter = assetContract.filters.AssetMinted();

        const [didEvents, assetEvents] = await Promise.all([
            didContract.queryFilter(didFilter, fromBlock, 'latest').catch(() => []),
            assetContract.queryFilter(assetFilter, fromBlock, 'latest').catch(() => [])
        ]);

        const allEvents = [
            ...didEvents.map(e => ({ type: 'did', event: e, blockNumber: e.blockNumber })),
            ...assetEvents.map(e => ({ type: 'asset', event: e, blockNumber: e.blockNumber }))
        ].sort((a, b) => b.blockNumber - a.blockNumber); // Descending

        logsContainer.innerHTML = '';
        if (allEvents.length === 0) {
            logsContainer.innerHTML = '<div class="log-placeholder">No events found in recent blocks.</div>';
            return;
        }

        allEvents.forEach(item => {
            const e = item.event;
            const div = document.createElement('div');
            
            if (item.type === 'did') {
                div.className = 'log-item';
                div.innerHTML = `
                    <div class="log-meta"><span>DID Created</span> <span>Block: ${item.blockNumber}</span></div>
                    <div class="log-content">
                        <strong>Owner:</strong> ${e.args[0]}<br>
                        <strong>DID:</strong> ${e.args[1]}
                    </div>
                `;
            } else {
                div.className = 'log-item mint';
                div.innerHTML = `
                    <div class="log-meta"><span>Asset Minted #${e.args[0].toString()}</span> <span>Block: ${item.blockNumber}</span></div>
                    <div class="log-content">
                        <strong>To:</strong> ${e.args[1]}<br>
                        <strong>Issuer:</strong> ${e.args[2]}<br>
                        <strong>URI:</strong> ${e.args[3]}
                    </div>
                `;
            }
            logsContainer.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        logsContainer.innerHTML = `<div class="log-placeholder" style="color:var(--danger)">Error loading logs: ${err.message}</div>`;
    }
}
