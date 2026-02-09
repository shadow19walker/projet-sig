# 🛠️ Commandes Docker Avancées

## 📋 Commandes de Base

### Démarrer les services
```bash
docker-compose up -d
```

### Arrêter les services
```bash
docker-compose down
```

### Redémarrer tous les services
```bash
docker-compose restart
```

### Redémarrer un service spécifique
```bash
docker-compose restart app
docker-compose restart db
```

---

## 📊 Monitoring et Logs

### Voir les logs en temps réel
```bash
docker-compose logs -f
```

### Voir les logs d'un service spécifique
```bash
docker-compose logs -f app      # Backend + Frontend
docker-compose logs -f db       # Database
```

### Voir les dernières N lignes
```bash
docker-compose logs --tail 100 app
```

### Afficher les timestamps
```bash
docker-compose logs -f --timestamps app
```

### État des conteneurs
```bash
docker-compose ps
```

### Usage des ressources
```bash
docker stats
```

---

## 🔍 Debugging et Inspection

### Accéder au shell du conteneur app
```bash
docker-compose exec app /bin/bash
```

### Accéder au shell du conteneur db
```bash
docker-compose exec db /bin/bash
```

### SQL shell PostgreSQL
```bash
docker-compose exec db psql -U postgres geoproduction_db
```

### Voir les variables d'environnement
```bash
docker-compose exec app env
```

### Voir la configuration Docker Compose active
```bash
docker-compose config
```

### Inspecter un conteneur
```bash
docker inspect geoproduction_app
```

---

## 🗄️ Gestion de la Base de Données

### Dump la base de données (sauvegarde)
```bash
docker-compose exec -T db pg_dump -U postgres geoproduction_db > backup.sql
```

### Restore une sauvegarde
```bash
docker-compose exec -T db psql -U postgres geoproduction_db < backup.sql
```

### Voir la taille de la base
```bash
docker-compose exec db psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('geoproduction_db'));"
```

### Compacter la base de données
```bash
docker-compose exec db psql -U postgres geoproduction_db -c "VACUUM ANALYZE;"
```

### Voir les tables
```bash
docker-compose exec db psql -U postgres geoproduction_db -c "\dt"
```

### Voir les statistiques des tables
```bash
docker-compose exec db psql -U postgres geoproduction_db -c "SELECT * FROM information_schema.tables WHERE table_schema='public';"
```

---

## 🔧 Reconstruction et Cleanup

### Reconstruire l'image
```bash
docker-compose build
```

### Reconstruire sans cache
```bash
docker-compose build --no-cache
```

### Reconstruire un service spécifique
```bash
docker-compose build app
```

### Supprimer tous les conteneurs et volumes
```bash
docker-compose down -v
```

### Supprimer les images locales
```bash
docker rmi $(docker images -q)
```

### Nettoyer les ressources inutilisées
```bash
docker system prune
```

### Nettoyer les volumes inutilisés
```bash
docker volume prune
```

---

## 🚀 Déploiement avec Nginx

### Lancer avec Nginx (production)
```bash
docker-compose -f docker-compose.production.yml up -d
```

### Vérifier la configuration Nginx
```bash
docker-compose -f docker-compose.production.yml exec nginx nginx -t
```

### Recharger la configuration Nginx
```bash
docker-compose -f docker-compose.production.yml exec nginx nginx -s reload
```

---

## 🔗 Networking

### Voir les networks Docker
```bash
docker network ls
```

### Inspecter le network
```bash
docker network inspect geoproduction_network
```

### Tester la connectivité entre conteneurs
```bash
docker-compose exec app ping db
```

### Voir les connexions ouvertes
```bash
docker-compose exec app netstat -tulpn
```

---

## 📦 Gestion des Images

### Lister les images locales
```bash
docker images
```

### Voir la taille d'une image
```bash
docker images --no-trunc -q | xargs -I {} docker inspect --format='{{.RepoTags}} {{.Size}}' {}
```

### Supprimer une image
```bash
docker rmi image_name:tag
```

### Exporter une image
```bash
docker save geoproduction_app > backup.tar
```

### Importer une image
```bash
docker load < backup.tar
```

---

## 📱 Développement avec Hot Reload

### Ajouter au docker-compose.yml pour le développement
```yaml
app:
  volumes:
    - ./backend:/app  # Hot reload Python
    - ./client/src:/app/client/src  # Hot reload React
```

### Lancer en mode développement
```bash
docker-compose up --build
```

---

## 📊 Performance et Optimization

### Voir l'usage disque
```bash
docker system df
```

### Voir l'arborescence des layers d'une image
```bash
docker history geoproduction_app
```

### Optimiser les layers du Dockerfile
```bash
# Combiner les RUN commands
RUN apt-get update && \
    apt-get install -y package1 package2 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

---

## 🔐 Secrets et Configuration

### Passer des secrets via fichier .env
```bash
# .env
DB_PASSWORD=my_secret_password

# docker-compose.yml
environment:
  - DB_PASSWORD=${DB_PASSWORD}
```

### Utiliser docker secrets (Swarm mode)
```bash
echo "my_password" | docker secret create db_password -
```

---

## 🐛 Troubleshooting

### Voir les erreurs de build
```bash
docker-compose build --no-cache app 2>&1
```

### Vérifier la syntaxe du docker-compose.yml
```bash
docker-compose config
```

### Vérifier la connectivité réseau
```bash
docker-compose exec app curl http://localhost:5000/api/health
```

### Vérifier la base de données
```bash
docker-compose exec db pg_isready
```

### Voir les processus en cours
```bash
docker-compose exec app ps aux
```

---

## 🔄 CI/CD Integration

### Lancer les tests
```bash
docker-compose exec app python -m pytest
```

### Lancer le linter
```bash
docker-compose exec app eslint .
```

### Générer un coverage report
```bash
docker-compose exec app python -m coverage run -m pytest
docker-compose exec app python -m coverage report
```

---

## 📈 Scaling (Multi-instances)

### Lancer 3 instances de l'app (load balancing)
```bash
docker-compose up -d --scale app=3
```

### Ajouter un load balancer
```yaml
load-balancer:
  image: nginx:alpine
  ports:
    - "80:80"
  depends_on:
    - app
```

---

## 🔔 Alertes et Notifications

### Health check personnalisé
```bash
curl -s http://localhost:5000/api/health | jq .
```

### Monitorer les redémarrages
```bash
docker events --filter 'container=geoproduction_app'
```

---

## 💾 Backup et Recovery

### Backup complet (BD + config)
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U postgres geoproduction_db > backup_$DATE.sql
tar -czf backup_$DATE.tar.gz backup_$DATE.sql docker-compose.yml .env
```

### Restore complet
```bash
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz
docker-compose exec -T db psql -U postgres geoproduction_db < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📞 Support et Resources

- [Docker CLI Reference](https://docs.docker.com/engine/reference/commandline/)
- [Docker Compose CLI Reference](https://docs.docker.com/compose/reference/)
- [PostgreSQL Interactive Terminal Commands](https://www.postgresql.org/docs/current/app-psql.html)
