# GéoProduction Cameroun 🗺️

Application web de visualisation et d'analyse des données de production agricole, d'élevage et de pêche au Cameroun avec cartographie interactive.

## 🚀 Technologies

- **Frontend:** React + Vite + Leaflet
- **Backend:** Flask + SQLAlchemy + GeoAlchemy2
- **Base de données:** PostgreSQL 16 + PostGIS 3.4
- **Déploiement:** Docker + Docker Compose

## 📋 Prérequis

- Docker et Docker Compose
- Git

## 🛠️ Installation et Lancement

### 1. Cloner le projet
```bash
git clone https://github.com/shadow19walker/projet-sig.git
cd projet-sig
```

### 2. Lancer avec Docker Compose
```bash
docker compose up --build
```

L'application sera accessible sur **http://localhost:5000**

### 3. Arrêter l'application
```bash
docker compose down
```

Pour supprimer aussi les données:
```bash
docker compose down -v
```

## 📂 Structure du Projet

```
.
├── backend/              # Application Flask
│   ├── app.py           # API et serveur
│   ├── populate_db.py   # Script de peuplement DB
│   └── *.csv            # Données de production
├── client/              # Application React
│   └── src/
│       └── components/  # Composants React
├── data/                # Fichiers GeoJSON (régions, départements, communes)
├── Dockerfile           # Build multi-stage (Node + Python)
├── docker-compose.yml   # Orchestration des services
└── README.md
```

## 🌍 API Endpoints

- `GET /` - Application web (frontend)
- `GET /api/health` - Vérification santé du serveur
- `GET /api/regions` - Données des régions (GeoJSON)
- `GET /api/departments` - Données des départements (GeoJSON)
- `GET /api/communes` - Données des communes (GeoJSON)

## 🎯 Fonctionnalités

✅ Cartographie interactive avec Leaflet  
✅ Visualisation par régions, départements et communes  
✅ Données de production (agriculture, élevage, pêche)  
✅ Agrégation automatique des données spatiales  
✅ Base de données PostGIS pour requêtes géospatiales  
✅ Dockerisé pour déploiement facile  

## 🚢 Déploiement

### Option 1: Railway.app (recommandé)
1. Créer un compte sur [Railway.app](https://railway.app)
2. Connecter votre repo GitHub
3. Créer un nouveau projet depuis le repo
4. Railway détecte automatiquement le `docker-compose.yml`
5. L'application se déploie automatiquement

### Option 2: VPS (Oracle Cloud, DigitalOcean, Hetzner)
```bash
# Sur le serveur
git clone https://github.com/shadow19walker/projet-sig.git
cd projet-sig
docker compose up -d
```

## 🔧 Configuration

Les variables d'environnement sont définies dans `docker-compose.yml`:

- `DB_HOST`: Hôte PostgreSQL (défaut: `db`)
- `DB_PORT`: Port PostgreSQL (défaut: `5432`)
- `DB_NAME`: Nom de la base (défaut: `geoproduction_db`)
- `DB_USER`: Utilisateur (défaut: `postgres`)
- `DB_PASSWORD`: Mot de passe (défaut: `postgres`)

## 📊 Données

Les données sont automatiquement chargées au démarrage depuis:
- **Données spatiales:** `data/cmr_admin*.geojson`
- **Données production:** `backend/ObservationData_*.csv`

## 🐛 Troubleshooting

**Erreur de connexion à la base de données:**
```bash
docker compose down -v
docker compose up --build
```

**Port 5432 déjà utilisé:**
Modifiez le port dans `docker-compose.yml` (section `db.ports`)

**Problème de build frontend:**
Vérifiez que Node 20+ est utilisé dans le Dockerfile

## 📝 Licence

Projet académique - Université de Dschang

## 👥 Auteur

**Davy Shadow** - [GitHub](https://github.com/shadow19walker)

---

**🎓 Projet réalisé dans le cadre du cours de Systèmes d'Information Géographique**
