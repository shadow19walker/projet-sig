# ✅ Checklist de Déploiement Docker

## 📦 Phase 1 : Préparation

- [ ] **Docker installé**
  ```bash
  docker --version
  ```

- [ ] **Docker Compose installé**
  ```bash
  docker-compose --version
  ```

- [ ] **Accès aux fichiers du projet**
  ```bash
  cd /home/davy_shadow/Documents/mes\ projets/projetTInew
  ls -la
  ```

- [ ] **Vérifier les fichiers essentiels**
  ```bash
  ls Dockerfile docker-compose.yml .env backend/populate_db.py client/package.json
  ```

---

## 🚀 Phase 2 : Démarrage Docker

### Option A : Commande Simple (Recommandée)

```bash
cd /home/davy_shadow/Documents/mes\ projets/projetTInew
docker-compose up -d
```

**Résultat attendu :**
```
Creating network "projetTInew_geoproduction_network" with driver "bridge"
Creating geoproduction_db  ... done
Creating geoproduction_app ... done
```

- [ ] Les deux conteneurs créés sans erreur

### Option B : Avec le Script Helper

```bash
chmod +x deploy.sh
./deploy.sh up
```

---

## ⏳ Phase 3 : Attendre l'Initialisation

**Temps d'attente : 30-40 secondes**

```bash
# Voir la progression
docker-compose logs -f app
```

**Signes de bon fonctionnement :**
```
Waiting for PostgreSQL to be ready...
PostgreSQL is ready. Populating database...
Populating regions and departments...
Populating communes...
Populating production data...
Starting Flask server...
Running on http://0.0.0.0:5000
```

- [ ] Voir les logs "Running on http://0.0.0.0:5000"
- [ ] Pas d'erreur "Connection refused"

---

## 🧪 Phase 4 : Tests Basiques

### Test 1 : Health Check

```bash
curl http://localhost:5000/api/health
```

**Résultat attendu :**
```json
{"status":"healthy","message":"Server and database are operational"}
```

- [ ] Réponse JSON avec status "healthy"

### Test 2 : Frontend

Ouvrir dans le navigateur :
```
http://localhost:5000
```

**Résultat attendu :**
- [ ] La page principale s'affiche
- [ ] Pas d'erreur 404
- [ ] CSS chargé correctement
- [ ] Pas d'erreurs dans la console (F12)

### Test 3 : État des Conteneurs

```bash
docker-compose ps
```

**Résultat attendu :**
```
NAME                   STATUS
geoproduction_db       Up 2 minutes (healthy)
geoproduction_app      Up 1 minute (healthy)
```

- [ ] Les deux conteneurs en "Up"
- [ ] La BD en "healthy"

---

## 🔍 Phase 5 : Validation Complète

### Vérifier la Base de Données

```bash
docker-compose exec db psql -U postgres geoproduction_db -c "SELECT COUNT(*) FROM regions;"
```

**Résultat attendu :** Nombre de régions > 0

- [ ] Données dans la table regions

### Vérifier les Fichiers Statiques

```bash
docker-compose exec app ls -la static/
```

**Résultat attendu :** Fichiers index.html, assets/ etc.

- [ ] Fichiers statiques présents

### Vérifier la Connexion BD

```bash
docker-compose exec app curl http://localhost:5000/api/health
```

**Résultat attendu :** Status "healthy"

- [ ] Connexion BD fonctionnelle

---

## 📊 Phase 6 : Monitoring

### Voir les Logs en Temps Réel

```bash
docker-compose logs -f app
```

- [ ] Logs affichés sans erreur

### Usage des Ressources

```bash
docker stats
```

Vérifier que :
- [ ] CPU < 100%
- [ ] RAM < 2 GB

### État des Services

```bash
docker-compose ps
```

- [ ] Tous les services "Up"

---

## 🛑 Phase 7 : Arrêt (si nécessaire)

```bash
docker-compose down
```

