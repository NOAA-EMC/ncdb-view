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
    // Dropdowns
    const selectDataset = ui.selectDataset;
    const selectObsspace = ui.selectObsspace;
    const selectVariable = ui.selectVariable;
    const selectAttribute = ui.selectAttribute;
    
    // Actions
    const btnAddSpec = ui.btnAddSpec;
    const btnClear = ui.btnClear;
    const btnRender = ui.btnRender;
    
    // Containers
    const specsBasket = ui.specsBasket;
    
    // Header metadata
    const dbFilename = ui.dbFilename;
    const dbMetaCount = ui.dbMetaCount;

    // --- Application State ---
    let activeSpecs = [];
    
    let currentSelection = {
        dataset_id: null,
        dataset_name: "",
        obsspace: "",
        variable: "",
        attribute: ""
    };

    async function loadDbInfo() {
        try {
            const data = await fetchInfo();
            const fullPath = data.db_path;
            const filename = fullPath.split('/').pop() || fullPath;

            dbFilename.textContent = filename;
            dbFilename.setAttribute("title", fullPath);
        } catch (err) {
            dbFilename.textContent = "Error loading DB";
        }
    }

    async function initDatasets() {
        try {
            const datasets = await fetchDatasets();
            dbMetaCount.textContent = `${datasets.length} dataset${datasets.length === 1 ? '' : 's'}`;

            selectDataset.innerHTML = '<option value="">-- Choose Dataset --</option>';
            datasets.forEach(ds => {
                const shortPath = ds.root_dir.split('/').pop() || ds.root_dir;
                selectDataset.innerHTML += `
                    <option value="${ds.id}">
                        ${ds.name} (${shortPath})
                    </option>
                `;
            });
        } catch (err) {
            console.error("Failed to load datasets");
        }
    }

    selectDataset.addEventListener("change", async () => {
        const dsId = selectDataset.value;
        
        // Update State
        currentSelection.dataset_id = dsId ? parseInt(dsId, 10) : null;
        currentSelection.dataset_name = dsId ? selectDataset.options[selectDataset.selectedIndex].text : "";
        currentSelection.obsspace = "";
        currentSelection.variable = "";
        currentSelection.attribute = "";

        resetDropdowns([selectObsspace, selectVariable, selectAttribute], true);
        btnAddSpec.disabled = true;

        if (!dsId) return;

        const obsspaces = await fetchObsSpaces(dsId);
        selectObsspace.innerHTML = '<option value="">-- Choose Obs Space --</option>';
        obsspaces.forEach(obs => {
            selectObsspace.innerHTML += `<option value="${obs}">${obs}</option>`;
        });
        selectObsspace.disabled = false;
    });

    selectObsspace.addEventListener("change", async () => {
        const obsName = selectObsspace.value;
        
        // Update State
        currentSelection.obsspace = obsName;
        currentSelection.variable = "";
        currentSelection.attribute = "";

        resetDropdowns([selectVariable, selectAttribute], true);
        btnAddSpec.disabled = true;

        if (!obsName) return;

        const variables = await fetchVariables(currentSelection.dataset_id, obsName);
        selectVariable.innerHTML = '<option value="">-- Choose Variable --</option>';
        variables.forEach(v => {
            selectVariable.innerHTML += `<option value="${v}">${v}</option>`;
        });
        selectVariable.disabled = false;
    });

    selectVariable.addEventListener("change", async () => {
        const varName = selectVariable.value;
        
        // Update State
        currentSelection.variable = varName;
        currentSelection.attribute = "";

        resetDropdowns([selectAttribute], true);
        btnAddSpec.disabled = true;

        if (!varName) return;

        const data = await fetchAttributes(currentSelection.dataset_id, currentSelection.obsspace, varName);
        selectAttribute.innerHTML = '<option value="">-- Choose Attribute --</option>';
        data.attributes.forEach(attr => {
            selectAttribute.innerHTML += `<option value="${attr}">${attr}</option>`;
        });
        selectAttribute.disabled = false;
    });

    selectAttribute.addEventListener("change", () => {
        currentSelection.attribute = selectAttribute.value;
        btnAddSpec.disabled = !currentSelection.attribute;
    });

    btnAddSpec.addEventListener("click", () => {
        // Safe, clean snapshot copy of the current state tracker
        const spec = {
            ...currentSelection,
            mode: "history"
        };

        activeSpecs.push(spec);
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
    });

    btnRender.addEventListener("click", async () => {
        ui.togglePlotState("loading");

        try {
            // payload mapping is now beautifully predictable
            const payloadSpecs = activeSpecs.map(s => ({
                dataset_id: s.dataset_id,
                obsspace: s.obsspace,
                variable: s.variable,
                attribute: s.attribute,
                mode: s.mode
            }));

            const data = await renderPlot(payloadSpecs);
            const cachedImgUrl = `${data.image}?t=${new Date().getTime()}`;
            
            ui.togglePlotState("loaded", cachedImgUrl);
        } catch (err) {
            alert("Plot rendering failed.");
            ui.togglePlotState("failed");
        }
    });

    loadDbInfo();
    initDatasets();
});
