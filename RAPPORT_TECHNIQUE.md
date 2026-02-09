# Rapport Technique : Projet Web-Mapping de la Production Économique du Cameroun

**Auteur** : Groupe de Projet 5GI
**Date** : 20 Janvier 2026
**Version** : 1.1

---

## Table des Matières

1.  [Introduction et Contexte du Projet](#1-introduction-et-contexte-du-projet)
2.  [Méthodologie et Traitement des Données](#2-méthodologie-et-traitement-des-données)
    *   [2.1. Modèle et Sources des Données](#21-modèle-et-sources-des-données)
    *   [2.2. Script de Peuplement de la Base de Données](#22-script-de-peuplement-de-la-base-de-données)
    *   [2.3. Stratégie d'Agrégation des Données](#23-stratégie-dagrégation-des-données)
3.  [Architecture et Choix Technologiques](#3-architecture-et-choix-technologiques)
    *   [3.1. Architecture Backend](#31-architecture-backend)
    *   [3.2. Architecture Frontend](#32-architecture-frontend)
    *   [3.3. Flux de Données Complet](#33-flux-de-données-complet)
4.  [Fonctionnalités Implémentées](#4-fonctionnalités-implémentées)
5.  [Guide de Lancement et d'Installation](#5-guide-de-lancement-et-dinstallation)
    *   [5.1. Prérequis](#51-prérequis)
    *   [5.2. Installation du Backend](#52-installation-du-backend)
    *   [5.3. Lancement du Frontend](#53-lancement-du-frontend)
6.  [Conclusion et Pistes d'Amélioration](#6-conclusion-et-pistes-damélioration)

---

## 1. Introduction et Contexte du Projet

Ce document constitue le rapport technique final pour le projet de web-mapping réalisé dans le cadre de l'unité d'enseignement 5GI, pour l'année 2025-2026. Il a pour vocation de répondre aux livrables demandés dans le cahier des charges, à savoir :
*   Un **rapport décrivant la méthodologie et les choix techniques**.
*   Une **documentation de l'architecture technique**.

L'objectif principal du projet est de développer une application web cartographique permettant de visualiser les **bassins de production** pour les filières économiques (agriculture, élevage, pêche) au niveau des différentes divisions administratives du Cameroun (régions, départements, et communes).

Ce rapport détaille la méthodologie employée pour le traitement des données, l'architecture logicielle retenue, les justifications des choix technologiques, les fonctionnalités développées, et fournit un guide d'installation complet pour permettre l'évaluation et la réplication de l'application.

## 2. Méthodologie et Traitement des Données

Cette section décrit le cheminement de la donnée, de sa source brute à sa représentation cartographique.

### 2.1. Modèle et Sources des Données

La fondation du projet repose sur deux types de données :

*   **Données Géospatiales :** Les contours administratifs du Cameroun sont issus de fichiers au format **GeoJSON** (`cmr_admin1.geojson` pour les régions, `cmr_admin2.geojson` pour les départements, etc.), situés dans le dossier `/data`. Ces fichiers standards permettent une manipulation aisée tant sur le backend que sur le frontend.

*   **Données de Production :** Pour les besoins du projet, un jeu de données socio-économiques a été défini statiquement dans le script `populate_db.py`. Ces données simulent la production (en tonnes) pour différents produits, initialement agrégées au niveau régional.

Pour organiser ces informations, un modèle de données relationnel et spatial a été défini dans `app.py` via SQLAlchemy et GeoAlchemy2 :
*   `Region`, `Department`, `Commune` : Ces modèles représentent les entités administratives. Chacun contient des informations de base (nom, ID) et un champ `geom` de type `Geometry` pour stocker le polygone correspondant. Des relations (`relationship`) lient hiérarchiquement ces entités (une région contient plusieurs départements, etc.).
*   `ProductionData` : Cette table centrale stocke les données de production. Chaque entrée est liée à une filière, un produit, une quantité (tonnes) et une unique entité administrative (soit `region_id`, `department_id`, ou `commune_id`).

### 2.2. Script de Peuplement de la Base de Données

Le script `backend/populate_db.py` est une étape cruciale qui prépare la base de données. Son exécution réalise les opérations suivantes :

1.  **Initialisation :** Il s'assure que l'extension PostGIS est bien activée dans la base de données cible. Ensuite, il supprime et recrée les tables (`Region`, `Department`, `Commune`, `ProductionData`) pour garantir un état propre à chaque exécution.
2.  **Chargement des Géométries :** Le script lit les fichiers GeoJSON du dossier `/data`, et pour chaque entité (région, département, commune), il insère une ligne dans la table correspondante, en convertissant la géométrie GeoJSON en un format spatial (`WKB`) stocké dans le champ `geom`.
3.  **Distribution des Données de Production :** C'est l'étape la plus importante. Le script parcourt le dictionnaire `PRODUCTION_DATA` qui contient des chiffres de production au niveau **régional**. Pour chaque région, il va :
    *   Associer les données de production à l'entité `Region` elle-même.
    *   **Propager ces mêmes données** à tous les départements (`Department`) appartenant à cette région.
    *   **Propager à nouveau ces mêmes données** à toutes les communes (`Commune`) appartenant à ces départements.

Cette stratégie de "top-down" est une **simulation** qui permet d'avoir des données à tous les niveaux administratifs à partir d'un jeu de données initial limité. Dans un scénario réel, des données plus granulaires seraient directement insérées au niveau le plus fin possible.

### 2.3. Stratégie d'Agrégation des Données

Une décision d'architecture importante a été de déléguer le calcul de la "filière dominante" au frontend.

1.  **Côté Backend :** L'API se contente de joindre les entités géographiques avec les données de production correspondantes et de renvoyer le tout au format GeoJSON. Aucune agrégation ou calcul de dominance n'est effectué. Le serveur a un rôle simple : extraire et transmettre.
2.  **Côté Frontend :** À la réception du GeoJSON, le code JavaScript (`aggregateGeojsonByZone` dans `index.html`) parcourt les données. Pour chaque zone géographique (polygone), il calcule la production totale pour chaque filière et identifie celle dont la somme des tonnes est la plus élevée. C'est cette filière qui est désignée comme "dominante" et qui détermine la couleur de la zone sur la carte.

*   **Justification de ce choix :**
    *   **Performance et Scalabilité du Serveur :** En évitant des calculs d'agrégation complexes en base de données à chaque requête, le serveur répond plus rapidement et consomme moins de ressources.
    *   **Flexibilité du Client :** Cette approche offre une flexibilité maximale. Si demain l'utilisateur souhaite changer le critère de visualisation (par exemple, voir le produit dominant au lieu de la filière, ou utiliser une autre métrique), la logique peut être adaptée directement dans le JavaScript sans nécessiter de modification du backend. Cela facilite les itérations rapides et l'expérimentation.
    *   **Simplicité de l'API :** L'API reste simple, prévisible et purement orientée "données brutes", ce qui est une bonne pratique.

## 3. Architecture et Choix Technologiques

Le projet est structuré autour d'une architecture client-serveur classique, en accord avec les standards du web-mapping.

### 3.1. Architecture Backend

Le serveur a pour rôle de stocker les données et de les exposer de manière sécurisée et efficace.

*   **Framework :** **Python** avec le micro-framework **Flask**.
    *   *Justification :* Le cahier des charges mentionnait Python (avec Flask/Django) comme une option viable. Flask a été retenu pour sa légèreté, sa prise en main rapide et sa flexibilité, ce qui en fait un choix idéal pour créer des API RESTful sans imposer une structure de projet trop rigide.

*   **Base de Données :** **PostgreSQL** (version 12+) avec son extension spatiale **PostGIS**.
    *   *Justification :* Ce choix est en parfaite adéquation avec le cahier des charges qui recommande explicitement **PostGIS**. C'est le standard de l'industrie pour le stockage de données géospatiales, offrant des capacités d'indexation spatiale (via GiST) et des fonctions géographiques avancées qui garantissent des requêtes performantes.

*   **Communication API :** Une **API RESTful** a été développée. Elle expose trois points d'accès principaux : `/api/regions`, `/api/departments`, et `/api/communes`.
    *   *Justification :* Ces endpoints renvoient les données au format **GeoJSON**, un format également recommandé implicitement par le cahier des charges pour les outils cartographiques web. Le GeoJSON est un standard ouvert, léger et nativement interprétable par Leaflet.js, ce qui simplifie grandement l'intégration avec le frontend.

*   **Librairies Python Clés :**
    *   `Flask-SQLAlchemy` : ORM (Object-Relational Mapper) qui abstrait les interactions avec la base de données, permettant de manipuler les tables via des objets Python.
    *   `GeoAlchemy2` : Une surcouche indispensable à SQLAlchemy pour la prise en charge des types de données (`Geometry`) et des fonctions spatiales de PostGIS.
    *   `psycopg2-binary` : Le driver standard pour connecter une application Python à une base de données PostgreSQL.
    *   `Shapely` : Utilisée dans le script de peuplement pour manipuler les objets géométriques avant leur insertion en base.

### 3.2. Architecture Frontend

Le frontend est l'interface utilisateur, responsable de l'affichage de la carte et de l'interactivité.

*   **Technologies de Base :** **HTML, CSS, et JavaScript pur ("vanilla")**.
    *   *Justification :* Pour la portée de ce projet, l'utilisation d'un framework lourd (comme React, Angular ou Vue) n'était pas jugée nécessaire. Le JavaScript "vanilla", combiné à la puissance de Leaflet, est suffisant pour répondre à toutes les exigences fonctionnelles tout en garantissant un contrôle total sur le code et d'excellentes performances de chargement.

*   **Librairie de Cartographie :** **Leaflet.js**.
    *   *Justification :* Leaflet.js est l'une des deux bibliothèques explicitement recommandées dans le cahier des charges. Sa popularité, sa légèreté, sa documentation exhaustive et sa facilité d'utilisation en font un choix de premier ordre pour des projets de cartographie interactive. Elle gère nativement les couches GeoJSON, ce qui s'intègre parfaitement avec notre API.

*   **Librairie de Graphiques :** **Chart.js**.
    *   *Justification :* Bien que non requise initialement, cette librairie a été ajoutée pour implémenter la fonctionnalité de **comparaison inter-départementale** suggérée dans le cahier des charges. Elle est simple à intégrer et permet de générer des graphiques à barres esthétiques et dynamiques pour visualiser les données de production.

### 3.3. Flux de Données Complet

Le diagramme suivant résume le parcours d'une donnée, de la base au navigateur :

1.  **Lancement :** L'utilisateur ouvre `index.html`. Le JavaScript initialise la carte Leaflet.
2.  **Requête API :** Le client (via `fetch` en JS) envoie une requête HTTP GET au backend, par exemple `http://127.0.0.1:5000/api/departments`.
3.  **Traitement Backend :**
    *   Flask reçoit la requête et la route vers la fonction `get_departments`.
    *   SQLAlchemy construit une requête SQL qui joint la table `departments` et la table `production_data`.
    *   PostGIS utilise ses index spatiaux pour retrouver efficacement les géométries. La fonction `ST_AsGeoJSON` est utilisée pour convertir les géométries du format binaire de la base vers le format texte GeoJSON.
4.  **Réponse API :** Le backend renvoie une réponse HTTP avec un corps (`body`) contenant un objet `FeatureCollection` au format GeoJSON.
5.  **Traitement Frontend :**
    *   Le client reçoit le GeoJSON.
    *   La fonction d'agrégation `aggregateGeojsonByZone` est exécutée pour calculer la filière dominante pour chaque département.
    *   Une couche `L.geoJSON` est créée dans Leaflet. Une fonction de style (`style: function(feature)`) est utilisée pour assigner une couleur à chaque entité en se basant sur la filière dominante calculée.
6.  **Visualisation :** Leaflet affiche les polygones colorés sur la carte, finalisant le processus.

## 4. Fonctionnalités Implémentées

L'application développée respecte et dépasse l'ensemble des fonctionnalités pédagogiques et techniques demandées dans le cahier des charges.

*   **Visualisation multi-thématique :**
    *   *Exigence :* "Permettre aux étudiants d'afficher successivement : agriculture, élevage, pêche."
    *   *Implémentation :* **Réalisé**. La carte est colorée selon la filière de production dominante (Agriculture, Élevage, Pêche). Un panneau de filtres permet à l'utilisateur de se concentrer sur une filière spécifique, mettant à jour la carte dynamiquement.

*   **Affichage multi-niveaux :**
    *   *Exigence :* Utiliser les Régions, Départements, et Communes.
    *   *Implémentation :* **Réalisé**. Des boutons permettent de basculer instantanément entre les trois niveaux administratifs, avec des appels API dédiés pour chaque niveau.

*   **Recherche et navigation :**
    *   *Exigence :* "Barre de recherche pour trouver un lieu/une commune, affichage de la production."
    *   *Implémentation :* **Réalisé**. Une barre de recherche a été intégrée. Elle permet à l'utilisateur de taper le nom d'une entité administrative. Une fois sélectionnée, la carte zoome automatiquement sur la zone correspondante et ouvre son popup d'information.

*   **Détail des bassins :**
    *   *Exigence :* "Une fenêtre d'information montrant : valeurs de production, type de filière."
    *   *Implémentation :* **Réalisé**. Au clic sur n'importe quelle zone géographique, un popup (infobulle) s'affiche, présentant en détail :
        *   Le nom de la zone.
        *   La production totale (toutes filières confondues).
        *   Un résumé des filières présentes avec leur production respective.
        *   Les produits principaux de la zone.

*   **Comparaison inter-départementale :**
    *   *Exigence :* "comparaison inter-départementale."
    *   *Implémentation :* **Réalisé**. Un outil de comparaison a été développé. Lorsqu'un utilisateur clique sur une zone, un bouton "Comparer" apparaît dans le popup. Cliquer sur ce bouton génère un graphique à barres (via Chart.js) qui compare la production totale de la zone sélectionnée à celle des autres zones du même niveau, offrant une analyse visuelle immédiate.

*   **Éléments d'UI complémentaires :**
    *   *Exigence :* "légende dynamique, infobulles avec données de production."
    *   *Implémentation :* **Réalisé**. Une légende dynamique se met à jour pour refléter les couleurs des filières affichées sur la carte. Les infobulles (popups) sont, comme décrit plus haut, riches en informations.

## 5. Guide d'Installation et de Lancement

### 5.1. Prérequis

*   **Python 3.8+** et l'outil `pip`.
*   Un accès à un terminal ou une ligne de commande (PowerShell sur Windows, Terminal sur macOS/Linux).
*   Un serveur de base de données **PostgreSQL** (version 12+) avec l'extension **PostGIS** activée.

### 5.2. Installation du Backend

Toutes les commandes suivantes doivent être exécutées depuis le terminal.

1.  **Navigation vers le dossier Backend**
    Placez-vous dans le dossier `backend` du projet :
    ```sh
    cd chemin/vers/le/projet/backend
    ```

2.  **Création de l'Environnement Virtuel**
    Créez un environnement virtuel nommé `venv` pour isoler les dépendances du projet :
    ```sh
    python -m venv venv
    ```

3.  **Activation de l'Environnement Virtuel**
    *   **Sur Windows (PowerShell) :**
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
        *(Si vous rencontrez une erreur de stratégie d'exécution, exécutez `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` et réessayez.)*
    *   **Sur macOS et Linux :**
        ```sh
        source venv/bin/activate
        ```
    Une fois activé, le nom de l'environnement (`venv`) devrait apparaître au début de votre ligne de commande.

4.  **Installation des Dépendances**
    Installez toutes les librairies Python requises pour le projet :
    ```sh
    pip install -r requirements.txt
    ```

5.  **Configuration de la Base de Données**
    *   Assurez-vous que votre serveur PostgreSQL est en cours d'exécution.
    *   Créez une nouvelle base de données (par exemple, `geoproduction_db`).
    *   Connectez-vous à cette nouvelle base de données et exécutez la commande SQL pour activer PostGIS : `CREATE EXTENSION postgis;`.
    *   Ouvrez le fichier `backend/app.py` dans un éditeur de code et modifiez les lignes suivantes pour correspondre à votre configuration PostgreSQL. **Alternative (meilleure pratique)** : utilisez des variables d'environnement pour ne pas inscrire de mots de passe dans le code.
        ```python
        DB_HOST = "localhost"
        DB_NAME = "geoproduction_db"
        DB_USER = "votre_utilisateur_postgres"
        DB_PASSWORD = "votre_mot_de_passe"
        ```

6.  **(Recommandé) Peuplement de la Base de Données**
    Pour que l'application ait des données à afficher, exécutez le script de peuplement.
    ```sh
    python populate_db.py
    ```

7.  **Lancement du Serveur Backend**
    Une fois la configuration terminée, lancez le serveur Flask :
    ```sh
    python app.py
    ```
    Le serveur sera accessible à l'adresse `http://127.0.0.1:5000`. Laissez ce terminal ouvert.

### 5.3. Lancement du Frontend

1.  Assurez-vous que le serveur backend est bien en cours d'exécution.
2.  Naviguez jusqu'au dossier `frontend` du projet.
3.  Ouvrez le fichier `index.html` directement dans un navigateur web moderne (Firefox, Google Chrome, Edge, etc.).

L'application se chargera et commencera à envoyer des requêtes au backend pour récupérer et afficher les données sur la carte.

## 6. Conclusion et Pistes d'Amélioration

Le projet a permis de mettre en place une application de web-mapping fonctionnelle qui répond à toutes les exigences fondamentales du cahier des charges "Projet 5GI -2025-2026". L'architecture choisie, basée sur une stack technologique éprouvée (Flask/PostGIS/Leaflet), s'est avérée à la fois robuste et flexible. L'application offre une visualisation thématique et multi-niveaux des données de production économique simulées du Cameroun, tout en proposant des outils d'exploration pertinents (recherche, filtres, comparaison).

Ce projet constitue une base solide qui pourrait être étendue via plusieurs pistes d'amélioration :

*   **Intégration de Données Réelles :** La prochaine étape logique serait de remplacer le jeu de données statique par une connexion à des sources de données réelles et dynamiques (fichiers CSV, API de ministères, données de l'INS, etc.). Le script `populate_db.py` devrait être adapté pour parser et intégrer ces données.

*   **Optimisation des Performances avec GeoServer :** Le cahier des charges mentionnait **GeoServer**. Pour des volumes de données beaucoup plus importants, l'envoi de fichiers GeoJSON entiers devient inefficace. L'intégration de GeoServer permettrait de servir les couches géographiques sous forme de tuiles vectorielles (Vector Tiles) ou de services WMS/WFS, améliorant drastiquement les performances et l'évolutivité de l'application.

*   **Interface d'Administration :** Développer une interface sécurisée (avec authentification) qui permettrait à des administrateurs d'ajouter, de modifier ou de supprimer des données de production directement, sans avoir à relancer un script.

*   **Analyses Spatiales Avancées :** Utiliser plus en profondeur la puissance de PostGIS pour effectuer des analyses spatiales directement en base de données (calcul de densité, requêtes de proximité, etc.) et exposer les résultats via de nouveaux endpoints d'API.
