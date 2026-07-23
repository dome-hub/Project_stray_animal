from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import onnxruntime as ort
import numpy as np
from PIL import Image
import io, json

# ── โหลดโมเดล (ONNX Runtime — เบากว่า TensorFlow เต็มตัว รองรับ op ได้กว้างกว่า TFLite) ──
print("กำลังโหลดโมเดล (ONNX)...")
session = ort.InferenceSession('./model/final_model.onnx', providers=['CPUExecutionProvider'])
INPUT_NAME = session.get_inputs()[0].name

with open('./model/metadata.json', 'r', encoding='utf-8') as f:
    metadata = json.load(f)

CLASS_NAMES = metadata['classes']
BREED_INFO  = metadata['breed_info']
IMG_SIZE    = metadata['img_size']
print(f"✅ โหลดสำเร็จ | {len(CLASS_NAMES)} สายพันธุ์ | Test Acc {metadata['test_accuracy']*100:.1f}%")

# ถ้าความมั่นใจของคลาสที่ทายได้สูงสุดต่ำกว่านี้ ถือว่าโมเดล "ไม่มั่นใจ" (น่าจะไม่ใช่สัตว์ในกลุ่มที่รู้จัก
# หรือไม่ใช่สัตว์เลย) แล้วตอบว่าระบุไม่ได้ แทนที่จะทายมั่ว ๆ ปรับตัวเลขนี้ได้ตามความเหมาะสม
CONFIDENCE_THRESHOLD = 40.0

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(title="Stray Animal Analyzer API", version="3.0-onnx-47breeds")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helper ────────────────────────────────────────────────────────────────────
def แปลงรูป(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')

    # resize แบบรักษาสัดส่วนภาพ (letterbox) แล้วเติมขอบดำให้เป็นสี่เหลี่ยมจัตุรัส
    # ต้องตรงกับตอนเทรน (tf.image.resize_with_pad) ไม่ใช้วิธีบีบภาพ (squash) แบบเดิม
    # เพราะจะทำให้สัดส่วนตัวสัตว์บิดเบี้ยวถ้ารูปไม่ใช่สี่เหลี่ยมจัตุรัสพอดี
    w, h = img.size
    scale = IMG_SIZE / max(w, h)
    new_w, new_h = round(w * scale), round(h * scale)
    img_resized = img.resize((new_w, new_h))

    canvas = Image.new('RGB', (IMG_SIZE, IMG_SIZE), (0, 0, 0))
    canvas.paste(img_resized, ((IMG_SIZE - new_w) // 2, (IMG_SIZE - new_h) // 2))

    arr = np.array(canvas, dtype=np.float32)
    # หมายเหตุ: EfficientNet ของ Keras ฝัง normalization ไว้ในตัวโมเดลเอง (preprocess_input
    # เดิมเป็นแค่ identity function) เลยส่ง pixel ดิบ [0-255] เข้าไปตรง ๆ ได้เลย
    return np.expand_dims(arr, axis=0)

def ทำนาย(img_array: np.ndarray) -> np.ndarray:
    result = session.run(None, {INPUT_NAME: img_array})
    return result[0][0]

def วิเคราะห์ผล(predictions: np.ndarray) -> dict:
    top3_idx   = predictions.argsort()[-3:][::-1]
    best_idx   = top3_idx[0]
    best_class = CLASS_NAMES[best_idx]
    confidence = float(predictions[best_idx] * 100)

    top3 = [
        {
            'สายพันธุ์':   BREED_INFO.get(CLASS_NAMES[i], {}).get('ชื่อไทย', CLASS_NAMES[i]),
            'ความมั่นใจ': round(float(predictions[i] * 100), 1),
        }
        for i in top3_idx
    ]

    # ความมั่นใจต่ำเกินไป — ไม่ทายมั่ว บอกว่าระบุไม่ได้แทน
    if confidence < CONFIDENCE_THRESHOLD:
        return {
            'สายพันธุ์':   'ไม่สามารถระบุได้',
            'ประเภท':     'ไม่ทราบ',
            'ขนาด':       'กรุณาระบุเอง',
            'นิสัย':      'กรุณาระบุเอง',
            'ความมั่นใจ': round(confidence, 1),
            'classKey':   None,
            'ระบุได้':    False,
            'top3':       top3,
        }

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
        'ระบุได้':    True,
        'top3':       top3,
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
        predictions = ทำนาย(img_array)
        result      = วิเคราะห์ผล(predictions)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(500, f"วิเคราะห์ไม่สำเร็จ: {str(e)}")
