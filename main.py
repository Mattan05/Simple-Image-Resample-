from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFilter
import zipfile, io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def resize_to_print(img, w_cm, h_cm, dpi):
    w_px = int((w_cm / 2.54) * dpi)
    h_px = int((h_cm / 2.54) * dpi)

    # Stegvis uppskalning om bilden är mycket mindre än målet
    while img.width < w_px * 0.5 or img.height < h_px * 0.5:
        img = img.resize((img.width * 2, img.height * 2), Image.Resampling.LANCZOS)

    # Stretcha direkt till målstorlek utan att bry sig om aspect ratio
    img = img.resize((w_px, h_px), Image.Resampling.LANCZOS)

    # Skärpningspass för att efterlikna Photopeas bicubic sharper
    img = img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=50, threshold=3))

    return img


def upscale_to_dpi(img, target_dpi):
    current_dpi = img.info.get("dpi", (72, 72))
    current_dpi_x = current_dpi[0] if isinstance(current_dpi, tuple) else current_dpi

    if current_dpi_x <= 0:
        current_dpi_x = 72

    scale = target_dpi / current_dpi_x

    if scale > 1.0:
        new_w = int(img.width * scale)
        new_h = int(img.height * scale)

        # Stegvis uppskalning
        while img.width < new_w * 0.5 or img.height < new_h * 0.5:
            img = img.resize((img.width * 2, img.height * 2), Image.Resampling.LANCZOS)

        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        img = img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=50, threshold=3))

    return img


@app.post("/batch")
async def batch_process(
    files: list[UploadFile] = File(...),
    dpi: int = 500,
    width_cm: float | None = None,
    height_cm: float | None = None
):
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w") as zipf:
        for f in files:
            img = Image.open(f.file)

            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            if width_cm and height_cm:
                img = resize_to_print(img, width_cm, height_cm, dpi)
            else:
                img = upscale_to_dpi(img, dpi)

            output = io.BytesIO()
            img.save(output, format="JPEG", dpi=(dpi, dpi), quality=95)
            output.seek(0)

            zipf.writestr(f.filename, output.read())

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=posters.zip"}
    )