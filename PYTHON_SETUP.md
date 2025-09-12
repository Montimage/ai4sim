# Configuration des Environnements Python

## ⚠️ Important
Les environnements virtuels Python (`venv/`, `tutorial-env/`) ne sont **PAS versionnés** car ils contiennent des chemins hardcodés spécifiques à chaque machine.

## Installation des Environnements Virtuels

### 1. MAIP (Montimage AI Platform)
```bash
cd tools/maip
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
pip install -r src/server/deep-learning/requirements.txt
```

### 2. Shennina
```bash
cd tools/shennina
python3 -m venv tutorial-env
source tutorial-env/bin/activate  # Linux/Mac
# ou
tutorial-env\Scripts\activate     # Windows
pip install -r requirements.txt
```

### 3. KNX Smart Fuzzer
```bash
cd tools/knxsmartfuzzer
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### 4. Caldera
```bash
cd tools/caldera
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

## Notes
- Les environnements virtuels sont automatiquement ignorés par Git (voir `.gitignore`)
- Chaque outil a ses propres dépendances Python
- Les chemins dans les environnements virtuels seront automatiquement corrects lors de la création

