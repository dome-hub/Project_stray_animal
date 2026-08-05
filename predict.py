import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' # ปิดข้อความเตือนของ TensorFlow

import tensorflow as tf
import numpy as np
import json
from PIL import Image

# 1. โหลดโมเดลและ Metadata
model = tf.keras.models.load_model('final_model.keras')

with open('metadata.json', 'r', encoding='utf-8') as f:
    metadata = json.load(f)
class_names = metadata['classes']

# 2. ฟังก์ชันทำนายผล
def predict_image(image_path):
    img = Image.open(image_path).convert('RGB').resize((224, 224))
    img_array = np.expand_dims(np.array(img, dtype=np.float32), axis=0)
    
    preds = model.predict(img_array)
    return class_names[np.argmax(preds)]

# 3. ทดสอบ
print(f"ผลการทำนาย: {predict_image('test_images/4.Shiba Inu.jpeg')}")
print(f"ผลการทำนาย: {predict_image('test_images/21.Pug.jpg')}")