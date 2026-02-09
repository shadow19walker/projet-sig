# Déploiement du Projet GéoProduction avec Docker

## Prérequis

- Docker (version 20.10+)
- Docker Compose (version 2.0+)

## Structure du Déploiement

Le projet utilise une architecture multi-conteneur :

1. **PostgreSQL + PostGIS** : Base de données géospatiale
2. **Backend Flask + Frontend Build** : Application Flask servant l'API et les fichiers statiques

## Instructions de Déploiement

### 1. Cloner le repository
```bash
cd /home/davy_shadow/Documents/mes\ projets/projetTInew
```

### 2. Lancer les conteneurs

```bash
docker-compose up -d
```

Cela va :
- Construire l'image Docker (Dockerfile multi-stage)
- Démarrer le conteneur PostgreSQL avec PostGIS
- Attendre que la base de données soit prête
- Exécuter `populate_db.py` pour initialiser les données
- Construire le frontend (npm install + npm run build)
- Lancer le serveur Flask en production

### 3. Accéder à l'Application

L'application sera disponible à : **http://localhost:5000**

- **API Backend** : http://localhost:5000/api/*
- **Frontend statique** : http://localhost:5000/

### 4. Vérifier l'Etat des Conteneurs

```bash
# Voir le statut
docker-compose ps

# Voir les logs
docker-compose logs -f app

# Voir les logs de la base de données
docker-compose logs -f db
```

### 5. Arrêter les Conteneurs

```bash
docker-compose down
```

Pour supprimer aussi les volumes (données de la base) :
```bash
docker-compose down -v
```

## Configuration

Les variables d'environnement sont définies dans `docker-compose.yml` :

| Variable | Défaut | Description |
|----------|--------|-------------|
| DB_HOST | db | Hôte PostgreSQL |
| DB_PORT | 5432 | Port PostgreSQL |
| DB_NAME | geoproduction_db | Nom de la base |
| DB_USER | postgres | Utilisateur PostgreSQL |
| DB_PASSWORD | postgres | Mot de passe PostgreSQL |

### Modifier la Configuration

Éditer `docker-compose.yml` pour modifier les variables d'environnement, puis redémarrer :

```bash
docker-compose down
docker-compose up -d
```

## Détails du Dockerfile

Le Dockerfile utilise une approche **multi-stage** pour optimiser la taille :

1. **Stage 1 (frontend-builder)** :
   - Image Node.js Alpine (légère)
   - Installe les dépendances NPM
   - Construit le projet Vite
   - Génère les fichiers statiques dans `dist/`

2. **Stage 2 (runtime)** :
   - Image Python 3.11-slim
   - Installe les dépendances système (PostGIS, spatial libs)
   - Copie les dépendances Python
   - Copie le code backend
   - Copie les fichiers statiques du frontend
   - Lance le script `entrypoint.sh`

## Script d'Entrypoint

Le script `entrypoint.sh` :
1. Attend que PostgreSQL soit prêt (netcat health check)
2. Lance `populate_db.py` pour initialiser la base de données
3. Lance le serveur Flask

## Volumes et Persistance

- **postgres_data** : Persiste les données de PostgreSQL
- **CSV files** : Les fichiers de données sont montés en volume depuis le répertoire `backend/`
- **data/** : Le répertoire GeoJSON est monté en volume

## Troubleshooting

### Le conteneur app s'arrête immédiatement

```bash
docker-compose logs app
```

Vérifiez les erreurs :
- Problème de connexion à la base de données
- Erreurs Python dans `populate_db.py`
- Erreurs de construction du frontend

### La base de données ne s'initialise pas

Attendre 30-40 secondes, le script `populate_db.py` peut être long selon la taille des données.

### Port 5000 déjà utilisé

Modifier dans `docker-compose.yml` :
```yaml
app:
  ports:
    - "8080:5000"  # Accès sur http://localhost:8080
```

### Réinitialiser la base de données

```bash
docker-compose down -v
docker-compose up -d
```

## Performance et Production

- Les images Alpine/slim réduisent la taille des conteneurs
- PostgreSQL utilise PostGIS 3.4 (la version stable)
- Flask tourne en production (debug=False)
- Restart policy : `unless-stopped`

## Ports Utilisés

- **5000** : Application Flask (frontend + API)
- **5432** : PostgreSQL (disponible localement pour debug)

## Volumes et Backup

Pour sauvegarder la base de données :

```bash
docker-compose exec db pg_dump -U postgres geoproduction_db > backup.sql
```

Pour restaurer :

```bash
docker-compose exec -T db psql -U postgres geoproduction_db < backup.sql
```
