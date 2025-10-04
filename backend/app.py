from fastapi import FastAPI, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
import io
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()
client = genai.Client()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate")
async def generate(image: UploadFile = File(...)):
    # Validate that the uploaded file is a PNG
    if not image.content_type == "image/png":
        return {"error": "File must be a PNG image"}
    
    # Read the image file
    image_data = await image.read()
    file_obj = io.BytesIO(image_data)
    file = client.files.upload(file=file_obj, mime_type="image/png", name=image.filename)

    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=[
            file,
            f"Generate a 3D CAD model of the following image: {image.filename}",
        ]
    )

    
    # Here you can process the image data as needed
    # For now, just return a success message with file info
    return {
        "message": "Image received successfully",
        "filename": image.filename,
        "content_type": image.content_type,
        "file_size": len(image_data)
    }
