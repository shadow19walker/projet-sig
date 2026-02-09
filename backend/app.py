from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import random
import itertools
import os
from flask_sqlalchemy import SQLAlchemy


# Determine paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# STATIC_DIR is in /app/static (mounted volume or copied in Docker)
# But when running locally from backend, it's in backend/static
STATIC_DIR = os.path.join(BASE_DIR, 'static')
if not os.path.exists(STATIC_DIR):
    # In Docker, static files are at /app/static
    STATIC_DIR = os.path.join(os.path.dirname(BASE_DIR), 'static')

# Initialize Flask app with static files configuration
app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='')
CORS(app)

# Database connection parameters from environment variables with fallbacks
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "geoproduction_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# Configure SQLAlchemy
app.config["SQLALCHEMY_DATABASE_URI"] = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False # Disable tracking modifications for performance
db = SQLAlchemy(app)

# Import necessary for GeoAlchemy2
from geoalchemy2 import Geometry
from sqlalchemy import Column, Integer, String, Float, ForeignKey, func
from sqlalchemy.orm import relationship

# --- Database Models ---
class Region(db.Model):
    __tablename__ = 'regions'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    geom = Column(Geometry('MULTIPOLYGON', srid=4326, spatial_index=True)) # For spatial data

    departments = relationship('Department', back_populates='region')
    production_data = relationship('ProductionData', back_populates='region')

    def __repr__(self):
        return f'<Region {self.name}>'

class Department(db.Model):
    __tablename__ = 'departments'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    geom = Column(Geometry('MULTIPOLYGON', srid=4326, spatial_index=True)) # For spatial data
    region_id = Column(Integer, ForeignKey('regions.id'), nullable=False)

    region = relationship('Region', back_populates='departments')
    communes = relationship('Commune', back_populates='department')
    production_data = relationship('ProductionData', back_populates='department')

    def __repr__(self):
        return f'<Department {self.name}>'

class Commune(db.Model):
    __tablename__ = 'communes'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    geom = Column(Geometry('MULTIPOLYGON', srid=4326, spatial_index=True)) # For spatial data
    department_id = Column(Integer, ForeignKey('departments.id'), nullable=False)

    department = relationship('Department', back_populates='communes')
    production_data = relationship('ProductionData', back_populates='commune')

    def __repr__(self):
        return f'<Commune {self.name}>'

class ProductionData(db.Model):
    __tablename__ = 'production_data'
    id = Column(Integer, primary_key=True)
    filiere = Column(String, nullable=False)
    product = Column(String, nullable=False)
    tonnes = Column(Float, nullable=False)

    region_id = Column(Integer, ForeignKey('regions.id'), nullable=True)
    department_id = Column(Integer, ForeignKey('departments.id'), nullable=True)
    commune_id = Column(Integer, ForeignKey('communes.id'), nullable=True)

    region = relationship('Region', back_populates='production_data')
    department = relationship('Department', back_populates='production_data')
    commune = relationship('Commune', back_populates='production_data')

    def __repr__(self):
        return f'<ProductionData {self.filiere} - {self.product} in Region {self.region_id}>'

def build_geojson_response(results):
    """Aggregate results by zone name and build proper GeoJSON with aggregated properties."""
    zones = {}
    
    for row in results:
        row_dict = row._asdict()
        zone_name = row_dict.pop('name')
        geom_json = json.loads(row_dict.pop('geojson'))
        filiere = row_dict.get('filiere')
        product = row_dict.get('product')
        tonnes = row_dict.get('tonnes', 0)
        
        if zone_name not in zones:
            zones[zone_name] = {
                'geometry': geom_json,
                'properties': {
                    'name': zone_name,
                    'region_name': row_dict.get('region_name'),
                    'filieres': set(),
                    'products': set(),
                    'filiere_tonnes': {},
                    'product_tonnes': {},
                    'products_by_filiere': {},
                    'total_tonnes': 0
                }
            }
        
        if filiere:
            zones[zone_name]['properties']['filieres'].add(filiere)
            zones[zone_name]['properties']['filiere_tonnes'][filiere] = zones[zone_name]['properties']['filiere_tonnes'].get(filiere, 0) + tonnes
            
            if filiere not in zones[zone_name]['properties']['products_by_filiere']:
                zones[zone_name]['properties']['products_by_filiere'][filiere] = {}
        
        if product:
            zones[zone_name]['properties']['products'].add(product)
            zones[zone_name]['properties']['product_tonnes'][product] = zones[zone_name]['properties']['product_tonnes'].get(product, 0) + tonnes
            
            if filiere:
                zones[zone_name]['properties']['products_by_filiere'][filiere][product] = zones[zone_name]['properties']['products_by_filiere'][filiere].get(product, 0) + tonnes
        
        zones[zone_name]['properties']['total_tonnes'] += tonnes
    
    # Convert sets to lists and determine dominant filiere
    features = []
    for zone_name, zone_data in zones.items():
        props = zone_data['properties']
        props['filieres'] = sorted(list(props['filieres']))
        props['products'] = sorted(list(props['products']))
        
        # Keep products_by_filiere with tonnes information
        products_by_filiere_with_tonnes = {}
        for filiere, products_dict in props['products_by_filiere'].items():
            products_by_filiere_with_tonnes[filiere] = dict(sorted(products_dict.items(), key=lambda x: x[1], reverse=True))
        props['products_by_filiere'] = products_by_filiere_with_tonnes
        
        # Determine dominant filiere
        if props['filiere_tonnes']:
            props['dominant_filiere'] = max(props['filiere_tonnes'], key=props['filiere_tonnes'].get)
        else:
            props['dominant_filiere'] = None
        
        # Keep filiere_tonnes and product_tonnes for frontend display
        # No deletion - keep the data!
        
        features.append({
            "type": "Feature",
            "geometry": zone_data['geometry'],
            "properties": props
        })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

