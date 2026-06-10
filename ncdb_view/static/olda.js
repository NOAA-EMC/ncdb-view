import {
    fetchInfo,
    fetchDatasets,
    fetchObsSpaces,
    fetchVariables,
    fetchAttributes,
    renderPlot
} from "./api.js";
import { ui } from "./ui.js";
import { resetDropdowns } from "./util.js"


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
    const canvasSection = ui.canvasSection;
    const plotLoading = ui.plotLoading;
    const plotImg = ui.plotImg;
    // Header metadata
    const dbFilename = ui.dbFilename;
    const dbMetaCount = ui.dbMetaCount;

    let activeSpecs = [];

    async function loadDbInfo() {

        try {

            const data =
                await fetchInfo();

            const fullPath =
                data.db_path;

            const filename =
                fullPath.split('/').pop() || fullPath;

            dbFilename.textContent =
                filename;

            dbFilename.setAttribute(
                "title",
                fullPath
            );

        } catch (err) {

            dbFilename.textContent =
                "Error loading DB";
        }
    }


    async function initDatasets() {

        try {

            const datasets =
                await fetchDatasets();

            dbMetaCount.textContent =
                `${datasets.length} dataset${datasets.length === 1 ? '' : 's'}`;

            selectDataset.innerHTML =
                '<option value="">-- Choose Dataset --</option>';

            datasets.forEach(ds => {

                const shortPath =
                    ds.root_dir.split('/').pop() || ds.root_dir;

                selectDataset.innerHTML += `
                    <option value="${ds.id}">
                        ${ds.name} (${shortPath})
                    </option>
                `;
            });

        } catch (err) {

            console.error(
                "Failed to load datasets"
            );
        }
    }


    selectDataset.addEventListener(
        "change",
        async () => {

            const dsId =
                selectDataset.value;

            resetDropdowns(
                [
                    selectObsspace,
                    selectVariable,
                    selectAttribute
                ],
                true
            );

            btnAddSpec.disabled = true;

            if (!dsId) {
                return;
            }

            const obsspaces =
                await fetchObsSpaces(dsId);

            selectObsspace.innerHTML =
                '<option value="">-- Choose Obs Space --</option>';

            obsspaces.forEach(obs => {

                selectObsspace.innerHTML += `
                    <option value="${obs}">
                        ${obs}
                    </option>
                `;
            });

            selectObsspace.disabled = false;
        }
    );


    selectObsspace.addEventListener(
        "change",
        async () => {

            const dsId =
                selectDataset.value;

            const obsName =
                selectObsspace.value;

            resetDropdowns(
                [
                    selectVariable,
                    selectAttribute
                ],
                true
            );

            btnAddSpec.disabled = true;

            if (!obsName) {
                return;
            }

            const variables =
                await fetchVariables(
                    dsId,
                    obsName
                );

            selectVariable.innerHTML =
                '<option value="">-- Choose Variable --</option>';

            variables.forEach(v => {

                selectVariable.innerHTML += `
                    <option value="${v}">
                        ${v}
                    </option>
                `;
            });

            selectVariable.disabled = false;
        }
    );


    selectVariable.addEventListener(
        "change",
        async () => {

            const dsId =
                selectDataset.value;

            const obsName =
                selectObsspace.value;

            const varName =
                selectVariable.value;

            resetDropdowns(
                [selectAttribute],
                true
            );

            btnAddSpec.disabled = true;

            if (!varName) {
                return;
            }

            const data =
                await fetchAttributes(
                    dsId,
                    obsName,
                    varName
                );

            selectAttribute.innerHTML =
                '<option value="">-- Choose Attribute --</option>';

            data.attributes.forEach(attr => {

                selectAttribute.innerHTML += `
                    <option value="${attr}">
                        ${attr}
                    </option>
                `;
            });

            selectAttribute.disabled = false;
        }
    );


    selectAttribute.addEventListener(
        "change",
        () => {

            btnAddSpec.disabled =
                !selectAttribute.value;
        }
    );

