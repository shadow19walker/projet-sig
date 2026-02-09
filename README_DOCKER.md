# 🐳 GéoProduction - Déploiement Docker

## 📖 Guide de Démarrage Rapide

Votre projet est maintenant **100% prêt pour Docker** ! 🎉

### ⚡ Démarrer en 3 commandes

```bash
# 1. Se positionner dans le répertoire du projet
cd /home/davy_shadow/Documents/mes\ projets/projetTInew

# 2. Lancer les conteneurs
docker-compose up -d

# 3. Attendre ~30-40 secondes et accéder à l'application
open http://localhost:5000  # macOS
# ou
xdg-open http://localhost:5000  # Linux
```

**C'est tout !** ✨

L'application est accessible sur **http://localhost:5000**

---

## 📚 Documentation

| Document | Contenu |
|----------|---------|
| **[DOCKER_SETUP_SUMMARY.md](DOCKER_SETUP_SUMMARY.md)** | ✅ Résumé complet de la configuration |
| **[DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)** | 📖 Guide détaillé de déploiement |
| **[DOCKER_REQUIREMENTS.md](DOCKER_REQUIREMENTS.md)** | 🔧 Prérequis et installation |
| **[DOCKER_COMMANDS.md](DOCKER_COMMANDS.md)** | 🛠️ Commandes Docker avancées |

---

## 🎯 Ce qui a été Configuré

### ✅ Backend (Flask + Python)
- Variables d'environnement pour PostgreSQL
- Endpoint `/api/health` pour health check
- Service des fichiers statiques (frontend)
- SPA routing fallback

### ✅ Frontend (React + Vite)
- Build multi-stage optimisé
- Fichiers statiques servis via Flask
- Assets cachés et compressés

### ✅ Base de Données
- PostgreSQL 16
- PostGIS 3.4 (pour spatial queries)
- Persistance via volume Docker
- Initialisation automatique via `populate_db.py`

### ✅ Infrastructure
- Docker Compose orchestration
- Network interne sécurisé
- Health checks
- Auto-restart policy

### ✅ Production (Optionnel)
- Configuration Nginx reverse proxy
- Compression Gzip
- Cache des assets

---

## 🚀 Commandes Utiles

```bash
# Démarrer
docker-compose up -d

# Arrêter
docker-compose down

# Voir les logs en temps réel
docker-compose logs -f app

# Accéder au shell du conteneur
docker-compose exec app bash

# Accéder à PostgreSQL
docker-compose exec db psql -U postgres geoproduction_db

# Sauvegarder la base de données
docker-compose exec -T db pg_dump -U postgres geoproduction_db > backup.sql

# État des services
docker-compose ps

# Redémarrer un service
docker-compose restart app
```

---

## 🐚 Script Helper

Pour des commandes plus faciles :

```bash
chmod +x deploy.sh

# Démarrer
./deploy.sh up

# Arrêter
./deploy.sh down

# Voir les logs
./deploy.sh logs

# Redémarrer
./deploy.sh restart

# Status
./deploy.sh status

# Shell dans le conteneur
./deploy.sh shell-app

# Sauvegarder la BD
./deploy.sh backup

# Aide
./deploy.sh help
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│        Navigateur (localhost:5000)      │
├─────────────────────────────────────────┤
│                                         │
│    Flask App (Backend + Frontend)       │
│  ├─ /api/*          → API calls         │
│  ├─ /               → index.html        │
│  ├─ /assets/*       → CSS, JS, images   │
│  └─ SPA routing → fallback à index.html │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│    PostgreSQL + PostGIS (BD)            │
│  ├─ Données persistes                   │
│  ├─ Spatial queries                     │
│  └─ Automatiquement initialisée         │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔄 Flux de Démarrage

1. **docker-compose up** lance les services
2. **PostgreSQL** démarre et se configure
3. **Docker attend** que PostgreSQL soit ready (health check)
4. **Frontend** est construit : `npm install && npm run build`
5. **Fichiers statiques** sont copiés dans `/app/static/`
6. **populate_db.py** initialise la base de données
7. **Flask** démarre et serve l'app sur `0.0.0.0:5000`
8. ✅ Application accessible sur `http://localhost:5000`

---

## 🔧 Configuration

### Variables d'Environnement

Fichier : `.env`

