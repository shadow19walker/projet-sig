# Configuration requise pour le déploiement Docker

## Versions minimales requises

### Obligatoire
- **Docker** >= 20.10.0
- **Docker Compose** >= 2.0.0

### Optionnel (pour production)
- **Docker Swarm** (orchestration multi-nœuds)
- **Portainer** (interface Docker graphique)

## Installation

### Ubuntu/Debian
```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose (généralement inclus avec Docker Desktop)
sudo apt-get install docker-compose
```

### MacOS
```bash
# Installer Docker Desktop depuis https://www.docker.com/products/docker-desktop
# Docker Compose est inclus
```

### Windows
```bash
# Installer Docker Desktop depuis https://www.docker.com/products/docker-desktop
# WSL2 backend recommandé
```

## Vérification

```bash
docker --version
# Docker version 20.10.x or higher

docker-compose --version
# Docker Compose version 2.x.x or higher
```

## Prérequis Système

- **Espace disque** : ~3-5 GB minimum
  - PostgreSQL image: ~300 MB
  - Node.js image: ~400 MB
  - Python image: ~200 MB
  - Build artifacts & données: ~2-3 GB

- **RAM** : 2 GB minimum (4 GB recommandé)

- **CPU** : Tout processeur moderne

## Ports Requis

| Port | Service | Usage |
|------|---------|-------|
| 5000 | Flask App | HTTP frontend + API |
| 5432 | PostgreSQL | Database (local access only) |
| 80 | Nginx | HTTP (production avec nginx) |
| 443 | Nginx | HTTPS (production avec nginx) |

## Problèmes Courants à l'Installation

### ❌ Permission denied while trying to connect to the Docker daemon
```bash
# Solution : Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

### ❌ "docker-compose: command not found"
```bash
# Vérifier que Docker Compose est installé
which docker-compose

# Ou utiliser la nouvelle syntaxe
docker compose version
```

### ❌ Port 5000 déjà utilisé
```bash
# Identifier le processus
lsof -i :5000

# Ou modifier le port dans docker-compose.yml
# ports: ["8000:5000"]
```

## Vérification de la Disponibilité des Ports

```bash
# Linux/Mac
lsof -i :5000
lsof -i :5432

# Ou avec netstat
ss -tulpn | grep -E ':(5000|5432)'

# Windows
netstat -ano | findstr :5000
netstat -ano | findstr :5432
```

## Optimisations Docker

### Limits de Ressources (optionnel)
Ajouter dans docker-compose.yml pour chaque service :
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

### Logging et Monitoring
```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Documentation Additionnelle

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Flask Documentation](https://flask.palletsprojects.com/)
