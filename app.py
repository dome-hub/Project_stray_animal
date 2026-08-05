from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import json

app = Flask(__name__)
CORS(app) # สำคัญมาก: ให้ React เรียกใช้งานได้

# โหลดโมเดล
model = tf.keras.models.load_model('final_model.keras')

# โหลด Metadata เพื่อเอาชื่อสายพันธุ์
with open('metadata.json', 'r', encoding='utf-8') as f:
    metadata = json.load(f)
class_names = metadata['classes']

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    img = Image.open(io.BytesIO(file.read())).convert('RGB').resize((224, 224))
    img_array = np.expand_dims(np.array(img, dtype=np.float32), axis=0)
    
    preds = model.predict(img_array)
    predicted_class = class_names[np.argmax(preds)]
    
    return jsonify({'breed': predicted_class})

if __name__ == '__main__':
    app.run(port=5000, debug=True)