```env
DB_HOST=db
DB_PORT=5432
DB_NAME=geoproduction_db
DB_USER=postgres
DB_PASSWORD=postgres
FLASK_ENV=production
```

### Personnaliser la Configuration

1. Éditer `.env`
2. Éditer `docker-compose.yml`
3. Relancer : `docker-compose down && docker-compose up -d`

---

## 🌐 Accès à l'Application

| URL | Description |
|-----|-------------|
| http://localhost:5000 | Frontend complet |
| http://localhost:5000/api/health | Health check |
| http://localhost:5000/api/regions | API backend |

---

## 🐛 Troubleshooting

### ❌ Le conteneur crash immédiatement

```bash
docker-compose logs app
```

Vérifiez les erreurs :
- Erreur de connexion BD → Attendre 40s
- Erreur populate_db.py → Check les fichiers CSV
- Erreur npm build → Check package.json

### ❌ Port 5000 déjà utilisé

```bash
# Option 1 : Tuer le processus
lsof -i :5000
kill -9 <PID>

# Option 2 : Utiliser un autre port
# Éditer docker-compose.yml → ports: ["8080:5000"]
```

### ❌ La base de données ne s'initialise pas

Attendre 40 secondes, le script `populate_db.py` peut être long.

```bash
docker-compose logs -f db
```

### ❌ Les fichiers statiques ne se chargent pas

```bash
# Vérifier que le build frontend s'est fait correctement
docker-compose logs app | grep "npm run build"

# Reconstruire
docker-compose build --no-cache app
docker-compose restart app
```

---

## 💾 Sauvegarde et Restauration

### Sauvegarder la base de données

```bash
docker-compose exec -T db pg_dump -U postgres geoproduction_db > backup.sql
```

### Restaurer la base de données

```bash
docker-compose exec -T db psql -U postgres geoproduction_db < backup.sql
```

### Réinitialiser complètement

```bash
docker-compose down -v
docker-compose up -d
```

---

## 🚀 Production avec Nginx (Optionnel)

Pour utiliser Nginx comme reverse proxy :

```bash
docker-compose -f docker-compose.production.yml up -d
```

Accès : http://localhost:80 (port standard)

Configuration : `nginx.conf`

---

## 📁 Fichiers Docker Créés

| Fichier | Rôle |
|---------|------|
| `Dockerfile` | Build multi-stage (frontend + backend) |
| `docker-compose.yml` | Orchestration standard |
| `docker-compose.production.yml` | Avec Nginx (optionnel) |
| `.env` | Variables d'environnement |
| `.dockerignore` | Exclusions du build |
| `deploy.sh` | Script helper |
| `nginx.conf` | Config Nginx |

---

## 📋 Checklist de Déploiement

- [ ] Docker et Docker Compose installés
- [ ] `docker-compose up -d` lancé
- [ ] Logs vérifié : `docker-compose logs -f app`
- [ ] Application accessible : http://localhost:5000
- [ ] API testée : http://localhost:5000/api/health
- [ ] BD initialisée correctement
- [ ] Fichiers statiques chargés

---

## 🆘 Support

### Voir la Documentation Complète

```bash
# Setup complet
cat DOCKER_SETUP_SUMMARY.md

# Déploiement détaillé
cat DOCKER_DEPLOYMENT.md

# Commandes avancées
cat DOCKER_COMMANDS.md

# Prérequis
cat DOCKER_REQUIREMENTS.md
```

### Vérifier l'État

```bash
docker-compose ps
docker-compose logs app
docker-compose exec app curl http://localhost:5000/api/health
```

---

## 🎉 Résumé

| Aspect | Status |
|--------|--------|
| ✅ Dockerfile | Prêt |
| ✅ Docker Compose | Prêt |
| ✅ PostgreSQL + PostGIS | Configuré |
| ✅ Frontend Build | Automatisé |
| ✅ Backend Flask | Adapté |
| ✅ Variables d'env | Configuré |
| ✅ Health Checks | Activés |
| ✅ Fichiers statiques | Servis |
| ✅ Documentation | Complète |
| ✅ Production Ready | Oui |

---

**Le projet est maintenant 100% prêt pour déployer avec Docker !** 🎊

Lancez simplement :
```bash
docker-compose up -d
```

Et votre application sera accessible sur **http://localhost:5000** en 30-40 secondes.

---

*Documentation créée le 9 février 2026*
