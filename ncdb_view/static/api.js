export async function fetchInfo() {
    const res = await fetch("/info");

    if (!res.ok) {
        throw new Error("Failed to fetch /info");
    }

    return await res.json();
}


export async function fetchDatasets() {
    const res = await fetch("/datasets");

    if (!res.ok) {
        throw new Error("Failed to fetch /datasets");
    }

    return await res.json();
}


export async function fetchObsSpaces(datasetId) {
    const res =
        await fetch(`/obsspaces/${datasetId}`);

    if (!res.ok) {
        throw new Error(
            `Failed to fetch obs spaces for dataset ${datasetId}`
        );
    }

    return await res.json();
}


export async function fetchVariables(
    datasetId,
    obsName
) {
    const res =
        await fetch(
            `/variables/${datasetId}/${encodeURIComponent(obsName)}`
        );

    if (!res.ok) {
        throw new Error(
            `Failed to fetch variables for ${obsName}`
        );
    }

    return await res.json();
}


export async function fetchAttributes(
    datasetId,
    obsName,
    variable
) {
    const res = await fetch(
        "/attributes",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                dataset: parseInt(datasetId, 10),
                obsspace: obsName,
                variable: variable
            })
        }
    );

    if (!res.ok) {
        throw new Error(
            `Failed to fetch attributes for ${variable}`
        );
    }

    return await res.json();
}


export async function renderPlot(specs) {
    const res = await fetch(
        "/plot",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                specs: specs
            })
        }
    );

    if (!res.ok) {
        throw new Error("Plot rendering failed");
    }

    return await res.json();
}
