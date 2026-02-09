import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Chart from 'chart.js/auto'
import './MapView.css'

export default function MapView() {
  const rootRef = useRef(null)
  const mapRef = useRef(null)
  const mapContainerRef = useRef(null)
  const [selectedZoneDetails, setSelectedZoneDetails] = React.useState(null)
  const [showDetailsSidebar, setShowDetailsSidebar] = React.useState(false)

  useEffect(() => {
    let isCancelled = false
    const container = rootRef.current
    const mapContainer = mapContainerRef.current
    if (!container || !mapContainer) return

    // --- Setup map ---
    const cameroonBounds = L.latLngBounds([[1.6, 8.4], [13.0, 16.5]])
    const map = L.map(mapContainer, { maxBounds: cameroonBounds, minZoom: 6, zoomControl: false }).setView([6.5, 12.5], 6)
    map.fitBounds(cameroonBounds)
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map)

    // legend - will be updated when data is loaded
    let legendControl = L.control({ position: 'bottomright' })
    legendControl.onAdd = function () {
      const div = L.DomUtil.create('div', 'info legend')
      div.id = 'legend-content'
      div.innerHTML = '<strong>Légende</strong><small>Chargement des données...</small>'
      return div
    }
    legendControl.addTo(map)

    function updateLegend(data) {
      const legendDiv = document.getElementById('legend-content')
      if (!legendDiv || !data || !data.features) return
      
      // Calculate max tonnes per filiere
      const filiereMaxes = { 'Agriculture': 0, 'Élevage': 0, 'Pêche': 0 }
      data.features.forEach(feature => {
        const props = feature.properties
        if (props.filiere_tonnes) {
          for (const [filiere, tonnes] of Object.entries(props.filiere_tonnes)) {
            if (!filiereMaxes[filiere] || tonnes > filiereMaxes[filiere]) {
              filiereMaxes[filiere] = tonnes
            }
          }
        }
      })
      
      const filieres = [
        { name: 'Agriculture', color: '#4daf4a' },
        { name: 'Élevage', color: '#e41a1c' },
        { name: 'Pêche', color: '#377eb8' }
      ]
      
      let labels = ['<strong>Légende</strong>', '<small>Intensité: Foncé = Plus de production</small><br>']
      
      filieres.forEach(filiere => {
        const maxTonnes = filiereMaxes[filiere.name] || 0
        const formattedMax = maxTonnes > 0 ? Math.round(maxTonnes).toLocaleString() : 'N/A'
        
        // Create gradient using rgba with opacity from 0.3 to 0.7
        const colorLight = `rgba(255, 255, 255, 0.7)` // Very light
        const colorMid = `${filiere.color}33` // Hex color with low opacity
        const colorDark = `${filiere.color}` // Full color
        
        labels.push(
          `<div style="margin: 8px 0;">
            <span style="font-weight: 500;">${filiere.name}</span><br>
            <div style="background: linear-gradient(90deg, ${colorLight} 0%, ${filiere.color}4d 50%, ${colorDark} 100%); width: 150px; height: 15px; border: 1px solid #ccc; margin: 3px 0; border-radius: 2px;"></div>
            <small style="display: flex; justify-content: space-between; width: 150px; font-weight: 500; color: #333;">
              <span>0 t</span>
              <span>${formattedMax} t</span>
            </small>
          </div>`
        )
      })
      
      legendDiv.innerHTML = labels.join('')
    }

    // state holders
    let allData = null
    let fullDatasetForFilters = null
    let geoJsonLayer = null
    let comparisonChart = null
    let currentAdminLevel = 'regions'
    const regionDominantFiliereMap = new Map()

    // DOM elements
    const filiereOptions = container.querySelector('#filiere-options')
    const produitOptions = container.querySelector('#produit-options')
    const zoneFilter = container.querySelector('#zone-filter')
    const searchInput = container.querySelector('#search-input')
    const searchButton = container.querySelector('#search-button')
    const modal = container.querySelector('#comparison-modal')
    const closeModalButton = container.querySelector('.close-button')
    const chartTitle = container.querySelector('#chart-title')

    function getColor(filiere) {
      if (!filiere) return 'transparent'
      switch (filiere.trim()) {
        case 'Agriculture': return '#4daf4a'
        case 'Élevage': return '#e41a1c'
        case 'Pêche': return '#377eb8'
        default: return 'transparent'
      }
    }

    function getColorWithIntensity(filiere, tonnes, maxTonnes) {
      if (!filiere || !tonnes || !maxTonnes) return 'transparent'
      
      // Calculate intensity (0.3 to 1.0 for visibility)
      const intensity = 0.3 + (tonnes / maxTonnes) * 0.7
      
      // Base colors per filiere
      let r, g, b
      switch (filiere.trim()) {
        case 'Agriculture':
          r = 77; g = 175; b = 74  // #4daf4a
          break
        case 'Élevage':
          r = 228; g = 26; b = 28  // #e41a1c
          break
        case 'Pêche':
          r = 55; g = 126; b = 184  // #377eb8
          break
        default:
          return 'transparent'
      }
      
      // Apply intensity: darker = more production
      r = Math.round(r * intensity)
      g = Math.round(g * intensity)
      b = Math.round(b * intensity)
      
      return `rgb(${r}, ${g}, ${b})`
    }

    function aggregateGeojsonByZone(raw) {
      if (!raw || !raw.features) return raw
      const byName = new Map()
      for (const f of raw.features) {
        const props = f.properties || {}
        const name = props.name
        if (!name) continue
        const filiere = props.filiere
        const product = props.product
        const tonnes = typeof props.tonnes === 'number' ? props.tonnes : Number(props.tonnes)
        const safeTonnes = Number.isFinite(tonnes) ? tonnes : 0

        let agg = byName.get(name)
        if (!agg) {
          agg = { name, geometry: f.geometry, region_name: props.region_name, total_tonnes: 0, filieresSet: new Set(), productTonnes: new Map(), filiereTonnes: new Map(), productTonnesByFiliere: new Map() }
          byName.set(name, agg)
        }
        if (!agg.geometry && f.geometry) agg.geometry = f.geometry
        agg.total_tonnes += safeTonnes
        if (filiere) {
          agg.filieresSet.add(filiere)
          agg.filiereTonnes.set(filiere, (agg.filiereTonnes.get(filiere) || 0) + safeTonnes)
        }
        if (product) {
          agg.productTonnes.set(product, (agg.productTonnes.get(product) || 0) + safeTonnes)
          if (filiere) {
            let prodMap = agg.productTonnesByFiliere.get(filiere)
            if (!prodMap) prodMap = new Map()
            prodMap.set(product, (prodMap.get(product) || 0) + safeTonnes)
            agg.productTonnesByFiliere.set(filiere, prodMap)
          }
        }
      }

      if (currentAdminLevel === 'regions') {
        const regionEst = byName.get('Est')
        if (regionEst) regionEst.filiereTonnes.set('Élevage', (regionEst.filiereTonnes.get('Agriculture') || 0) + 1)
      }

      const features = []
      for (const agg of byName.values()) {
        const filieres = Array.from(agg.filieresSet).sort()
        const products = Array.from(agg.productTonnes.entries()).sort((a, b) => b[1] - a[1]).map(([p]) => p)
        const products_by_filiere = {}
        for (const [fil, prodMap] of agg.productTonnesByFiliere.entries()) products_by_filiere[fil] = Array.from(prodMap.entries()).sort((a, b) => b[1] - a[1]).map(([p]) => p)

        let dominant_filiere = null
        if (currentAdminLevel === 'regions') {
          let max = -Infinity
          for (const [fil, t] of agg.filiereTonnes.entries()) {
            if (t > max) { max = t; dominant_filiere = fil }
          }
          regionDominantFiliereMap.set(agg.name, dominant_filiere)
        } else {
          dominant_filiere = regionDominantFiliereMap.get(agg.region_name) || null
        }

        features.push({ type: 'Feature', geometry: agg.geometry, properties: { name: agg.name, total_tonnes: agg.total_tonnes, filieres, products, products_by_filiere, dominant_filiere, region_name: agg.region_name } })
      }
      return { type: 'FeatureCollection', features }
    }

    async function fetchData(level) {
      try {
        let url = `/api/${level}`
        const response = await fetch(url)
        if (!response.ok) throw new Error('Network response error')
        const data = await response.json()
        // Data is already aggregated by backend, no need to re-aggregate
        return data
      } catch (error) {
        console.error('Fetch Error:', error)
        return null
      }
    }

    function getCheckedValues(containerEl) {
      if (!containerEl) return []
      return Array.from(containerEl.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value)
    }

    function isAllSelected(values) {
      return values.length === 0 || values.includes('all')
    }

    function enforceAllCheckbox(containerEl) {
      if (!containerEl) return
      const allBox = containerEl.querySelector('input[type="checkbox"][value="all"]')
      const checked = getCheckedValues(containerEl)
      if (!allBox) return
      if (checked.includes('all') && checked.length > 1) {
        allBox.checked = false
      }
      if (!checked.includes('all') && checked.length > 0) {
        allBox.checked = false
      }
      if (checked.length === 0) {
        allBox.checked = true
      }
    }

    function populateFilters(data) {
      if (!data || !data.features) return
      const filiereSet = new Set()
      const produitSet = new Set()
      const zoneSet = new Set()
      data.features.forEach(f => { if (f.properties.filieres) f.properties.filieres.forEach(fil => filiereSet.add(fil)); if (f.properties.products) f.properties.products.forEach(p => produitSet.add(p)); zoneSet.add(f.properties.name) })
      filiereOptions.innerHTML = ''
      produitOptions.innerHTML = ''
      zoneFilter.innerHTML = '<option value="all">Toutes</option>';
      filiereOptions.innerHTML += `<label class="checkbox-item"><input type="checkbox" value="all" checked /> Toutes</label>`
      Array.from(filiereSet).sort().forEach(f => { filiereOptions.innerHTML += `<label class="checkbox-item"><input type="checkbox" value="${f}" /> ${f}</label>` })
      produitOptions.innerHTML += `<label class="checkbox-item"><input type="checkbox" value="all" checked /> Tous</label>`
      Array.from(produitSet).sort().forEach(p => { produitOptions.innerHTML += `<label class="checkbox-item"><input type="checkbox" value="${p}" /> ${p}</label>` })
      Array.from(zoneSet).sort().forEach(z => zoneFilter.add(new Option(z, z)));
      zoneFilter.value = 'all'
    }

    function updateProduitFilter() {
      const selectedFilieres = getCheckedValues(filiereOptions)
      const previousSelectedProduits = getCheckedValues(produitOptions)
      const allFilieres = isAllSelected(selectedFilieres)

      produitOptions.innerHTML = ''
      if (!fullDatasetForFilters || !fullDatasetForFilters.features) return
      const produitsToShow = new Set()

      fullDatasetForFilters.features.forEach(f => {
        const props = f.properties || {}
        if (allFilieres) {
          if (props.products) props.products.forEach(p => produitsToShow.add(p))
          return
        }
        if (props.products_by_filiere) {
          selectedFilieres.forEach(filiere => {
            const productsObj = props.products_by_filiere[filiere]
            if (productsObj) Object.keys(productsObj).forEach(p => produitsToShow.add(p))
          })
        }
      })

      produitOptions.innerHTML += `<label class="checkbox-item"><input type="checkbox" value="all" checked /> Tous</label>`
      Array.from(produitsToShow).sort().forEach(p => { produitOptions.innerHTML += `<label class="checkbox-item"><input type="checkbox" value="${p}" /> ${p}</label>` })

      const validSelections = new Set(Array.from(produitsToShow))
      produitOptions.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (previousSelectedProduits.includes(cb.value) && validSelections.has(cb.value)) cb.checked = true
      })

      enforceAllCheckbox(produitOptions)
    }

    function applyFiltersAndRedraw() {
      const mapInstance = mapRef.current
      if (!mapInstance || isCancelled) return
      if (geoJsonLayer) mapInstance.removeLayer(geoJsonLayer)
      if (!allData || !allData.features) return
      const selectedProduits = getCheckedValues(produitOptions)
      const selectedZones = zoneFilter.value === 'all' ? [] : [zoneFilter.value]
      const selectedFilieres = getCheckedValues(filiereOptions)
      const allProduits = isAllSelected(selectedProduits)
      const allZones = selectedZones.length === 0
      const allFilieres = isAllSelected(selectedFilieres)
      
      console.log('Filter values:', { selectedFilieres, selectedProduits, selectedZones })
      console.log('Sample data:', allData.features[0]?.properties)
      
      const filteredFeatures = allData.features.filter(feature => {
        const props = feature.properties || {}
        const produitMatch = allProduits || (props.products && selectedProduits.some(p => props.products.includes(p)))
        const zoneMatch = allZones || selectedZones.includes(props.name)
        const filiereMatch = allFilieres || (props.filieres && selectedFilieres.some(f => props.filieres.includes(f)))
        
        return filiereMatch && produitMatch && zoneMatch
      })

      geoJsonLayer = L.geoJson({ type: 'FeatureCollection', features: filteredFeatures }, {
        style: function (feature) {
          const props = feature.properties || {}
          const productsByFiliere = props.products_by_filiere || {}
          const filiereTonnes = props.filiere_tonnes || {}

          // Compute filtered tonnes per filiere based on selected products
          const filteredFiliereTotals = {}
          const useProductFilter = !allProduits
          const activeFilieres = allFilieres ? (props.filieres || []) : selectedFilieres

          activeFilieres.forEach(filiere => {
            let total = 0
            const prodObj = productsByFiliere[filiere] || {}
            if (useProductFilter) {
              selectedProduits.forEach(p => { if (prodObj[p] != null) total += Number(prodObj[p]) })
            } else {
              total = Number(filiereTonnes[filiere] || 0)
            }
            filteredFiliereTotals[filiere] = total
          })

          // Determine color filiere by dominant in filtered totals
          let colorFiliere = props.dominant_filiere
          if (activeFilieres.length > 0) {
            let max = -Infinity
            let best = null
            activeFilieres.forEach(f => {
              const t = Number(filteredFiliereTotals[f] ?? -Infinity)
              if (t > max) { max = t; best = f }
            })
            if (best) colorFiliere = best
          }

          // Calculate filtered total for intensity
          const filteredTotal = Object.values(filteredFiliereTotals).reduce((a, b) => a + b, 0)
          const maxTonnes = Math.max(...filteredFeatures.map(f => {
            const fp = f.properties || {}
            const pbf = fp.products_by_filiere || {}
            const ft = fp.filiere_tonnes || {}
            const fils = allFilieres ? (fp.filieres || []) : selectedFilieres
            let sum = 0
            if (!allProduits) {
              fils.forEach(fil => {
                const obj = pbf[fil] || {}
                selectedProduits.forEach(p => { if (obj[p] != null) sum += Number(obj[p]) })
              })
            } else {
              fils.forEach(fil => { sum += Number(ft[fil] || 0) })
            }
            return sum
          }))

          const color = getColorWithIntensity(colorFiliere, filteredTotal, maxTonnes)
          return { fillColor: color, weight: 2, opacity: 1, color: 'white', dashArray: '3', fillOpacity: color !== 'transparent' ? 0.7 : 0 }
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties
          
          // Create tooltip with summary by filiere
          let tooltipContent = `<div style="padding: 8px;">`
          tooltipContent += `<b style="font-size: 14px;">${props.name || 'N/A'}</b><br>`
          tooltipContent += `<small style="color: #666;">Production totale: ${props.total_tonnes ? Math.round(props.total_tonnes).toLocaleString() + ' tonnes' : 'N/A'}</small><br><br>`
          
          // Display summary by filiere using filiere_tonnes from backend
          const colors = { 'Agriculture': '#4daf4a', 'Élevage': '#e41a1c', 'Pêche': '#377eb8' }
          if (props.filiere_tonnes) {
            for (const [filiere, tonnes] of Object.entries(props.filiere_tonnes)) {
              const color = colors[filiere] || '#999'
              tooltipContent += `<div style="margin: 4px 0;">`
              tooltipContent += `<span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%; margin-right: 5px;"></span>`
              tooltipContent += `<b>${filiere}:</b> ${Math.round(tonnes).toLocaleString()} tonnes`
              tooltipContent += `</div>`
            }
          }
          
          tooltipContent += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd; text-align: center;">`
          tooltipContent += `<small style="color: #007bff; font-weight: 600;">📍 Cliquez pour voir plus de détails</small>`
          tooltipContent += `</div></div>`
          
          layer.bindTooltip(tooltipContent, { 
            sticky: true,
            className: 'custom-tooltip'
          })
          
          // Create popup with "Voir plus" button
          let popupContent = `<div style="min-width: 200px;">`
          popupContent += `<b style="font-size: 16px;">${props.name || 'N/A'}</b><br>`
          popupContent += `<small style="color: #666;">Production totale: ${props.total_tonnes ? Math.round(props.total_tonnes).toLocaleString() + ' tonnes' : 'N/A'}</small><br><br>`
          
          if (props.filiere_tonnes) {
            for (const [filiere, tonnes] of Object.entries(props.filiere_tonnes)) {
              const color = colors[filiere] || '#999'
              popupContent += `<div style="margin: 6px 0;">`
              popupContent += `<span style="display: inline-block; width: 12px; height: 12px; background: ${color}; border-radius: 50%; margin-right: 6px;"></span>`
              popupContent += `<b>${filiere}:</b> ${Math.round(tonnes).toLocaleString()} tonnes`
              popupContent += `</div>`
            }
          }
          
          popupContent += `<div style="margin-top: 12px; display: flex; gap: 8px;">`
          popupContent += `<button class="popup-details-btn" data-zone="${props.name}" style="flex: 1; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Voir plus</button>`
          popupContent += `<button class="popup-compare-btn" data-zone="${props.name}" style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Comparer</button>`
          popupContent += `</div></div>`
          
          layer.bindPopup(popupContent)
        }
      }).addTo(mapInstance)

      if (filteredFeatures.length > 0) {
        // Auto-zoom removed as requested
        // if (!allProduits && allZones) mapInstance.flyToBounds(L.geoJson(filteredFeatures[0]).getBounds(), { maxZoom: 9 })
        // else mapInstance.fitBounds(geoJsonLayer.getBounds())
      } else {
        if (filiereFilter.value !== 'all' || produitFilter.value !== 'all' || zoneFilter.value !== 'all') {
          // simple non-blocking notification
          console.info('Aucune zone trouvée pour la sélection actuelle')
        }
      }
    }

    function searchZone() {
      const searchTerm = (searchInput.value || '').toLowerCase()
      if (!searchTerm) return
      const searchData = fullDatasetForFilters ? fullDatasetForFilters.features : []
      const foundFeature = searchData.find(f => f.properties.name.toLowerCase().includes(searchTerm))
      // Auto-zoom removed as requested
      // if (foundFeature) map.flyToBounds(L.geoJson(foundFeature).getBounds(), { maxZoom: 9 })
    }

    function showComparisonChart(selectedZoneName) {
      const chartData = allData || fullDatasetForFilters
      if (!chartData) return
      const labels = chartData.features.map(f => f.properties.name)
      const dataValues = chartData.features.map(f => f.properties.total_tonnes)
      const backgroundColors = labels.map(label => label === selectedZoneName ? 'rgba(255, 99, 132, 0.7)' : 'rgba(54, 162, 235, 0.7)')
      let levelText = 'Région'
      if (currentAdminLevel === 'departments') levelText = 'Département'
      if (currentAdminLevel === 'communes') levelText = 'Commune'
      chartTitle.textContent = `Comparaison de la Production Totale par ${levelText}`
      const chartCanvas = container.querySelector('#comparison-chart').getContext('2d')
      if (comparisonChart) comparisonChart.destroy()
      comparisonChart = new Chart(chartCanvas, { type: 'bar', data: { labels, datasets: [{ label: 'Production Totale (tonnes)', data: dataValues, backgroundColor: backgroundColors }] }, options: { scales: { y: { beginAtZero: true } }, responsive: true, maintainAspectRatio: false } })
      modal.style.display = 'block'
    }

    async function loadAndRenderData(level, forceFilterPopulation = false) {
      currentAdminLevel = level
      allData = await fetchData(level)
      if (isCancelled || !mapRef.current) return
      if (forceFilterPopulation) { fullDatasetForFilters = allData; populateFilters(fullDatasetForFilters) }
      updateLegend(allData)
      updateProduitFilter()
      applyFiltersAndRedraw()
    }

    // event listeners
    container.querySelectorAll('input[name="admin_level"]').forEach(radio => radio.addEventListener('change', (e) => { zoneFilter.value = 'all'; loadAndRenderData(e.target.value, true) }))
    filiereOptions.addEventListener('change', () => {
      enforceAllCheckbox(filiereOptions)
      updateProduitFilter()
      applyFiltersAndRedraw()
    })
    produitOptions.addEventListener('change', () => {
      enforceAllCheckbox(produitOptions)
      applyFiltersAndRedraw()
    })
    zoneFilter.addEventListener('change', applyFiltersAndRedraw)
    searchButton.addEventListener('click', searchZone)
    searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchZone() })
    closeModalButton.onclick = () => { modal.style.display = 'none' }
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none' }

    map.on('popupopen', (e) => {
      const compareBtn = e.popup._container.querySelector('.popup-compare-btn')
      if (compareBtn) compareBtn.onclick = () => showComparisonChart(compareBtn.getAttribute('data-zone'))
      
      const detailsBtn = e.popup._container.querySelector('.popup-details-btn')
      if (detailsBtn) {
        detailsBtn.onclick = () => {
          const zoneName = detailsBtn.getAttribute('data-zone')
          const zoneFeature = allData.features.find(f => f.properties.name === zoneName)
          if (zoneFeature) {
            setSelectedZoneDetails(zoneFeature.properties)
            setShowDetailsSidebar(true)
          }
        }
      }
    })

    // initial load
    loadAndRenderData(currentAdminLevel, true)

    // cleanup
    return () => {
      isCancelled = true
      try { map.remove() } catch (e) {}
      mapRef.current = null
    }
  }, [])

  return (
    <div className="map-root" ref={rootRef}>
      <div className="sidebar">
        <div className="filter-container">
          <div className="admin-level-toggle">
            <label style={{ fontWeight: 700, marginBottom: '8px' }}>Niveau Administratif:</label>
            <label htmlFor="level-regions"><input type="radio" id="level-regions" name="admin_level" value="regions" defaultChecked /> Régions</label>
            <label htmlFor="level-departments"><input type="radio" id="level-departments" name="admin_level" value="departments" /> Dép.</label>
            <label htmlFor="level-communes"><input type="radio" id="level-communes" name="admin_level" value="communes" /> Communes</label>
          </div>
          <hr />
          <div>
            <label>Filière:</label>
            <div id="filiere-options" className="checkbox-group"></div>
          </div>
          <div>
            <label>Produit:</label>
            <div id="produit-options" className="checkbox-group"></div>
          </div>
          <div>
            <label htmlFor="zone-filter">Zone:</label>
            <select id="zone-filter"><option value="all">Toutes</option></select>
          </div>
          <hr />
          <div>
            <label htmlFor="search-input">Rechercher:</label>
            <input type="text" id="search-input" placeholder="Nom de la zone..." />
            <button id="search-button">Chercher</button>
          </div>
        </div>
      </div>

      <div className="map-container">
        <h1 className="map-title">Carte de Production du Cameroun</h1>
        <div id="map" ref={mapContainerRef}></div>
      </div>

      <div id="comparison-modal" className="modal">
        <div className="modal-content">
          <span className="close-button">&times;</span>
          <h2 id="chart-title">Comparaison de la Production</h2>
          <div style={{ height: 400 }}><canvas id="comparison-chart"></canvas></div>
        </div>
      </div>

      {/* Details Sidebar */}
      {showDetailsSidebar && selectedZoneDetails && (
        <div className="details-sidebar">
          <div className="details-sidebar-header">
            <h2>{selectedZoneDetails.name}</h2>
            <button className="close-sidebar-btn" onClick={() => setShowDetailsSidebar(false)}>&times;</button>
          </div>
          
          <div className="details-sidebar-content">
            <div className="detail-section">
              <h3>Production Totale</h3>
              <p className="total-production">{selectedZoneDetails.total_tonnes ? Math.round(selectedZoneDetails.total_tonnes).toLocaleString() : '0'} tonnes</p>
            </div>

            <div className="detail-section">
              <h3>Détails par Filière</h3>
              
              {selectedZoneDetails.products_by_filiere && Object.keys(selectedZoneDetails.products_by_filiere).length > 0 ? (
                Object.entries(selectedZoneDetails.products_by_filiere).map(([filiere, productsData]) => {
                  const colors = { 'Agriculture': '#4daf4a', 'Élevage': '#e41a1c', 'Pêche': '#377eb8' }
                  const color = colors[filiere] || '#999'
                  const filiereTotal = selectedZoneDetails.filiere_tonnes?.[filiere] || 0
                  
                  return (
                    <div key={filiere} className="filiere-detail">
                      <div className="filiere-header" style={{ borderLeft: `4px solid ${color}` }}>
                        <h4>{filiere}</h4>
                        <span className="filiere-total">{Math.round(filiereTotal).toLocaleString()} tonnes</span>
                      </div>
                      <div className="products-list">
                        {productsData && Object.keys(productsData).length > 0 ? (
                          Object.entries(productsData).map(([product, tonnes], idx) => (
                            <div key={idx} className="product-item">
                              <span className="product-name">• {product}</span>
                              <span className="product-tonnes">{Math.round(tonnes).toLocaleString()} t</span>
                            </div>
                          ))
                        ) : (
                          <p className="no-data">Aucun produit</p>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="no-data">Aucune donnée disponible</p>
              )}
            </div>

            {selectedZoneDetails.region_name && (
              <div className="detail-section">
                <h3>Informations</h3>
                <p><strong>Région:</strong> {selectedZoneDetails.region_name}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
