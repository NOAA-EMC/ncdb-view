export const ui = {
    // Dropdowns
    selectDataset: document.getElementById("select-dataset"),
    selectObsspace: document.getElementById("select-obsspace"),
    selectVariable: document.getElementById("select-variable"),
    selectAttribute: document.getElementById("select-attribute"),

    // Actions
    btnAddSpec: document.getElementById("btn-add-spec"),
    btnClear: document.getElementById("btn-clear"),
    btnRender: document.getElementById("btn-render"),

    // Containers
    specsBasket: document.getElementById("specs-basket"),
    canvasSection: document.getElementById("canvas-section"),
    plotLoading: document.getElementById("plot-loading"),
    plotImg: document.getElementById("plot-img"),

    // Header metadata
    dbFilename: document.getElementById("db-filename"),
    dbMetaCount: document.getElementById("db-meta-count"),

	// 2D Map specific inputs
	selectCycle: document.getElementById("select-cycle"),
	btnRenderMap: document.getElementById("btn-render-map"),

    // --- DOM Rendering Methods ---

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

    // Handles view transitions for loading, idle, and cleared states
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
    }
};
