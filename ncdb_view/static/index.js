import {
    fetchInfo,
    fetchDatasets,
    fetchObsSpaces,
    fetchVariables,
    fetchAttributes,
    renderPlot
} from "./api.js";
import { ui } from "./ui.js";
import { resetDropdowns } from "./util.js";

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Dynamic Navigation Tab Switcher
    ui.initTabs();

    // Map Inventory Selectors (Tab 1)
    const datasetsList = ui.datasetsList;
    const datasetsLoading = ui.datasetsLoading;
    const scanForm = ui.scanForm;
    const scanBtn = ui.scanBtn;
    const dataRootInput = ui.dataRootInput;
    const terminalSection = ui.terminalSection;
    const terminalOutput = ui.terminalOutput;
    const terminalStatus = ui.terminalStatus;
    const scannerSelect = document.getElementById("scanner-type");

    // Historical Workspace Node Targets (Tab 2)
    const selectDataset = ui.selectDataset;
    const selectObsspace = ui.selectObsspace;
    const selectVariable = ui.selectVariable;
    const selectAttribute = ui.selectAttribute;
    const btnAddSpec = ui.btnAddSpec;
    const btnClear = ui.btnClear;
    const btnRender = ui.btnRender;
    const specsBasket = ui.specsBasket;

    // --- State Trackers ---
    let activeSpecs = [];
    let cachedDatasets = []; // Safely caches configurations for front-end cross-talk
    
    let currentSelection = {
        dataset_id: null,
        dataset_name: "",
        obsspace: "",
        variable: "",
        attribute: ""
    };

    let selection2d = {
        dataset_id: null,
        obsspace: "",
        variable: "",
        cycle: ""
    };

    // --- Centralized Database Framework Loaders ---
    async function loadDbInfo() {
        try {
            const data = await fetchInfo();
            const fullPath = data.db_path;
            const filename = fullPath.split('/').pop() || fullPath;

            ui.dbFilename.textContent = filename;
            ui.dbFilename.setAttribute("title", fullPath);
        } catch (err) {
            ui.dbFilename.textContent = "Error loading DB";
        }
    }

    async function loadScanners() {
        try {
            const res = await fetch("/scanners");
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            scannerSelect.innerHTML = "";
            data.scanners.forEach(scanner => {
                const opt = document.createElement("option");
                opt.value = scanner;
                // Capitalize first letters nicely for display purposes
                opt.textContent = scanner.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                scannerSelect.appendChild(opt);
            });
        } catch (err) {
            scannerSelect.innerHTML = '<option value="">Error loading scanners</option>';
        }
    }

    async function loadDatasets() {
        try {
            const data = await fetchDatasets();
            
            // Sync current dataset context layout arrays globally
            cachedDatasets = data;
            
            ui.dbMetaCount.textContent = `${data.length} dataset${data.length === 1 ? '' : 's'}`;
            datasetsList.innerHTML = "";
            
            if (data.length === 0) {
                datasetsList.innerHTML = `<li class="py-2 text-xs text-gray-500 italic text-center">Empty</li>`;
                selectDataset.innerHTML = '<option value="">-- Choose Dataset --</option>';
                ui.selectDataset2d.innerHTML = '<option value="">-- Choose Dataset --</option>';
            } else {
                if (data[0] && data[0].root_dir && !dataRootInput.value) {
                    dataRootInput.value = data[0].root_dir;
                }

                // Initialize text nodes strictly ONCE before entering the loop space
                selectDataset.innerHTML = '<option value="">-- Choose Dataset --</option>';
                ui.selectDataset2d.innerHTML = '<option value="">-- Choose Dataset --</option>';

                data.forEach(ds => {
                    const shortPath = ds.root_dir.split('/').pop() || ds.root_dir;
                    
                    // Populate Scan Inventory Row
                    const li = document.createElement("li");
                    li.className = "py-2 flex justify-between items-center group relative";
                    li.setAttribute("title", ds.root_dir);
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

                    // Sync Options cleanly down into both workflows
                    selectDataset.innerHTML += `<option value="${ds.id}">${ds.name} (${shortPath})</option>`;
                    ui.selectDataset2d.innerHTML += `<option value="${ds.id}">${ds.name} (${shortPath})</option>`;
                });
            }

            datasetsLoading.classList.add("hidden");
            datasetsList.classList.remove("hidden");
        } catch (err) {
            datasetsLoading.textContent = "Database communication error.";
        }
    }

    // --- Stream Logs Processing Thread ---
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
            scanner: scannerSelect.value,
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

    // --- Tab 2: Cascade Chain Dropdown Handlers (Historical Timeline) ---
    selectDataset.addEventListener("change", async () => {
        const dsId = selectDataset.value;
        currentSelection.dataset_id = dsId ? parseInt(dsId, 10) : null;
        currentSelection.dataset_name = dsId ? selectDataset.options[selectDataset.selectedIndex].text : "";
        currentSelection.obsspace = ""; currentSelection.variable = ""; currentSelection.attribute = "";

        resetDropdowns([selectObsspace, selectVariable, selectAttribute], true);
        btnAddSpec.disabled = true;
        if (!dsId) return;

        const obsspaces = await fetchObsSpaces(dsId);
        selectObsspace.innerHTML = '<option value="">-- Choose Obs Space --</option>';
        obsspaces.forEach(obs => { selectObsspace.innerHTML += `<option value="${obs}">${obs}</option>`; });
        selectObsspace.disabled = false;
    });

    selectObsspace.addEventListener("change", async () => {
        const obsName = selectObsspace.value;
        currentSelection.obsspace = obsName;
        currentSelection.variable = ""; currentSelection.attribute = "";

        resetDropdowns([selectVariable, selectAttribute], true);
        btnAddSpec.disabled = true;
        if (!obsName) return;

        const variables = await fetchVariables(currentSelection.dataset_id, obsName);
        selectVariable.innerHTML = '<option value="">-- Choose Variable --</option>';
        variables.forEach(v => { selectVariable.innerHTML += `<option value="${v}">${v}</option>`; });
        selectVariable.disabled = false;
    });

    selectVariable.addEventListener("change", async () => {
        const varName = selectVariable.value;
        currentSelection.variable = varName;
        currentSelection.attribute = "";

        resetDropdowns([selectAttribute], true);
        btnAddSpec.disabled = true;
        if (!varName) return;

        const data = await fetchAttributes(currentSelection.dataset_id, currentSelection.obsspace, varName);
        selectAttribute.innerHTML = '<option value="">-- Choose Attribute --</option>';
        data.attributes.forEach(attr => { selectAttribute.innerHTML += `<option value="${attr}">${attr}</option>`; });
        selectAttribute.disabled = false;
    });

    selectAttribute.addEventListener("change", () => {
        currentSelection.attribute = selectAttribute.value;
        btnAddSpec.disabled = !currentSelection.attribute;
    });

    // --- Tab 2 Actions ---
    btnAddSpec.addEventListener("click", () => {
        activeSpecs.push({ ...currentSelection, mode: "history" });
        ui.renderBasket(activeSpecs);
    });

    specsBasket.addEventListener("click", (e) => {
        if (e.target.hasAttribute("data-index")) {
            const indexToRemove = parseInt(e.target.getAttribute("data-index"), 10);
            activeSpecs.splice(indexToRemove, 1);
            ui.renderBasket(activeSpecs);
        }
    });

    btnClear.addEventListener("click", () => {
        activeSpecs = [];
        ui.renderBasket(activeSpecs);
        ui.togglePlotState("cleared");
        resetDropdowns([selectObsspace, selectVariable, selectAttribute], true);
        selectDataset.value = "";
        btnAddSpec.disabled = true;
    });

    btnRender.addEventListener("click", async () => {
        ui.togglePlotState("loading");
        try {
            const payloadSpecs = activeSpecs.map(s => ({
                dataset_id: s.dataset_id,
                obsspace: s.obsspace,
                variable: s.variable,
                attribute: s.attribute,
                mode: s.mode
            }));

            const data = await renderPlot(payloadSpecs);
            ui.togglePlotState("loaded", `${data.image}?t=${new Date().getTime()}`);
        } catch (err) {
            alert("Plot rendering failed.");
            ui.togglePlotState("failed");
        }
    });

    // --- Tab 3: Cascade Chain Dropdown Handlers (2D Spatial Snapshot) ---
    ui.selectDataset2d.addEventListener("change", async () => {
        const dsId = ui.selectDataset2d.value;
        selection2d = { dataset_id: dsId ? parseInt(dsId, 10) : null, obsspace: "", variable: "", cycle: "" };
        resetDropdowns([ui.selectObsspace2d, ui.selectVariable2d, ui.selectCycle2d], true);
        ui.btnRender2d.disabled = true;
        if (!dsId) return;

        const obsspaces = await fetchObsSpaces(dsId);
        ui.selectObsspace2d.innerHTML = '<option value="">-- Choose Obs Space --</option>';
        obsspaces.forEach(obs => { ui.selectObsspace2d.innerHTML += `<option value="${obs}">${obs}</option>`; });
        ui.selectObsspace2d.disabled = false;
    });

    ui.selectObsspace2d.addEventListener("change", async () => {
        const obsName = ui.selectObsspace2d.value;
        selection2d.obsspace = obsName; selection2d.variable = ""; selection2d.cycle = "";
        resetDropdowns([ui.selectVariable2d, ui.selectCycle2d], true);
        ui.btnRender2d.disabled = true;
        if (!obsName) return;

        const variables = await fetchVariables(selection2d.dataset_id, obsName);
        ui.selectVariable2d.innerHTML = '<option value="">-- Choose Variable --</option>';
        variables.forEach(v => { ui.selectVariable2d.innerHTML += `<option value="${v}">${v}</option>`; });
        ui.selectVariable2d.disabled = false;
    });

	ui.selectVariable2d.addEventListener("change", async () => {
        const varName = ui.selectVariable2d.value;
        selection2d.variable = varName; selection2d.cycle = "";
        resetDropdowns([ui.selectCycle2d], true);
        ui.btnRender2d.disabled = true;
        if (!varName) return;

        try {
            const res = await fetch("/fieldcycles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dataset: selection2d.dataset_id,
                    obsspace: selection2d.obsspace,
                    variable: varName
                })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();

            if (data.cycles && data.cycles.length > 0) {
                ui.selectCycle2d.innerHTML = '<option value="">-- Choose Cycle --</option>';
                data.cycles.forEach(c => { 
                    ui.selectCycle2d.innerHTML += `<option value="${c}">${c}</option>`; 
                });
                ui.selectCycle2d.disabled = false;
            } else {
                ui.selectCycle2d.innerHTML = '<option value="">-- No Available Cycles Found --</option>';
            }
        } catch (err) {
            ui.selectCycle2d.innerHTML = '<option value="">-- Error Loading Cycles --</option>';
        }
    });

    ui.selectCycle2d.addEventListener("change", () => {
        selection2d.cycle = ui.selectCycle2d.value;
        ui.btnRender2d.disabled = !selection2d.cycle;
    });

    ui.btnRender2d.addEventListener("click", async () => {
        ui.togglePlotState2d("loading");
        try {
            const response = await fetch("/plot2d", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(selection2d)
            });
            if (!response.ok) throw new Error();
            const data = await response.json();
            ui.togglePlotState2d("loaded", `${data.image}?t=${new Date().getTime()}`);
        } catch (err) {
            alert("Spatial map rendering failed.");
            ui.togglePlotState2d("failed");
        }
    });

    // --- System Setup Thread Bootstraps ---
    scanForm.addEventListener("submit", handleScanSubmit);
    loadDbInfo();
    loadScanners();
    loadDatasets();
    ui.renderBasket(activeSpecs);
});
