import os
from fastapi import FastAPI, HTTPException, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from google import genai
from pydantic import BaseModel
import io
import subprocess
import uuid
from textwrap import dedent
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()
client = genai.Client()

app.mount("/stl", StaticFiles(directory="stl"), name="stl")

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
    print("Converting SCAD to STL...")
    model_id = str(uuid.uuid4())
    with open(f"scad/{model_id}.scad", "w") as f:
        f.write(scad_code)
    subprocess.run(args=["openscad", "-o", f"stl/{model_id}.stl", f"scad/{model_id}.scad"], check=True)

    print(f"Done! Model ID: {model_id}")
    return GenerateResponse(model_id=model_id)

class EditRequest(BaseModel):
    model_id: str
    prompt: str

@app.post("/edit")
async def edit(request: EditRequest):
    if not os.path.exists(f"scad/{request.model_id}.scad"):
        raise HTTPException(status_code=404, detail="Model not found")
    
    with open(f"scad/{request.model_id}.scad", "r") as f:
        scad_code = f.read()
    
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
    with open(f"scad/{request.model_id}.scad", "w") as f:
        f.write(scad_code)
    subprocess.run(args=["openscad", "-o", f"stl/{request.model_id}.stl", f"scad/{request.model_id}.scad"], check=True)

    print(f"Done! Model ID: {request.model_id}")
