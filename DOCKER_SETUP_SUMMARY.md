# 📦 Configuration Docker - Résumé Complet

## ✅ Fichiers Créés/Modifiés

### 1. **Dockerfile** (Multi-stage build)
- Stage 1 : Build frontend (Node.js + Vite)
- Stage 2 : Runtime (Python + PostgreSQL client)
- Installe les dépendances système pour PostGIS
- Script d'entrypoint automatique

### 2. **docker-compose.yml** (Configuration Standard)
- PostgreSQL 16 avec PostGIS 3.4
- Conteneur Flask pour backend + frontend statique
- Network interne pour communication entre services
- Volumes pour persistance des données
- Health checks

### 3. **docker-compose.production.yml** (Optionnel)
- Ajoute Nginx en reverse proxy
- Pour production avec domain/SSL

### 4. **nginx.conf** (Configuration Nginx)
- Reverse proxy vers Flask
- Compression Gzip
- Cache des assets statiques
- Prêt pour HTTPS/SSL

### 5. **.env**
- Variables d'environnement pour la connexion BD
- Configuration Flask

### 6. **.dockerignore**
- Exclut les fichiers inutiles du build Docker

### 7. **app.py** (Modifications)
- ✅ Variables d'environnement pour BD
- ✅ Endpoint `/api/health` pour health check
- ✅ Configuration fichiers statiques
- ✅ Routes SPA fallback
- ✅ Host 0.0.0.0 pour Docker

### 8. **deploy.sh** (Script Helper)
- Commandes simplifiées (up, down, restart, logs, backup, etc.)
- Interactive shell access
- Gestion complète

### 9. **DOCKER_DEPLOYMENT.md**
- Documentation complète
- Instructions de déploiement
- Troubleshooting
- Commandes utiles

---

## 🚀 Démarrage Rapide

### Première utilisation :
```bash
cd /home/davy_shadow/Documents/mes\ projets/projetTInew
docker-compose up -d
```

### Avec le script helper :
```bash
chmod +x deploy.sh
./deploy.sh up
```

### Accès à l'application :
```
http://localhost:5000
```

---

## 📊 Architecture

```
┌─────────────────────────────────────┐
│         Client (Navigateur)         │
└────────────────┬────────────────────┘
                 │
        HTTP:5000 (port expose)
                 │
┌────────────────▼────────────────────┐
│     Flask App + Static Files        │
│  ├─ API Backend (/api/*)           │
│  ├─ Frontend HTML/CSS/JS (/*)      │
│  └─ SPA Routing Fallback           │
└────────────────┬────────────────────┘
                 │
        TCP:5432 (internal)
                 │
┌────────────────▼────────────────────┐
│   PostgreSQL + PostGIS              │
│  ├─ Spatial Queries                │
│  ├─ GeoJSON Support                │
│  └─ Persistent Volume              │
└─────────────────────────────────────┘
```

---

## 🔄 Flux de Démarrage dans Docker

1. **Docker Compose lance PostgreSQL**
   - Image PostGIS 16-3.4
   - Attend health check (5 tentatives)

2. **Docker Compose lance l'App**
   - Dépend de la BD (condition: service_healthy)
   - Exécute l'entrypoint.sh

3. **Dans le Conteneur App** :
   - Build frontend: `npm install && npm run build`
   - Copie dist/ → /app/static/
   - Attend PostgreSQL avec netcat
   - Lance: `python populate_db.py`
   - Démarre: `python app.py`

4. **Flask répond sur http://localhost:5000**
   - API: `/api/*`
   - Frontend statique: `/` et `/assets/*`

---

## 📁 Structure des Fichiers Générés

```
projetTInew/
├── Dockerfile                      # Multi-stage build
├── docker-compose.yml              # Déploiement standard
├── docker-compose.production.yml   # Avec Nginx (optionnel)
├── nginx.conf                      # Config Nginx
├── .env                            # Variables d'environnement
├── .dockerignore                   # Exclusions Docker
├── .gitignore                      # Exclusions Git
├── deploy.sh                       # Script de déploiement
├── DOCKER_DEPLOYMENT.md            # Documentation
├── backend/
│   ├── app.py                      # ✅ Modifié pour Docker
│   ├── populate_db.py
│   ├── requirements.txt
│   └── *.csv
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
└── data/
    └── *.geojson
```

---

## 🔐 Considérations de Sécurité

### Actuellement (Développement) :
- Mot de passe BD en clair dans .env ✓
- CORS activé ✓
- Debug mode OFF en production ✓

### Pour Production :
- Utiliser Docker secrets pour les mots de passe
- HTTPS avec Let's Encrypt
- CORS restrictif
- Reverse proxy Nginx
- Rate limiting

---

## 🐛 Troubleshooting Rapide

### Le conteneur app crash immédiatement
```bash
docker-compose logs app
```

### Port 5000 déjà utilisé
```bash
# Modifier docker-compose.yml:
# ports: ["8080:5000"]
docker-compose down
docker-compose up -d
```

### Réinitialiser complètement
```bash
docker-compose down -v
docker-compose up -d
```

### Voir les logs en temps réel
```bash
docker-compose logs -f app
docker-compose logs -f db
```

---

## 📝 Commandes Utiles

| Commande | Action |
|----------|--------|
| `docker-compose up -d` | Démarrer en arrière-plan |
| `docker-compose down` | Arrêter |
| `docker-compose logs -f app` | Logs en continu |
| `docker-compose ps` | État des services |
| `docker-compose exec app bash` | Shell dans le conteneur |
| `docker-compose exec db psql -U postgres geoproduction_db` | SQL shell |

---

## ✨ Avantages du Setup

✅ **Reproductibilité** : Marche partout (Linux, Mac, Windows)
✅ **Facilité** : Un seul `docker-compose up`
✅ **Production-Ready** : Multi-stage build optimisé
✅ **Development-Friendly** : Hot reload possible avec volumes
✅ **PostGIS** : Spatial queries out-of-the-box
✅ **Isolation** : BD, app, frontend isolés
✅ **Persistence** : Données sauvegardées en volumes
✅ **Scalabilité** : Prêt pour Kubernetes/Swarm

---

## 🎯 Prochaines Étapes

1. ✅ Teste : `docker-compose up -d`
2. ✅ Visite : http://localhost:5000
3. ✅ Check les logs : `docker-compose logs -f app`
4. ✅ Optionnel - Production : `docker-compose -f docker-compose.production.yml up -d`

---

**Créé le** : 9 février 2026
**Version** : 1.0
**Status** : ✅ Prêt pour déploiement
