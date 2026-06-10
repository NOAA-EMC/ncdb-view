/*
export function resetDropdowns(dropdowns, disable) {
    dropdowns.forEach(item => {
        // Find the correct custom placeholder based on the element's ID
        let placeholder = "-- Select --";
        
        if (item.id === "select-obsspace")  placeholder = "-- Choose Obs Space --";
        if (item.id === "select-variable")  placeholder = "-- Choose Variable --";
        if (item.id === "select-attribute") placeholder = "-- Choose Attribute --";

        item.innerHTML = `<option value="">${placeholder}</option>`;
        item.disabled = disable;
    });
}
*/

export function resetDropdowns(dropdowns, disable) {
    dropdowns.forEach(item => {
        let placeholder = "-- Select --";
        
        if (item.id === "select-obsspace"  || item.id === "select-obsspace-2d")  placeholder = "-- Choose Obs Space --";
        if (item.id === "select-variable"  || item.id === "select-variable-2d")  placeholder = "-- Choose Variable --";
        if (item.id === "select-attribute")                                      placeholder = "-- Choose Attribute --";
        if (item.id === "select-cycle-2d")                                       placeholder = "-- Choose Cycle --";

        item.innerHTML = `<option value="">${placeholder}</option>`;
        item.disabled = disable;
    });
}
