# Python Environment Configuration

## ⚠️ Important
Python virtual environments (`venv/`, `tutorial-env/`) are **NOT versioned** because they contain hardcoded paths specific to each machine.

## Virtual Environment Installation

### 1. MAIP (Montimage AI Platform)
```bash
cd tools/maip
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
pip install -r src/server/deep-learning/requirements.txt
```

### 2. Shennina
```bash
cd tools/shennina
python3 -m venv tutorial-env
source tutorial-env/bin/activate  # Linux/Mac
# or
tutorial-env\Scripts\activate     # Windows
pip install -r requirements.txt
```

### 3. KNX Smart Fuzzer
```bash
cd tools/knxsmartfuzzer
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### 4. Caldera
```bash
cd tools/caldera
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

## Notes
- Virtual environments are automatically ignored by Git (see `.gitignore`)
- Each tool has its own Python dependencies
- Paths in virtual environments will be automatically correct upon creation

