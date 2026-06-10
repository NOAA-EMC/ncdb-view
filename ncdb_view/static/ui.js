export const ui = {
    // --- Global Header Elements ---
    dbFilename:   document.getElementById("db-filename"),
    dbMetaCount:  document.getElementById("db-meta-count"),

    // --- Scan & Inventory Panel Elements (Tab 1) ---
    datasetsList:    document.getElementById("datasets-list"),
    datasetsLoading: document.getElementById("datasets-loading"),
    scanForm:        document.getElementById("scan-form"),
    scanBtn:         document.getElementById("scan-btn"),
    dataRootInput:   document.getElementById("data-root"),
    terminalSection: document.getElementById("terminal-section"),
    terminalOutput:  document.getElementById("terminal-output"),
    terminalStatus:  document.getElementById("terminal-status"),

    // --- Historical Panel Dropdowns (Tab 2) ---
    selectDataset:   document.getElementById("select-dataset"),
    selectObsspace:  document.getElementById("select-obsspace"),
    selectVariable:  document.getElementById("select-variable"),
    selectAttribute: document.getElementById("select-attribute"),

    // --- Historical Actions ---
    btnAddSpec: document.getElementById("btn-add-spec"),
    btnClear:   document.getElementById("btn-clear"),
    btnRender:  document.getElementById("btn-render"),

    // --- Historical Containers ---
    specsBasket:   document.getElementById("specs-basket"),
    canvasSection: document.getElementById("canvas-section"),
    plotLoading:   document.getElementById("plot-loading"),
    plotImg:       document.getElementById("plot-img"),

    // --- 2D Panel Dropdowns (Tab 3) ---
    selectDataset2d:   document.getElementById("select-dataset-2d"),
    selectObsspace2d:  document.getElementById("select-obsspace-2d"),
    selectVariable2d:  document.getElementById("select-variable-2d"),
    selectCycle2d:     document.getElementById("select-cycle-2d"),

    // --- 2D Action & Canvas Containers ---
    btnRender2d:       document.getElementById("btn-render-2d"),
    canvasSection2d:   document.getElementById("canvas-section-2d"),
    plotLoading2d:     document.getElementById("plot-loading-2d"),
    plotImg2d:         document.getElementById("plot-img-2d"),

    // --- Dynamic Tab Switcher Loop ---
    initTabs() {
        const buttons = document.querySelectorAll(".tab-btn");
        const panels = document.querySelectorAll(".tab-panel");

        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetPanelId = btn.getAttribute("data-tab");

                buttons.forEach(b => b.classList.remove("active"));
                panels.forEach(p => p.classList.add("hidden"));

                btn.classList.add("active");
                document.getElementById(targetPanelId).classList.remove("hidden");
            });
        });
    },

    // --- Historical DOM Rendering ---
    renderBasket(activeSpecs) {
        this.specsBasket.innerHTML = "";

        if (activeSpecs.length === 0) {
            this.specsBasket.innerHTML = `
                <li class="text-xs text-gray-400 italic py-1 empty-msg">
                    No specifications added yet.
                </li>
            `;
            this.btnRender.classList.add("hidden");
            return;
        }

        this.btnRender.classList.remove("hidden");

        activeSpecs.forEach((spec, index) => {
            const li = document.createElement("li");
            li.className = `
                py-1.5 flex justify-between items-center text-xs font-mono 
                text-gray-700 bg-gray-50 px-2 rounded border border-gray-100
            `;

            li.innerHTML = `
                <div class="truncate mr-2" title="${spec.dataset_name} ➔ ${spec.obsspace} ➔ ${spec.variable} ➔ ${spec.attribute}">
                    <span class="text-blue-600 font-semibold">
                        [${spec.dataset_name.split(' ')[0]}]
                    </span>
                    ${spec.variable} ➔
                    <span class="underline">${spec.attribute}</span>
                </div>
                <button class="text-red-500 hover:text-red-700 font-bold px-1 transition" data-index="${index}">
                    Remove
                </button>
            `;
            this.specsBasket.appendChild(li);
        });
    },

    togglePlotState(state, imgSrc = "") {
        if (state === "cleared") {
            this.canvasSection.classList.add("hidden");
            this.plotImg.classList.add("hidden");
            this.plotImg.src = "";
        } else if (state === "loading") {
            this.canvasSection.classList.remove("hidden");
            this.plotLoading.classList.remove("hidden");
            this.plotImg.classList.add("hidden");
        } else if (state === "loaded") {
            this.plotImg.src = imgSrc;
            this.plotImg.classList.remove("hidden");
            this.plotLoading.classList.add("hidden");
        } else if (state === "failed") {
            this.plotLoading.classList.add("hidden");
        }
    },

    // --- Corrected 2D Snapshot Plot State Manager ---
    togglePlotState2d(state, imgSrc = "") {
        if (state === "loading") {
            this.canvasSection2d.classList.remove("hidden");
            this.plotLoading2d.classList.remove("hidden");
            this.plotImg2d.classList.add("hidden");
        } else if (state === "loaded") {
            this.plotImg2d.src = imgSrc;
            this.plotImg2d.classList.remove("hidden");
            this.plotLoading2d.classList.add("hidden");
        } else if (state === "failed") {
            this.plotLoading2d.classList.add("hidden"); // FIXED: Typo removed safely
        }
    }
};