/*
    function resetDropdowns(
        dropdowns,
        disable
    ) {

        dropdowns.forEach(d => {

            d.innerHTML =
                '<option value="">-- Select parent dependency --</option>';

            d.disabled = disable;
        });
    }
*/


    btnAddSpec.addEventListener(
        "click",
        () => {

            const spec = {

                dataset_id:
                    parseInt(
                        selectDataset.value,
                        10
                    ),

                dataset_name:
                    selectDataset.options[
                        selectDataset.selectedIndex
                    ].text,

                obsspace:
                    selectObsspace.value,

                variable:
                    selectVariable.value,

                attribute:
                    selectAttribute.value,

                mode:
                    "history"
            };

            activeSpecs.push(spec);

            renderBasket();
        }
    );


    function renderBasket() {

        specsBasket.innerHTML = "";

        if (activeSpecs.length === 0) {

            specsBasket.innerHTML = `
                <li class="
                    text-xs
                    text-gray-400
                    italic
                    py-1
                    empty-msg
                ">
                    No specifications added yet.
                </li>
            `;

            btnRender.classList.add("hidden");

            return;
        }

        btnRender.classList.remove("hidden");

        activeSpecs.forEach(
            (spec, index) => {

                const li =
                    document.createElement("li");

                li.className = `
                    py-1.5
                    flex
                    justify-between
                    items-center
                    text-xs
                    font-mono
                    text-gray-700
                    bg-gray-50
                    px-2
                    rounded
                    border
                    border-gray-100
                `;

                li.innerHTML = `
                    <div
                        class="truncate mr-2"
                        title="${spec.dataset_name} ➔ ${spec.obsspace} ➔ ${spec.variable} ➔ ${spec.attribute}"
                    >
                        <span class="text-blue-600 font-semibold">
                            [${spec.dataset_name.split(' ')[0]}]
                        </span>

                        ${spec.variable}
                        ➔

                        <span class="underline">
                            ${spec.attribute}
                        </span>
                    </div>

                    <button
                        class="
                            text-red-500
                            hover:text-red-700
                            font-bold
                            px-1
                            transition
                        "
                        data-index="${index}"
                    >
                        Remove
                    </button>
                `;

                specsBasket.appendChild(li);
            }
        );
    }


    specsBasket.addEventListener(
        "click",
        (e) => {

            if (
                e.target.hasAttribute("data-index")
            ) {

                const indexToRemove =
                    parseInt(
                        e.target.getAttribute("data-index"),
                        10
                    );

                activeSpecs.splice(
                    indexToRemove,
                    1
                );

                renderBasket();
            }
        }
    );


    btnClear.addEventListener(
        "click",
        () => {

            activeSpecs = [];

            renderBasket();

            canvasSection.classList.add(
                "hidden"
            );

            plotImg.classList.add(
                "hidden"
            );

            plotImg.src = "";
        }
    );


    btnRender.addEventListener(
        "click",
        async () => {

            canvasSection.classList.remove(
                "hidden"
            );

            plotLoading.classList.remove(
                "hidden"
            );

            plotImg.classList.add(
                "hidden"
            );

            try {

                const payloadSpecs =
                    activeSpecs.map(s => ({

                        dataset_id:
                            s.dataset_id,

                        obsspace:
                            s.obsspace,

                        variable:
                            s.variable,

                        attribute:
                            s.attribute,

                        mode:
                            s.mode
                    }));

                const data =
                    await renderPlot(
                        payloadSpecs
                    );

                plotImg.src =
                    `${data.image}?t=${new Date().getTime()}`;

                plotImg.classList.remove(
                    "hidden"
                );

            } catch (err) {

                alert(
                    "Plot rendering failed."
                );

            } finally {

                plotLoading.classList.add(
                    "hidden"
                );
            }
        }
    );


    loadDbInfo();

    initDatasets();
});
