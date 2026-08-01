from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict, deque
import onnxruntime as ort
import numpy as np
from PIL import Image
import io, json, os, time

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

# โดเมนที่อนุญาตให้เรียก API นี้ได้ — เดิมเปิดกว้าง ["*"] คือใครก็เอาไปฝังในเว็บตัวเองได้
# ต้องมีครบทั้งเว็บที่ deploy และ origin ของแอปมือถือ (Capacitor) ไม่งั้นฟีเจอร์วิเคราะห์รูปจะพัง
# เพิ่ม/แก้โดเมนได้ทาง env ALLOWED_ORIGINS (คั่นด้วยจุลภาค) โดยไม่ต้องแก้โค้ด
_origins_เริ่มต้น = [
    'https://project-stray-animal.onrender.com',       # เว็บทดสอบทั่วไป
    'https://project-stray-animal-4z3d.onrender.com',  # ชื่อเก่าของเว็บหลัก (เผื่อยังมีลิงก์เก่าค้างอยู่)
    'https://jaengjon.onrender.com',                   # เว็บหลักที่ใช้ AI (เปลี่ยนชื่อจาก -4z3d)
    'http://localhost:5173',    # vite dev
    'http://localhost:4173',    # vite preview
    'https://localhost',        # Capacitor Android (androidScheme ค่าเริ่มต้น)
    'capacitor://localhost',    # Capacitor iOS
]
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv('ALLOWED_ORIGINS', ','.join(_origins_เริ่มต้น)).split(',') if o.strip()
]
print(f"🔒 CORS อนุญาต {len(ALLOWED_ORIGINS)} origin: {', '.join(ALLOWED_ORIGINS)}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Rate limit: กันยิงรัวจนกินทรัพยากรเซิร์ฟเวอร์ (endpoint นี้เปิดสาธารณะ ไม่มี auth) ──
# นับแบบ sliding window เก็บในหน่วยความจำ — รีเซ็ตเมื่อเซิร์ฟเวอร์ restart ซึ่งรับได้
# สำหรับจุดประสงค์นี้ (กันสแปม ไม่ใช่กันคนตั้งใจโจมตีจริงจัง)
RATE_LIMIT_MAX    = int(os.getenv('RATE_LIMIT_MAX', '20'))     # เรียกได้กี่ครั้ง
RATE_LIMIT_WINDOW = int(os.getenv('RATE_LIMIT_WINDOW', '300'))  # ต่อกี่วินาที (300 = 5 นาที)

_ประวัติเรียก = defaultdict(deque)

def ไอพีผู้เรียก(request: Request) -> str:
    # Render อยู่หลัง proxy — IP จริงของผู้เรียกอยู่ตัวแรกสุดใน X-Forwarded-For
    fwd = request.headers.get('x-forwarded-for')
    if fwd:
        return fwd.split(',')[0].strip()
    return request.client.host if request.client else 'unknown'

def เช็คRateLimit(request: Request):
    ip     = ไอพีผู้เรียก(request)
    ตอนนี้ = time.time()
    คิว    = _ประวัติเรียก[ip]

    # ตัดรายการที่เก่ากว่าช่วงเวลาที่นับทิ้ง
    while คิว and ตอนนี้ - คิว[0] > RATE_LIMIT_WINDOW:
        คิว.popleft()

    if len(คิว) >= RATE_LIMIT_MAX:
        raise HTTPException(429, "เรียกใช้ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่")

    คิว.append(ตอนนี้)

    # เก็บกวาด IP ที่หมดอายุแล้ว กัน dict โตไม่จำกัดจนกินหน่วยความจำ
    if len(_ประวัติเรียก) > 1000:
        หมดอายุ = [k for k, v in _ประวัติเรียก.items() if not v or ตอนนี้ - v[-1] > RATE_LIMIT_WINDOW]
        for k in หมดอายุ:
            del _ประวัติเรียก[k]

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

def แปลงรูป_เซ็นเตอร์ครอป(image_bytes: bytes) -> np.ndarray:
    # ครอปสี่เหลี่ยมจัตุรัสตรงกลางภาพ (ตัดส่วนเกินด้านที่ยาวกว่าออก) แล้วซูมเข้า resize เต็มขนาด
    # ช่วยกรณีตัวสัตว์อยู่กลางภาพแต่ไม่เต็มเฟรม จะเห็นรายละเอียดสัตว์ชัดขึ้นกว่าวิธี letterbox เพียงอย่างเดียว
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top  = (h - side) // 2
    img_cropped = img.crop((left, top, left + side, top + side))
    img_resized = img_cropped.resize((IMG_SIZE, IMG_SIZE))

    arr = np.array(img_resized, dtype=np.float32)
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
async def analyze(file: UploadFile = File(...), _rate = Depends(เช็คRateLimit)):
    # ตรวจสอบไฟล์
    if not file.content_type.startswith('image/'):
        raise HTTPException(400, "กรุณาส่งไฟล์รูปภาพเท่านั้น")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "ไฟล์ใหญ่เกินไป (max 10MB)")

    try:
        # ── TTA (Test-Time Augmentation) ──
        # วิเคราะห์ 2 มุมมองแล้วเฉลี่ยผลลัพธ์ กันกรณีตัวสัตว์อยู่มุม/เล็กในเฟรมทำให้แม่นน้อยลง
        img_letterbox = แปลงรูป(contents)              # เห็นทั้งภาพ (รักษาสัดส่วน)
        img_center    = แปลงรูป_เซ็นเตอร์ครอป(contents)  # ซูมตรงกลาง

        pred_letterbox = ทำนาย(img_letterbox)
        pred_center    = ทำนาย(img_center)

        predictions = (pred_letterbox + pred_center) / 2
        result      = วิเคราะห์ผล(predictions)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(500, f"วิเคราะห์ไม่สำเร็จ: {str(e)}")
