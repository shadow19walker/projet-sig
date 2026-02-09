from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from geoalchemy2 import Geometry
from sqlalchemy import Column, Integer, String, Float, ForeignKey, text
from sqlalchemy.orm import relationship

import json
import csv
import os
import re
from shapely.geometry import shape
from geoalchemy2.shape import from_shape
from collections import defaultdict

# Import models and static data from app.py
from app import Region, Department, Commune, ProductionData

# --- Mapping des régions (différents noms dans les CSV) ---
REGION_NAME_MAPPING = {
    'ADAMAOUA': 'Adamaoua',
    'ADAMAWA': 'Adamaoua',
    'CENTRE': 'Centre',
    'EST': 'Est',
    'EAST': 'Est',
    'EXTREME-NORD': 'Extrême-Nord',
    'FAR NORTH': 'Extrême-Nord',
    'LITTORAL': 'Littoral',
    'NORD': 'Nord',
    'NORTH': 'Nord',
    'NORD-OUEST': 'Nord-Ouest',
    'NORTH-WEST': 'Nord-Ouest',
    'NORTH WEST': 'Nord-Ouest',
    'SUD': 'Sud',
    'SOUTH': 'Sud',
    'OUEST': 'Ouest',
    'WEST': 'Ouest',
    'SUD-OUEST': 'Sud-Ouest',
    'SOUTH-WEST': 'Sud-Ouest',
    'SOUTH WEST': 'Sud-Ouest'
}

def clean_product_name(indicateur):
    """
    Nettoie le nom du produit/indicateur en supprimant les préfixes/suffixes
    'Volume de production du' ou 'production', etc.
    """
    text = indicateur.lower().strip()
    
    # Supprimer les suffixes "production" à la fin d'abord
    text = re.sub(r'\s+production$', '', text)
    
    # Supprimer les préfixes communs
    text = re.sub(r'^volume de production du\s+', '', text)
    text = re.sub(r'^volume de production de\s+', '', text)
    text = re.sub(r'^production\s+', '', text)
    
    # Supprimer "meat" mais garder le type de viande
    # "beaf meat" → "beaf", "goat meat" → "goat", etc.
    text = re.sub(r'\s+meat$', '', text)
    text = re.sub(r'\s+meat\s+', ' ', text)
    
    # Supprimer d'autres suffixes inutiles
    text = re.sub(r'\s+(prod)$', '', text)
    
    # Capitaliser la première lettre
    text = text.capitalize()
    
    return text.strip()

def load_csv_data(filepath, filiere):
    """
    Charge les données d'un fichier CSV et retourne un dict {region: {product: tonnes}}
    """
    data = defaultdict(lambda: defaultdict(float))
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                region_raw = row['region'].strip().upper()
                region_mapped = REGION_NAME_MAPPING.get(region_raw, region_raw)
                
                indicateur = row['indicateur'].strip()
                product = clean_product_name(indicateur)
                
                try:
                    tonnes = float(row['Value'])
                    # Agréger par région et produit (en cas de plusieurs années)
                    data[region_mapped][product] += tonnes
                except ValueError:
                    continue
    except Exception as e:
        print(f"Erreur lors de la lecture de {filepath}: {e}")
    
    return data


# Database connection parameters (from environment variables)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "geoproduction_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# Initialize Flask app and SQLAlchemy for this script
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# Get the base directory for data files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Look for data directory in /app/data (mounted volume) or relative to backend dir
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')
if not os.path.exists(DATA_DIR):
    DATA_DIR = '/app/data'
DATA_DIR = os.path.abspath(DATA_DIR)

