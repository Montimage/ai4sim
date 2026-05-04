# Guide d'Intégration KNX Smart Fuzzer - MMT-Pentester Dashboard

## Vue d'Ensemble

Le **KNX Smart Fuzzer** est maintenant complètement intégré dans le dashboard MMT-Pentester, remplaçant l'ancienne implémentation factice par un véritable composant de test de sécurité KNX avec 6 attaques spécialisées.

## Attaques Disponibles

### 1. BOF Fuzzing (Attack ID: 1)
- **Description**: Fuzzing cEMI avec messages PropRead.req malformés
- **Objectif**: Tester la robustesse du dispositif KNX face aux données corrompues
- **Technique**: Mutation aléatoire des champs cEMI (excluant message_code et payload)
- **Durée estimée**: 10-30 minutes

### 2. Accès Non Autorisé (Attack ID: 2)
- **Description**: Exploitation du manque d'authentification KNX
- **Objectif**: Envoyer des commandes GroupValueWrite non autorisées
- **Technique**: Envoi de commandes de contrôle (ex: fermeture climatisation)
- **Durée estimée**: 5-10 minutes

### 3. Scan Réseau KNX (Attack ID: 3)
- **Description**: Découverte de routeurs/interfaces KNX/IP
- **Objectif**: Cartographier l'infrastructure KNX réseau
- **Technique**: Messages multicast vers 224.0.23.12 + Description Requests
- **Durée estimée**: 2-5 minutes

### 4. Scan Bus KNX (Attack ID: 4)
- **Description**: Découverte des dispositifs KNX connectés au bus
- **Objectif**: Énumérer tous les dispositifs KNX (adresses 1.1.1 à 1.1.255)
- **Technique**: Scan ligne par ligne avec requêtes de description
- **Durée estimée**: 15-45 minutes

### 5. Flooding DoS (Paquets Valides) (Attack ID: 5)
- **Description**: Attaque de déni de service avec paquets KNX valides
- **Objectif**: Surcharger le dispositif avec des heartbeats légitimes
- **Technique**: Envoi massif de GroupValueWrite vers 0/0/2
- **Durée estimée**: Continu jusqu'à arrêt manuel

### 6. Flooding DoS (Paquets Invalides) (Attack ID: 6)
- **Description**: Attaque de déni de service avec paquets partiellement invalides
- **Objectif**: Surcharger avec des messages KNX malformés
- **Technique**: GroupValueWrite avec adresses source/destination aléatoires
- **Durée estimée**: Continu jusqu'à arrêt manuel

## Configuration Docker

### Image Officielle
```bash
gitlab.ithaca.ece.uowm.gr:5050/ai4cyber/knxsmartfuzzer-v1:latest
```

### Construction Locale
Si l'image GitLab n'est pas accessible :
```bash
cd tools/knxsmartfuzzer
./build-docker.sh
```

### Privilèges Requis
Le conteneur nécessite des privilèges étendus :
- `--net=host` : Accès réseau direct
- `--cap-add=NET_ADMIN` : Configuration réseau
- `--cap-add=NET_RAW` : Sockets raw
- `--privileged` : Privilèges administrateur

## Utilisation dans MMT-Pentester

### Interface Utilisateur
1. **Sélection d'Outil**: Choisir "KNX Smart Fuzzer" dans la liste des outils
2. **Configuration d'Attaque**: Sélectionner le type d'attaque (1-6)
3. **Paramètres Cible**: 
   - Serveur KNX/IP (adresse IP)
   - Port KNX (défaut: 3671)
4. **Exécution**: Lancer l'attaque via le dashboard

### Paramètres de Configuration
```typescript
{
  'attack-id': '1-6',           // Type d'attaque
  'knx-server': '192.168.1.1',  // IP du serveur KNX
  'knx-port': '3671'            // Port KNX (UDP)
}
```

### Commande Docker Générée
```bash
docker -H unix:///var/run/docker.sock run -it \
  --net=host \
  --cap-add=NET_ADMIN \
  --cap-add=NET_RAW \
  --privileged \
  gitlab.ithaca.ece.uowm.gr:5050/ai4cyber/knxsmartfuzzer-v1:latest \
  ./main.sh --attack-id 1 --knxserver 192.168.1.1 --knxport 3671
```

## Intégration Technique

### Frontend (React/TypeScript)
- **Fichier**: `frontend/src/constants/ai4cyberTools.ts`
- **Outil ID**: `knx-smart-fuzzer`
- **Interface**: Sélecteur d'attaque avec descriptions détaillées
- **Validation**: Paramètres requis et optionnels

### Backend (Node.js/TypeScript)
- **Fichier**: `backend/src/services/AttackService.ts`
- **Gestion**: Construction de commandes Docker
- **Compatibilité**: Support de l'ancien ID `ai-knx-fuzzer`
- **Extraction**: ID d'attaque depuis le texte sélectionné

### Mappings d'Affichage
- **Fichier**: `frontend/src/constants/toolMapping.ts`
- **Noms d'Outils**: Mapping des IDs techniques vers noms d'affichage
- **Noms d'Attaques**: Mapping spécialisé pour chaque type d'attaque KNX

## Monitoring et Logs

### Sortie en Temps Réel
- Logs d'exécution via WebSocket
- Progression des attaques
- Résultats de découverte (scan réseau/bus)
- Erreurs et exceptions

### Métriques de Performance
- Nombre de paquets envoyés
- Dispositifs découverts
- Taux de réponse
- Temps d'exécution

## Sécurité et Bonnes Pratiques

### ⚠️ Avertissements Importants
1. **Environnement de Test**: Utiliser uniquement sur des réseaux de test
2. **Autorisation**: S'assurer d'avoir l'autorisation avant les tests
3. **Impact**: Les attaques DoS peuvent affecter la disponibilité
4. **Isolation**: Isoler les environnements de test du réseau de production

### Recommandations
- Tester d'abord avec l'attaque de scan réseau (ID: 3)
- Utiliser des timeouts appropriés pour les attaques DoS
- Surveiller l'impact sur les dispositifs cibles
- Documenter tous les tests effectués

## Dépannage

### Problèmes Courants

#### Image Docker Non Trouvée
```bash
# Solution: Construire localement
cd tools/knxsmartfuzzer
./build-docker.sh
```

#### Privilèges Insuffisants
```bash
# Vérifier que Docker a les privilèges nécessaires
docker info | grep -i security
```

#### Connectivité Réseau
```bash
# Tester la connectivité KNX
ping <knx-server-ip>
nmap -sU -p 3671 <knx-server-ip>
```

#### Logs de Debug
```bash
# Activer les logs détaillés
export DEBUG=knx:*
```

## Évolutions Futures

### Améliorations Prévues
1. **Interface Graphique**: Visualisation des résultats de scan
2. **Rapports**: Génération automatique de rapports de test
3. **Intégration IA**: Analyse intelligente des réponses
4. **Personnalisation**: Paramètres d'attaque avancés

### Nouvelles Attaques
- Attaques de replay
- Fuzzing basé sur grammaire
- Tests de performance
- Analyse de protocole avancée

## Support et Documentation

### Ressources
- **Code Source**: `tools/knxsmartfuzzer/`
- **Documentation BOF**: Framework sous-jacent
- **Spécifications KNX**: Standards KNX/EIB
- **Docker Hub**: Images de conteneur

### Contact
Pour questions techniques ou problèmes d'intégration, consulter la documentation du projet MMT-Pentester ou créer une issue dans le repository.

---

**Note**: Cette intégration remplace complètement l'ancienne implémentation factice du KNX fuzzer par un véritable outil de test de sécurité industrielle. 