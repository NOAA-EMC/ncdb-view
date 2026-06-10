document.addEventListener("DOMContentLoaded", () => {
    // Structural DOM Selectors
    const datasetsList = document.getElementById("datasets-list");
    const datasetsLoading = document.getElementById("datasets-loading");
    
    const scanForm = document.getElementById("scan-form");
    const scanBtn = document.getElementById("scan-btn");
    const dataRootInput = document.getElementById("data-root");
    
    const terminalSection = document.getElementById("terminal-section");
    const terminalOutput = document.getElementById("terminal-output");
    const terminalStatus = document.getElementById("terminal-status");

    const dbFilename = document.getElementById("db-filename");
    const dbMetaCount = document.getElementById("db-meta-count");

    // Pull database identity and update the high-density title tooltips
    async function loadDbInfo() {
        try {
            const res = await fetch("/info");
            if (!res.ok) throw new Error();
            const data = await res.json();
            const fullPath = data.db_path;
            
            const filename = fullPath.split('/').pop() || fullPath;
            dbFilename.textContent = filename;
            dbFilename.setAttribute("title", fullPath);
        } catch (err) {
            dbFilename.textContent = "Error loading DB";
        }
    }

    // Load directory structures and fill table inventory records
    async function loadDatasets() {
        try {
            const res = await fetch("/datasets");
            if (!res.ok) throw new Error();
            const data = await res.json();

            // Direct metric string assignment without extra descriptor tags
            dbMetaCount.textContent = `${data.length} dataset${data.length === 1 ? '' : 's'}`;
            datasetsList.innerHTML = "";
            
            if (data.length === 0) {
                datasetsList.innerHTML = `<li class="py-2 text-xs text-gray-500 italic text-center">Empty</li>`;
            } else {
                if (data[0] && data[0].root_dir && !dataRootInput.value) {
                    dataRootInput.value = data[0].root_dir;
                }

                data.forEach(ds => {
                    const li = document.createElement("li");
                    li.className = "py-2 flex justify-between items-center group relative";
                    li.setAttribute("title", ds.root_dir);
                    
                    const shortPath = ds.root_dir.split('/').pop() || ds.root_dir;
                    
                    li.innerHTML = `
                        <div class="flex items-baseline space-x-2 overflow-hidden mr-4">
                            <span class="font-semibold text-xs text-gray-900 border-b border-dotted border-gray-400 cursor-help flex-shrink-0">${ds.name}</span>
                            <span class="text-xs text-gray-500 font-mono truncate cursor-help border-b border-dotted border-gray-300">(${shortPath})</span>
                        </div>
                        <span class="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded border border-slate-200 flex-shrink-0">
                            ${ds.n_cycles} cycles
                        </span>
                    `;
                    datasetsList.appendChild(li);
                });
            }

            datasetsLoading.classList.add("hidden");
            datasetsList.classList.remove("hidden");
        } catch (err) {
            datasetsLoading.textContent = "Database communication error.";
        }
    }

    // Stream live scanner chunk events natively over the wire
    async function handleScanSubmit(e) {
        e.preventDefault();

        scanBtn.disabled = true;
        scanBtn.classList.add("opacity-50", "cursor-not-allowed");
        terminalSection.classList.remove("hidden");
        
        if (terminalOutput.textContent.trim().length > 0) {
            terminalOutput.textContent += "\n\n--- NEW SCAN RUN ---\n";
        }
        
        terminalStatus.textContent = "Running";
        terminalStatus.className = "text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 animate-pulse";

        const payload = {
            data_root: dataRootInput.value,
            scanner: document.getElementById("scanner-type").value,
            n_cycles: parseInt(document.getElementById("n-cycles").value, 10)
        };

        try {
            const response = await fetch("/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error();

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const textChunk = decoder.decode(value, { stream: true });
                terminalOutput.textContent += textChunk;
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }

            terminalStatus.textContent = "Complete";
            terminalStatus.className = "text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-500 text-white";
        } catch (error) {
            terminalOutput.textContent += `\n[ERROR]: Scan runtime failed\n`;
            terminalStatus.textContent = "Failed";
            terminalStatus.className = "text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500 text-white";
        } finally {
            scanBtn.disabled = false;
            scanBtn.classList.remove("opacity-50", "cursor-not-allowed");
            loadDatasets();
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }
    }

    // Global Initializers Execution Thread
    scanForm.addEventListener("submit", handleScanSubmit);
    loadDbInfo();
    loadDatasets();
});
