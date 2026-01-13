# Установка окружения
python -m venv venv
venv\Scripts\activate       # (Windows)
# или source venv/bin/activate (Linux/Mac)

pip install -r requirements.txt

# Запуск обучения
python train_ai_detector.py --caps capArticles.json --real realArticles.json
