import os
import time
from fastapi import FastAPI, HTTPException, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from pydantic import BaseModel
import io
import requests
import subprocess
import uuid
import os
from supabase import create_client
from textwrap import dedent
from dotenv import load_dotenv
load_dotenv()

import tempfile

app = FastAPI()
client = genai.Client()
supabase = create_client(
    supabase_url=os.getenv("SUPABASE_URL"),
    supabase_key=os.getenv("SUPABASE_KEY"),
)

# Files are now stored in Supabase storage (bucket: vibecad) under
# folders: stl/ and scad/. We expose dynamic routes below instead of static mounts.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateResponse(BaseModel):
    model_id: str

@app.post("/generate")
async def generate(image: UploadFile = File(...)) -> GenerateResponse:
    # Validate that the uploaded file is a PNG
    if not image.content_type == "image/png":
        raise HTTPException(status_code=400, detail="File must be a PNG image")
    
    # Read the image file
    print("Uploading file to Google GenAI...")
    image_data = await image.read()
    file_obj = io.BytesIO(image_data)
    file = client.files.upload(file=file_obj, config={
        "mime_type": "image/png",
        "display_name": image.filename,
    })

    # Generate SCAD code from image
    print("Generating SCAD code from image...")
    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=[
            file,
            dedent("""
                Given this hand-drawn sketch, I need you to write SCAD code to model this in 3D.
                I need you to make the model match as close to the original sketch as possible.
                Your final response should be SCAD code only. Do not include any other text or comments.
                Surround your SCAD code with ```scad and ```.
            """)
        ],
    )
    scad_code = response.text.strip()
    if scad_code.startswith("```scad"):
        scad_code = scad_code[len("```scad"):].lstrip()
    if scad_code.endswith("```"):
        scad_code = scad_code[:-3].rstrip()

    # Convert SCAD to STL
    model_id = str(uuid.uuid4())
    print(f"Converting SCAD to STL... {model_id}")
    # Use temporary files for OpenSCAD, then upload results to Supabase
    with tempfile.TemporaryDirectory() as tmpdir:
        scad_path = os.path.join(tmpdir, f"{model_id}.scad")
        stl_path = os.path.join(tmpdir, f"{model_id}.stl")
        with open(scad_path, "w", encoding="utf-8") as f:
            f.write(scad_code)
        subprocess.run(args=["openscad", "-o", stl_path, scad_path], check=True)

        # Upload SCAD and STL to Supabase storage
        storage = supabase.storage.from_("vibecad")
        storage.upload(path=f"scad/{model_id}.scad", file=scad_code.encode("utf-8"))
        with open(stl_path, "rb") as f:
            storage.upload(path=f"stl/{model_id}.stl", file=f.read())

    # # Convert STL to GLB
    # print("Converting STL to GLB...")
    # response = requests.post(
    #     "https://api.meshy.ai/openapi/v1/remesh",
    #     headers=MESHY_HEADERS,
    #     json={
    #         "model_url": f"{os.getenv('SERVER_URL')}/stl/{model_id}.stl",
    #         "target_formats": ["glb"],
    #         # "origin_at": "bottom"
    #     },
    # )
    # response.raise_for_status()
    # task_id = response.json()["result"]

    # max_retries = 15
    # time.sleep(2)
    # for i in range(max_retries):
    #     print(f"    Attempt {i+1}/{max_retries}... ({time.time()})")
    #     response = requests.get(
    #         f"https://api.meshy.ai/openapi/v1/remesh/{task_id}",
    #         headers=MESHY_HEADERS,
    #     )
    #     response.raise_for_status()
    #     if response.json()["status"] == "SUCCEEDED":
    #         break
    #     time.sleep(5)
    # if response.json()["status"] != "SUCCEEDED":
    #     raise HTTPException(status_code=500, detail="Failed to convert STL to GLB")

    # print("Downloading GLB file...")
    # glb_url = response.json()["model_urls"]["glb"]
    # response = requests.get(
    #     glb_url,
    #     headers=MESHY_HEADERS,
    # )
    # response.raise_for_status()
    # with open(f"glb/{model_id}.glb", "wb") as f:
    #     f.write(response.content)

    print(f"Done! Model ID: {model_id}")
    return GenerateResponse(model_id=model_id)

class EditRequest(BaseModel):
    model_id: str
    prompt: str

@app.post("/edit")
async def edit(request: EditRequest):
    # Fetch current SCAD from Supabase
    storage = supabase.storage.from_("vibecad")
    try:
        scad_bytes = storage.download(path=f"scad/{request.model_id}.scad")
    except Exception:
        raise HTTPException(status_code=404, detail="Model not found")
    scad_code = scad_bytes.decode("utf-8")
    
    print("Editing SCAD code...")
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[f"""
Here is the SCAD code for a 3D model.
```scad
{scad_code}
```

Here is the prompt to edit the model.
```
{request.prompt}
```

Please edit the model to match the prompt.
Your final response should be SCAD code only. Do not include any other text or comments.
Surround your SCAD code with ```scad and ```.
"""]
        )
    scad_code = response.text.strip()
    if scad_code.startswith("```scad"):
        scad_code = scad_code[len("```scad"):].lstrip()
    if scad_code.endswith("```"):
        scad_code = scad_code[:-3].rstrip()

    print("Converting SCAD to STL...")
    with tempfile.TemporaryDirectory() as tmpdir:
        scad_path = os.path.join(tmpdir, f"{request.model_id}.scad")
        stl_path = os.path.join(tmpdir, f"{request.model_id}.stl")
        with open(scad_path, "w", encoding="utf-8") as f:
            f.write(scad_code)
        subprocess.run(args=["openscad", "-o", stl_path, scad_path], check=True)

        # Upload updated SCAD and STL
        storage.update(path=f"scad/{request.model_id}.scad", file=scad_code.encode("utf-8"), file_options={"cache-control": "3600", "upsert": "true"})
        with open(stl_path, "rb") as f:
            storage.update(path=f"stl/{request.model_id}.stl", file=f.read(), file_options={"cache-control": "3600", "upsert": "true"})

    print(f"Done! Model ID: {request.model_id}")


@app.get("/stl/{filename}")
async def get_stl_file(filename: str):
    # Stream STL from Supabase
    storage = supabase.storage.from_("vibecad")
    path = f"stl/{filename}"
    try:
        data = storage.download(path=path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return StreamingResponse(io.BytesIO(data), media_type="application/octet-stream")


@app.get("/scad/{filename}")
async def get_scad_file(filename: str):
    # Stream SCAD from Supabase
    storage = supabase.storage.from_("vibecad")
    path = f"scad/{filename}"
    try:
        data = storage.download(path=path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return StreamingResponse(io.BytesIO(data), media_type="text/plain; charset=utf-8")