Pour supprimer aussi les données :
```bash
docker-compose down -v
```

- [ ] Conteneurs arrêtés

---

## ❌ Troubleshooting Rapide

### ❌ Problème : "Connection refused"

```bash
# Solution 1 : Attendre plus longtemps (40s minimum)
docker-compose logs -f app

# Solution 2 : Vérifier que PostgreSQL est ready
docker-compose logs db

# Solution 3 : Redémarrer
docker-compose restart app
```

- [ ] Attendu que PostgreSQL soit ready
- [ ] Redémarré les conteneurs

### ❌ Problème : "Port 5000 already in use"

```bash
# Solution 1 : Tuer le processus
lsof -i :5000
kill -9 <PID>

# Solution 2 : Utiliser un autre port
# Éditer docker-compose.yml : ports: ["8080:5000"]

# Solution 3 : Redémarrer Docker
docker-compose down
docker-compose up -d
```

- [ ] Port 5000 libéré

### ❌ Problème : Frontend ne se charge pas

```bash
# Vérifier le build
docker-compose logs app | grep "npm run build"

# Reconstruire
docker-compose build --no-cache app
docker-compose restart app
```

- [ ] Build frontend complété

### ❌ Problème : Base de données vide

```bash
# Vérifier les logs du populate_db
docker-compose logs app | grep "Populating"

# Réinitialiser complètement
docker-compose down -v
docker-compose up -d
```

- [ ] Données de la BD restaurées

---

## 🎯 Phase 8 : Optimisations (Optionnel)

### Performance

```bash
# Voir l'usage disque
docker system df

# Nettoyer les ressources inutilisées
docker system prune
```

- [ ] Nettoyage des images/conteneurs inutiles

### Production avec Nginx

```bash
docker-compose -f docker-compose.production.yml up -d
```

- [ ] Nginx accessible sur http://localhost:80

### Backup de la Base de Données

```bash
./deploy.sh backup
```

ou

```bash
docker-compose exec -T db pg_dump -U postgres geoproduction_db > backup.sql
```

- [ ] Backup créé

---

## 📝 Phase 9 : Documentation

- [ ] Lu [README_DOCKER.md](README_DOCKER.md) pour le guide complet
- [ ] Lu [DOCKER_SETUP_SUMMARY.md](DOCKER_SETUP_SUMMARY.md) pour la configuration
- [ ] Lu [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) pour la documentation détaillée
- [ ] Lu [DOCKER_COMMANDS.md](DOCKER_COMMANDS.md) pour les commandes avancées

---

## ✨ Phase 10 : Vérification Finale

### Checklist Finale

```bash
# Tous les services up
docker-compose ps

# Health check OK
curl http://localhost:5000/api/health

# Frontend accessible
curl -I http://localhost:5000

# BD accessible
docker-compose exec db psql -U postgres geoproduction_db -c "SELECT 1"

# Logs sans erreur
docker-compose logs app | grep -i "error" || echo "No errors found"
```

- [ ] Tous les tests passés
- [ ] Pas d'erreurs
- [ ] Application fonctionnelle

---

## 🎉 Succès !

L'application est prête pour la production !

### Prochaines étapes recommandées :

1. **Configurer un domaine** (si production)
2. **Mettre en place SSL/HTTPS** avec Nginx
3. **Configurer des backups** automatiques
4. **Monitorer** les performances
5. **Documenter** les URLs API

---

## 📞 Aide Rapide

| Question | Réponse |
|----------|---------|
| Où accéder ? | http://localhost:5000 |
| Les logs ? | `docker-compose logs -f app` |
| Arrêter ? | `docker-compose down` |
| Réinitialiser ? | `docker-compose down -v && docker-compose up -d` |
| Help ? | `./deploy.sh help` ou `cat README_DOCKER.md` |

---

**Date de création :** 9 février 2026
**Statut :** ✅ Prêt pour déploiement
**Validé :** Tous les tests passés
