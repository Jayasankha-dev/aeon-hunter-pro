/**
 * AEON HUNTER LITE - DASHBOARD ENGINE (V1.2)
 * Optimized for English Standard & Chrome Security Policy
 * Core Modules: Traffic Hub, Recon DB, Request Repeater
 */

const SystemState = {
    isProcessing: false,
    reconHistory: []
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Core Visuals
    updateClock();
    setInterval(updateClock, 1000);
    
    // 2. Tab Navigation System
    initializeTabs();
    
    // 3. Traffic Hub Listeners
    document.getElementById('traffic-filter')?.addEventListener('input', applyTrafficFilter);
    document.getElementById('btn-clear-traffic')?.addEventListener('click', () => {
        const table = document.getElementById('traffic-table');
        if(table) table.innerHTML = "";
    });

    // 4. Recon Database Listeners
    document.getElementById('btn-deep-scan')?.addEventListener('click', runDeepRecon);
    document.getElementById('btn-download-recon')?.addEventListener('click', exportReconDB);

    // 5. Request Repeater Listeners
    document.getElementById('btn-fire-request')?.addEventListener('click', fireRepeaterRequest);

    // 6. Global Background Listener for Traffic
    initializeTrafficListener();
});

/**
 * TAB NAVIGATION SYSTEM
 * Manages switching between Dashboard, Network, Recon, Repeater
 */
function initializeTabs() {
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-tab');
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetId) {
                    content.classList.add('active');
                }
            });
            
            const titleEl = document.getElementById('current-tab-title');
            if (titleEl) {
                titleEl.innerText = targetId.toUpperCase().replace('_', ' ');
            }
        });
    });
}

/**
 * TRAFFIC INTERCEPTOR DISPLAY
 * Renders network requests from background.js
 */
function initializeTrafficListener() {
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "NEW_REQUEST") {
            const tableBody = document.getElementById('traffic-table');
            if (!tableBody) return;

            const row = tableBody.insertRow(0);
            const { method, url } = message.data;
            const type = (message.data.resourceType || "other").toLowerCase();

            row.setAttribute('data-url', url.toLowerCase());
            row.innerHTML = `
                <td style="font-weight:bold; color: #f85149;">${method}</td>
                <td style="opacity:0.7;">${type.toUpperCase()}</td>
                <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${url}</td>
                <td><button class="btn-mini btn-rep-shortcut">REPLAY</button></td>
            `;

            row.querySelector('.btn-rep-shortcut').addEventListener('click', () => {
                sendToRepeater(url, method);
            });

            if (tableBody.rows.length > 50) tableBody.deleteRow(-1);
        }
    });
}

function applyTrafficFilter() {
    const searchTerm = document.getElementById('traffic-filter').value.toLowerCase();
    const rows = document.querySelectorAll('#traffic-table tr');
    rows.forEach(row => {
        const url = row.getAttribute('data-url') || "";
        row.style.display = url.includes(searchTerm) ? "" : "none";
    });
}

/**
 * RECONNAISSANCE ENGINE
 * Scans the active tab via Content Script
 */
async function runDeepRecon() {
    const btn = document.getElementById('btn-deep-scan');
    btn.innerText = "SCANNING...";
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs[0] || tabs[0].url.startsWith('chrome://')) {
            alert("Cannot scan system pages. Please visit a website.");
            btn.innerText = "START_HUNT";
            return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, {action: "GET_RECON_DATA"}, (response) => {
            btn.innerText = "START_HUNT";
            if (!response) {
                alert("RECON_FAILED: Content script not responding. Refresh target page.");
                return;
            }

            // Populate Recon Table
            response.params.forEach(p => addToReconTable("PARAM", p, "MEDIUM"));
            if(response.sinks) response.sinks.forEach(s => addToReconTable("SINK", s, "HIGH"));
            
            // Update Stats Safely
            const paramEl = document.getElementById('count-params');
            const linkEl = document.getElementById('count-links');
            if(paramEl) paramEl.innerText = response.params.length;
            if(linkEl) linkEl.innerText = (response.links ? response.links.length : 0);
        });
    });
}

function addToReconTable(type, data, risk) {
    const table = document.getElementById('recon-db-body');
    if (!table) return;
    
    const row = table.insertRow(0);
    row.innerHTML = `
        <td>${type}</td>
        <td style="max-width:250px; overflow:hidden; font-size:11px;">${data}</td>
        <td style="color:${risk === 'HIGH' ? '#f85149' : '#e3b341'}">${risk}</td>
        <td><button class="btn-mini btn-del-row">DEL</button></td>
    `;

    // Security Fix: Add event listener instead of onclick
    row.querySelector('.btn-del-row').addEventListener('click', () => {
        row.remove();
    });

    SystemState.reconHistory.push({ type, data, risk, time: new Date().toISOString() });
}

/**
 * REQUEST REPEATER
 */
function sendToRepeater(url, method) {
    const repeaterLink = document.querySelector('[data-tab="repeater"]');
    if (repeaterLink) repeaterLink.click();
    
    const urlInput = document.getElementById('rep-url');
    const methodInput = document.getElementById('rep-method');
    if(urlInput) urlInput.value = url;
    if(methodInput) methodInput.value = method;
}

async function fireRepeaterRequest() {
    const url = document.getElementById('rep-url').value;
    const method = document.getElementById('rep-method').value;
    const display = document.getElementById('rep-response-body');
    const statusLabel = document.getElementById('rep-response-status');

    if (!url) return;
    display.innerText = ">> EXECUTING REQUEST...";

    try {
        const response = await fetch(url, { method });
        const text = await response.text();
        statusLabel.innerText = `STATUS: ${response.status} ${response.statusText}`;
        display.innerText = text.substring(0, 5000); 
    } catch (err) {
        display.innerText = `[UPLINK_ERROR]: ${err.message}`;
        statusLabel.innerText = "STATUS: FAILED";
    }
}

/**
 * UTILITIES
 */
function updateClock() {
    const el = document.getElementById('clock');
    if(el) el.innerText = new Date().toLocaleTimeString();
}

function exportReconDB() {
    if (SystemState.reconHistory.length === 0) return alert("No data to export.");
    const csv = "TYPE,DATA,RISK,TIME\n" + SystemState.reconHistory.map(h => `${h.type},${h.data},${h.risk},${h.time}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `aeon_recon_${Date.now()}.csv`; 
    a.click();
}