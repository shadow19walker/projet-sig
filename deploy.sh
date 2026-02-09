#!/bin/bash

# Script de déploiement Docker pour GéoProduction

set -e

echo "🐳 Déploiement GéoProduction avec Docker"
echo "========================================"
echo ""

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose."
    exit 1
fi

echo "✅ Docker et Docker Compose sont installés"
echo ""

# Options
COMMAND=${1:-"up"}

case $COMMAND in
    "up")
        echo "🚀 Démarrage des conteneurs..."
        docker-compose up -d
        echo ""
        echo "⏳ Attente de l'initialisation de la base de données (30-40s)..."
        sleep 10
        echo ""
        echo "✅ Déploiement terminé!"
        echo "📍 Accédez à l'application sur http://localhost:5000"
        echo ""
        echo "Commandes utiles :"
        echo "  - Voir les logs : docker-compose logs -f app"
        echo "  - Arrêter : docker-compose down"
        echo "  - Redémarrer : docker-compose restart"
        ;;
    
    "down")
        echo "🛑 Arrêt des conteneurs..."
        docker-compose down
        echo "✅ Conteneurs arrêtés"
        ;;
    
    "restart")
        echo "🔄 Redémarrage des conteneurs..."
        docker-compose restart
        echo "✅ Conteneurs redémarrés"
        ;;
    
    "logs")
        echo "📋 Affichage des logs (app)..."
        docker-compose logs -f app
        ;;
    
    "logs-db")
        echo "📋 Affichage des logs (base de données)..."
        docker-compose logs -f db
        ;;
    
    "rebuild")
        echo "🔨 Reconstruction des images..."
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        echo "✅ Reconstruction terminée"
        ;;
    
    "reset-db")
        echo "⚠️  Réinitialisation complète de la base de données..."
        docker-compose down -v
        docker-compose up -d
        echo "✅ Base de données réinitialisée"
        ;;
    
    "status")
        echo "📊 État des conteneurs :"
        docker-compose ps
        ;;
    
    "shell-app")
        echo "🐚 Shell interactif sur le conteneur app..."
        docker-compose exec app /bin/bash
        ;;
    
    "shell-db")
        echo "🐚 Shell interactif sur la base de données..."
        docker-compose exec db psql -U postgres geoproduction_db
        ;;
    
    "backup")
        echo "💾 Sauvegarde de la base de données..."
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker-compose exec -T db pg_dump -U postgres geoproduction_db > "$BACKUP_FILE"
        echo "✅ Sauvegarde créée : $BACKUP_FILE"
        ;;
    
    "help"|"-h"|"--help")
        echo "Commandes disponibles :"
        echo ""
        echo "  ./deploy.sh up              - Démarrer les conteneurs"
        echo "  ./deploy.sh down            - Arrêter les conteneurs"
        echo "  ./deploy.sh restart         - Redémarrer les conteneurs"
        echo "  ./deploy.sh logs            - Voir les logs de l'app"
        echo "  ./deploy.sh logs-db         - Voir les logs de la BD"
        echo "  ./deploy.sh rebuild         - Reconstruire les images"
        echo "  ./deploy.sh reset-db        - Réinitialiser complètement"
        echo "  ./deploy.sh status          - État des conteneurs"
        echo "  ./deploy.sh shell-app       - Shell dans le conteneur app"
        echo "  ./deploy.sh shell-db        - Shell SQL dans la BD"
        echo "  ./deploy.sh backup          - Sauvegarder la BD"
        echo "  ./deploy.sh help            - Afficher cette aide"
        ;;
    
    *)
        echo "❌ Commande inconnue : $COMMAND"
        echo "Utilisez './deploy.sh help' pour voir les commandes disponibles"
        exit 1
        ;;
esac
