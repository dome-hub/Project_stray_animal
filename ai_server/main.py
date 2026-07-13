from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
from PIL import Image
import io, json

# ── โหลดโมเดลและ metadata ─────────────────────────────────────────────────────
print("กำลังโหลดโมเดล...")
model = tf.keras.models.load_model('./model/final_model.keras')

with open('./model/metadata.json', 'r', encoding='utf-8') as f:
    metadata = json.load(f)

CLASS_NAMES = metadata['classes']
BREED_INFO  = metadata['breed_info']
IMG_SIZE    = metadata['img_size']
print(f"✅ โหลดสำเร็จ | {len(CLASS_NAMES)} สายพันธุ์ | Test Acc {metadata['test_accuracy']*100:.1f}%")

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(title="Stray Animal Analyzer API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helper ────────────────────────────────────────────────────────────────────
def แปลงรูป(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img, dtype=np.float32)
    # EfficientNet preprocessing
    arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    return np.expand_dims(arr, axis=0)

def วิเคราะห์ผล(predictions: np.ndarray) -> dict:
    top3_idx   = predictions.argsort()[-3:][::-1]
    best_idx   = top3_idx[0]
    best_class = CLASS_NAMES[best_idx]
    confidence = float(predictions[best_idx] * 100)
    info = BREED_INFO.get(best_class, {
        'ชื่อไทย': best_class, 'ประเภท': 'ไม่ทราบ',
        'ขนาด': 'ไม่ทราบ',    'นิสัย': 'ไม่มีข้อมูล',
    })
    return {
        'สายพันธุ์':   info['ชื่อไทย'],
        'ประเภท':     info['ประเภท'],
        'ขนาด':       info['ขนาด'],
        'นิสัย':      info['นิสัย'],
        'ความมั่นใจ': round(confidence, 1),
        'classKey':   best_class,
        'top3': [
            {
                'สายพันธุ์':   BREED_INFO.get(CLASS_NAMES[i], {}).get('ชื่อไทย', CLASS_NAMES[i]),
                'ความมั่นใจ': round(float(predictions[i] * 100), 1),
            }
            for i in top3_idx
        ],
    }

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status": "ok",
        "model_version": metadata['version'],
        "classes": len(CLASS_NAMES),
        "test_accuracy": f"{metadata['test_accuracy']*100:.1f}%",
    }

@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": True}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    # ตรวจสอบไฟล์
    if not file.content_type.startswith('image/'):
        raise HTTPException(400, "กรุณาส่งไฟล์รูปภาพเท่านั้น")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "ไฟล์ใหญ่เกินไป (max 10MB)")

    try:
        img_array   = แปลงรูป(contents)
        predictions = model.predict(img_array, verbose=0)[0]
        result      = วิเคราะห์ผล(predictions)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(500, f"วิเคราะห์ไม่สำเร็จ: {str(e)}")