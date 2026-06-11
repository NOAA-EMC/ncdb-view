from pathlib import Path
import tempfile
import io
import os
import logging
from datetime import datetime

from fastapi import FastAPI
from fastapi import Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse

from pydantic import BaseModel
from queue import Queue
import threading

from ncdb.api.database import Database
from ncdb.api import FieldCollection

from ncdb.scanners import list_scanners, get_scanner_class


class ScanRequest(BaseModel):
    data_root: str
    scanner: str
    n_cycles: int = -1

class PlotSpec(BaseModel):
    dataset_id: int
    obsspace: str
    variable: str
    attribute: str
    mode: str = "history"

class PlotRequest(BaseModel):
    specs: list[PlotSpec]

class AttributesRequest(BaseModel):
    dataset: int
    obsspace: str
    variable: str

class Plot2DRequest(BaseModel):
    dataset_id: int
    obsspace: str
    variable: str
    cycle: str


BASE_RUNTIME_DIR = Path(tempfile.gettempdir()) / "ncdb_view"
PLOTS_DIR = BASE_RUNTIME_DIR / "plots"

PLOTS_DIR.mkdir(parents=True, exist_ok=True)

BASE_DIR = Path(__file__).parent
# BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()


@app.get("/info")
def info():
    db = app.state.db
    return {
        "db_path": db.path
    }


@app.get("/datasets")
def datasets():
    db = app.state.db
    result = []

    for ds in db.datasets():
        # Safely convert datetime objects to clean strings for front-end consumption
        formatted_cycles = []
        if hasattr(ds, 'cycles') and ds.cycles:
            for c in ds.cycles:
                if isinstance(c, datetime):
                    # Formats to standard ISO (e.g. 2026-04-07 06:00:00) 
                    # change to matching format string if ncdb needs specific layouts
                    formatted_cycles.append(c.strftime("%Y-%m-%d %H:%M:%S"))
                else:
                    formatted_cycles.append(str(c))

        result.append({
            "id": ds.id,
            "name": ds.name,
            "root_dir": ds.root_dir,
            "n_cycles": len(ds.cycles),
            "cycles": formatted_cycles  # Wires up front-end memory lookups seamlessly
        })

    return result


@app.get("/obsspaces/{dataset_id}")
def obsspaces(dataset_id: int):
    db = app.state.db
    ds = db.dataset(dataset_id)
    return sorted(
        [o.name for o in ds.obsspaces()]
    )


@app.get("/variables/{dataset_id}/{obsspace}")
def variables(dataset_id: int, obsspace: str):
    # print("dataset_id:", dataset_id, type(dataset_id))
    db = app.state.db
    ds = db.dataset(dataset_id)
    obs = ds.obsspace(obsspace)

    # return obs.list_variables(group="ObsValue")
    return obs.list_variables()


@app.post("/attributes")
def get_attributes(req: AttributesRequest):
    db = app.state.db
    ds = db.dataset(req.dataset)
    obsspace = ds.obsspace(req.obsspace)
    field = obsspace.field(req.variable)
    attrs = field.list_attributes()

    return {"attributes": attrs}


@app.get("/scanners")
def get_scanners():
    return {"scanners": list_scanners()}

@app.post("/scan")
def scan(req: ScanRequest):
    db = app.state.db

    q = Queue()

    def callback(msg):
        q.put(msg)

    def worker():
        q.put("Starting scan...\n")
        db.scan(
            data_root=req.data_root,
            scanner=req.scanner,
            n_cycles=req.n_cycles,
            callback=callback
        )
        q.put("Scan complete.\n")
        q.put(None)

    threading.Thread(target=worker).start()

    async def stream():
        while True:
            item = q.get()
            if item is None:
                break
            yield item + "\n"

    return StreamingResponse(
        stream(),
        media_type="text/plain"
    )


@app.post("/plot")
def plot(req: PlotRequest):
    db = app.state.db

    # print(req)

    fc = FieldCollection()

    for spec in req.specs:
        ds = db.dataset(spec.dataset_id)
        obsspace = ds.obsspace(spec.obsspace)
        field = obsspace.field(spec.variable)
        derived = getattr(field, spec.attribute)
        fc.add(derived)

    # needs to be fixed: unique name
    filename = "multiplot.png"
    plot_path = PLOTS_DIR / filename

    fc.plot(plot_path)

    return {
        "image": f"/plots/{filename}"
    }

@app.post("/plot2d")
def plot2d(req: Plot2DRequest):
    db = app.state.db
    
    # 1. Resolve structures down to target slice components
    ds = db.dataset(req.dataset_id)
    obsspace = ds.obsspace(req.obsspace)
    field = obsspace.field(req.variable)
    
    # 2. Parse the stringified frontend cycle target back into Python datetime context
    # Adjust format string mapping ("%Y-%m-%d %H:%M:%S") to suit your storage engine indexes
    try:
        dt_cycle = datetime.strptime(req.cycle, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        # Fallback if string layout behaves unexpectedly
        dt_cycle = req.cycle

    # 3. Extract the field snap array layer matching: temp0 = temp[t]
    field_snapshot = field[dt_cycle]
    
    filename = "map_2d.png"
    plot_path = PLOTS_DIR / filename
    
    # 4. Trigger spatial mesh coordinate generator plot matching: temp0.plot("filename")
    field_snapshot.plot(str(plot_path))
    
    return {
        "image": f"/plots/{filename}"
    }

# -----------------------------
# serve index.html + app.js
# -----------------------------

app.mount(
    "/plots",
    StaticFiles(directory=str(PLOTS_DIR)),
    name="plots"
)

app.mount(
    "/",
    StaticFiles(directory=str(BASE_DIR / "static"), html=True),
    name="static"
)
