# รันไฟล์นี้ "ในเครื่องคุณเอง" ครั้งเดียว (venv เดิมที่มี tensorflow ติดตั้งอยู่แล้ว)
# เพื่อแปลง final_model.keras -> final_model.tflite (ไฟล์เล็กลง, RAM ตอนรันน้อยลงมาก)
#
# วิธีรัน:
#   cd ai_server
#   venv\Scripts\activate
#   python convert_to_tflite.py

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')  # กัน UnicodeEncodeError บน Windows console

import tensorflow as tf

MODEL_PATH = 'model/final_model.keras'
OUT_PATH   = 'model/final_model.tflite'

print("กำลังโหลดโมเดล .keras ...")
model = tf.keras.models.load_model(MODEL_PATH)

print("กำลังแปลงเป็น TFLite ...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

with open(OUT_PATH, 'wb') as f:
    f.write(tflite_model)

size_mb = len(tflite_model) / 1024 / 1024
print(f"✅ เสร็จแล้ว: {OUT_PATH} ({size_mb:.1f} MB)")
