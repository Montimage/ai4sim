#!/bin/bash

# Script de démarrage pour Caldera
# Ce script s'assure que Caldera est exécuté depuis son répertoire

# Obtenir le répertoire du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Changer vers le répertoire de Caldera
cd "$SCRIPT_DIR"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "server.py" ]; then
    echo "Erreur: server.py non trouvé dans $SCRIPT_DIR"
    exit 1
fi

if [ ! -d "plugins" ]; then
    echo "Erreur: répertoire plugins non trouvé dans $SCRIPT_DIR"
    exit 1
fi

# Démarrer Caldera
echo "Démarrage de Caldera depuis $SCRIPT_DIR"
python3 server.py "$@" 