/**
 * AEON HUNTER LITE - BACKGROUND CORE (V1.0)
 * Core Hub for Traffic Interception & Repeater Proxy
 * Optimized for English Language Standard
 */

// 1. Sidebar Configuration
// Opens the extension dashboard when the icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("[AEON LITE] SidePanel Setup Error:", error));

/**
 * 2. Traffic Interceptor
 * Monitors network requests and sends simplified data to the dashboard.
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const requestData = {
            type: "NEW_REQUEST",
            data: {
                url: details.url,
                method: details.method,
                resourceType: details.type,
                timestamp: new Date().toLocaleTimeString()
            }
        };

        // Send data to Dashboard (Dashboard must be open to receive)
        chrome.runtime.sendMessage(requestData).catch(() => {
            // Dashboard is likely closed; ignore error
        });
    },
    { urls: ["<all_urls>"] },
    ["requestHeaders"]
);

/**
 * 3. Central Message Router
 * Handles requests for the Repeater and System Status.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    // Action: Fire Proxy Request (Repeater)
    if (message.action === "REPEATER_FIRE") {
        executeLiteRepeater(message.payload).then(sendResponse);
        return true; 
    }

    // Action: Basic Health Check
    if (message.action === "GET_HEALTH") {
        sendResponse({ status: "ONLINE", version: "1.0-LITE" });
        return true;
    }
});

/**
 * 4. Repeater Proxy Engine
 * Executes requests from the background script to bypass CORS.
 */
async function executeLiteRepeater(payload) {
    const { url, method, headers, body } = payload;
    try {
        const startTime = performance.now();
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: method !== 'GET' ? body : undefined
        });
        
        const duration = (performance.now() - startTime).toFixed(2);
        const responseText = await response.text();

        return {
            status: "success",
            response: {
                statusCode: response.status,
                data: responseText,
                time: `${duration}ms`
            }
        };
    } catch (err) {
        return { status: "error", message: err.message };
    }
}

/**
 * 5. Initialization
 */
chrome.runtime.onInstalled.addListener(() => {
    console.log("%c[AEON LITE] CORE_ACTIVATED", "color: #ff0033; font-weight: bold;");
});