@app.route('/api')
def api_home():
    return '<h1>Geo-production API</h1><p>Use /api/regions, /api/departments, or /api/communes.</p>'

@app.route('/api/regions')
def get_regions():
    filiere = request.args.get('filiere', default=None, type=str)
    
    query = db.session.query(
        Region.name.label('name'),
        ProductionData.filiere.label('filiere'),
        ProductionData.product.label('product'),
        func.sum(ProductionData.tonnes).label('tonnes'),
        func.ST_AsGeoJSON(Region.geom).label('geojson')
    ).join(ProductionData, Region.id == ProductionData.region_id)\
     .filter(ProductionData.department_id.is_(None), ProductionData.commune_id.is_(None))

    if filiere and filiere.lower() != 'all':
        query = query.filter(ProductionData.filiere == filiere)

    results = query.group_by(Region.name, ProductionData.filiere, ProductionData.product, Region.geom).all()
    return jsonify(build_geojson_response(results))

@app.route('/api/departments')
def get_departments():
    filiere = request.args.get('filiere', default=None, type=str)
    
    # Count departments per region
    dept_count_subquery = db.session.query(
        Region.id.label('region_id'),
        func.count(Department.id).label('dept_count')
    ).join(Department, Region.id == Department.region_id)\
     .group_by(Region.id).subquery()
    
    # Join department geometries with production data from their region, divided by dept count
    query = db.session.query(
        Department.name.label('name'),
        Region.name.label('region_name'),
        ProductionData.filiere.label('filiere'),
        ProductionData.product.label('product'),
        (func.sum(ProductionData.tonnes) / dept_count_subquery.c.dept_count).label('tonnes'),
        func.ST_AsGeoJSON(Department.geom).label('geojson')
    ).join(Region, Department.region_id == Region.id)\
     .join(dept_count_subquery, Region.id == dept_count_subquery.c.region_id)\
     .join(ProductionData, Region.id == ProductionData.region_id)\
     .filter(ProductionData.department_id.is_(None), ProductionData.commune_id.is_(None))

    if filiere and filiere.lower() != 'all':
        query = query.filter(ProductionData.filiere == filiere)

    results = query.group_by(Department.name, Region.name, ProductionData.filiere, ProductionData.product, Department.geom, dept_count_subquery.c.dept_count).all()
    return jsonify(build_geojson_response(results))

@app.route('/api/communes')
def get_communes():
    filiere = request.args.get('filiere', default=None, type=str)
    
    # Count communes per region
    commune_count_subquery = db.session.query(
        Region.id.label('region_id'),
        func.count(Commune.id).label('commune_count')
    ).join(Department, Region.id == Department.region_id)\
     .join(Commune, Department.id == Commune.department_id)\
     .group_by(Region.id).subquery()
    
    # Join commune geometries with production data from their region, divided by commune count
    query = db.session.query(
        Commune.name.label('name'),
        Region.name.label('region_name'),
        ProductionData.filiere.label('filiere'),
        ProductionData.product.label('product'),
        (func.sum(ProductionData.tonnes) / commune_count_subquery.c.commune_count).label('tonnes'),
        func.ST_AsGeoJSON(Commune.geom).label('geojson')
    ).join(Department, Commune.department_id == Department.id)\
     .join(Region, Department.region_id == Region.id)\
     .join(commune_count_subquery, Region.id == commune_count_subquery.c.region_id)\
     .join(ProductionData, Region.id == ProductionData.region_id)\
     .filter(ProductionData.department_id.is_(None), ProductionData.commune_id.is_(None))

    if filiere and filiere.lower() != 'all':
        query = query.filter(ProductionData.filiere == filiere)

    results = query.group_by(Commune.name, Region.name, ProductionData.filiere, ProductionData.product, Commune.geom, commune_count_subquery.c.commune_count).all()
    return jsonify(build_geojson_response(results))

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for Docker container"""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        return jsonify({'status': 'healthy', 'message': 'Server and database are operational'}), 200
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

# Serve static files for SPA
@app.route('/', methods=['GET'])
def serve_index():
    """Serve the main index.html"""
    return send_from_directory(STATIC_DIR, 'index.html')

@app.route('/<path:path>', methods=['GET'])
def serve_static(path):
    """Serve static assets, fallback to index.html for SPA routing"""
    if os.path.exists(os.path.join(STATIC_DIR, path)):
        return send_from_directory(STATIC_DIR, path)
    else:
        # For SPA routing, serve index.html
        return send_from_directory(STATIC_DIR, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)