def load_geojson(filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def init_db_and_extensions():
    with app.app_context():
        try:
            print("Ensuring PostGIS extension is enabled...")
            db.session.execute(text('CREATE EXTENSION IF NOT EXISTS postgis'))
            db.session.commit()
            print("PostGIS extension ensured.")

            print("Dropping and recreating tables with raw SQL...")

            # Drop tables in reverse order of creation due to foreign keys
            db.session.execute(text('DROP TABLE IF EXISTS production_data CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS communes CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS departments CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS regions CASCADE'))
            
            # Create tables with raw SQL
            db.session.execute(text('''
                CREATE TABLE regions (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR UNIQUE NOT NULL,
                    geom GEOMETRY(MULTIPOLYGON, 4326)
                )
            '''))
            db.session.execute(text('''
                CREATE TABLE departments (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR UNIQUE NOT NULL,
                    geom GEOMETRY(MULTIPOLYGON, 4326),
                    region_id INTEGER NOT NULL,
                    FOREIGN KEY(region_id) REFERENCES regions(id)
                )
            '''))
            db.session.execute(text('''
                CREATE TABLE communes (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR UNIQUE NOT NULL,
                    geom GEOMETRY(MULTIPOLYGON, 4326),
                    department_id INTEGER NOT NULL,
                    FOREIGN KEY(department_id) REFERENCES departments(id)
                )
            '''))
            db.session.execute(text('''
                CREATE TABLE production_data (
                    id SERIAL PRIMARY KEY,
                    filiere VARCHAR NOT NULL,
                    product VARCHAR NOT NULL,
                    tonnes FLOAT NOT NULL,
                    region_id INTEGER,
                    department_id INTEGER,
                    commune_id INTEGER,
                    FOREIGN KEY(region_id) REFERENCES regions(id),
                    FOREIGN KEY(department_id) REFERENCES departments(id),
                    FOREIGN KEY(commune_id) REFERENCES communes(id)
                )
            '''))

            db.session.commit()
            print("Tables created successfully via raw SQL.")
        except Exception as e:
            db.session.rollback()
            print(f"Error during database initialization: {e}")
            raise

def populate_database():
    with app.app_context():
        # Step 1: Populate Regions, Departments, and Communes first
        print("Populating Regions...")
        regions_geojson = load_geojson('cmr_admin1.geojson')
        regions_map = {f['properties']['adm1_name1']: f for f in regions_geojson['features']}
        
        region_objects = {}
        for name, feature in regions_map.items():
            geom = from_shape(shape(feature['geometry']), srid=4326)
            region = Region(name=name, geom=geom)
            db.session.add(region)
            region_objects[name] = region
        db.session.commit()
        print(f"Loaded {len(region_objects)} regions.")

        print("Populating Departments...")
        departments_geojson = load_geojson('cmr_admin2.geojson')
        department_objects = {}
        for feature in departments_geojson['features']:
            props = feature['properties']
            dept_name = props['adm2_name1']
            region_name = props['adm1_name1']
            region = region_objects.get(region_name)
            if not region:
                continue
            geom = from_shape(shape(feature['geometry']), srid=4326)
            department = Department(name=dept_name, geom=geom, region=region)
            db.session.add(department)
            department_objects[dept_name] = department
        db.session.commit()
        print(f"Loaded {len(department_objects)} departments.")

        print("Populating Communes...")
        communes_geojson = load_geojson('cmr_admin3.geojson')
        for feature in communes_geojson['features']:
            props = feature['properties']
            commune_name = props['adm3_name1']
            dept_name = props['adm2_name1']
            department = department_objects.get(dept_name)
            if not department:
                continue
            geom = from_shape(shape(feature['geometry']), srid=4326)
            commune = Commune(name=commune_name, geom=geom, department=department)
            db.session.add(commune)
        db.session.commit()
        print("Communes loaded.")

        # Step 2: Load production data from CSV files
        print("Loading production data from CSV files...")
        agriculture_data = load_csv_data('./ObservationData_agriculture.csv', 'Agriculture')
        elevage_data = load_csv_data('./ObservationData_elevage.csv', 'Élevage')
        peche_data = load_csv_data('./ObservationData_peche.csv', 'Pêche')
        
        # Step 3: Populate Production Data for regions only
        print("Populating Production Data at region level...")
        db.session.query(ProductionData).delete()
        db.session.commit()

        # Process Agriculture data
        for region_name, products in agriculture_data.items():
            region = region_objects.get(region_name)
            if not region:
                print(f"  Warning: Region '{region_name}' not found in GeoJSON")
                continue
            
            for product, tonnes in products.items():
                if tonnes > 0:
                    db.session.add(ProductionData(
                        filiere='Agriculture',
                        product=product,
                        tonnes=tonnes,
                        region=region
                    ))
        
        # Process Élevage data
        for region_name, products in elevage_data.items():
            region = region_objects.get(region_name)
            if not region:
                print(f"  Warning: Region '{region_name}' not found in GeoJSON")
                continue
            
            for product, tonnes in products.items():
                if tonnes > 0:
                    db.session.add(ProductionData(
                        filiere='Élevage',
                        product=product,
                        tonnes=tonnes,
                        region=region
                    ))
        
        # Process Pêche data
        for region_name, products in peche_data.items():
            region = region_objects.get(region_name)
            if not region:
                print(f"  Warning: Region '{region_name}' not found in GeoJSON")
                continue
            
            for product, tonnes in products.items():
                if tonnes > 0:
                    db.session.add(ProductionData(
                        filiere='Pêche',
                        product=product,
                        tonnes=tonnes,
                        region=region
                    ))
        
        db.session.commit()
        print("Production data populated at region level.")
        print("Database population complete!")

if __name__ == '__main__':
    init_db_and_extensions()
    populate_database()