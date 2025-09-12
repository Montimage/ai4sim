#!/bin/bash

# Script optimisé pour démarrer MAIP avec les configurations iframe-friendly
echo "🚀 Starting MAIP Server with iframe-friendly configuration..."

# Se déplacer dans le dossier du script (dossier MAIP)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Vérifier si le serveur MAIP est déjà en cours d'exécution
if lsof -Pi :31057 -sTCP:LISTEN -t >/dev/null; then
    echo "✅ MAIP Server is already running on port 31057"
    exit 0
fi

# Créer un environnement virtuel et installer les dépendances Python si nécessaire
echo "🔧 Setting up Python environment..."
if [ ! -d "venv" ]; then
    python3.8 -m venv venv
fi
source venv/bin/activate

# Installer les dépendances Python si le fichier requirements.txt existe
if [ -f "requirements.txt" ] && [ ! -f "venv/.dependencies_installed" ]; then
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt
    touch venv/.dependencies_installed
fi

# Installer les dépendances Node.js du serveur principal si nécessaire
echo "🔧 Setting up main Node.js environment..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing main Node.js dependencies..."
    npm install
fi

# Aller dans le dossier client et installer les dépendances Node.js si nécessaire
echo "🔧 Setting up client Node.js environment..."
cd src/client
if [ ! -d "node_modules" ]; then
    echo "📦 Installing client Node.js dependencies..."
    npm install
fi

# Construire le client en mode production
echo "📦 Building client in production mode..."
npm run build

# Retourner au dossier racine
cd "$SCRIPT_DIR"

# Créer les répertoires de sortie s'ils n'existent pas
mkdir -p src/server/deep-learning/attacks
mkdir -p src/server/deep-learning/models
mkdir -p src/server/deep-learning/trainings
mkdir -p src/server/deep-learning/predictions
mkdir -p src/server/deep-learning/xai
mkdir -p src/server/mmt/outputs

# Configurer les paramètres iframe-friendly
echo "⚙️ Configuring iframe-friendly settings..."
cd src/server

# Créer ou mettre à jour le fichier .env avec les bonnes configurations
echo "SERVER_PORT=31057" > .env
echo "SERVER_HOST=0.0.0.0" >> .env
echo "PROTOCOL=HTTP" >> .env
echo "MODE=SERVER" >> .env
echo "NODE_ENV=development" >> .env
echo "IFRAME_FRIENDLY=true" >> .env
echo "CORS_ORIGIN=*" >> .env

echo "📝 Configuration .env updated:"
cat .env

# Démarrer le serveur MAIP avec les configurations iframe
echo "🖥️ Starting MAIP Server on port 31057..."
NODE_ENV=development node app.js &
SERVER_PID=$!

# Attendre que le serveur démarre
echo "⏳ Waiting for server to start..."
sleep 5

# Vérifier si le serveur est démarré
if lsof -Pi :31057 -sTCP:LISTEN -t >/dev/null; then
    echo "✅ MAIP Server started successfully on port 31057"
    echo "🌐 Server accessible at: http://localhost:31057"
    echo "🔧 Server configured for iframe embedding"
    echo "=== MAIP Server initialization completed ==="
    
    # Maintenir le serveur en vie
    wait $SERVER_PID
else
    echo "❌ Failed to start MAIP Server"
    echo "📝 Checking for errors..."
    exit 1
fi
