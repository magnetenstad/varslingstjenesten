import { acceptHMRUpdate, defineStore } from 'pinia'
import proj4 from 'proj4'
import { serverUrl } from '@/scripts/constants'
import {
  AddressResult,
  Place,
  Position,
  defaultMyLocation,
  defaultPlace,
} from '../scripts/place'

export const usePlaceStore = defineStore('place', {
  state: () => ({
    places: [] as Place[],
    currentPlace: null as null | Place,
    history: [] as AddressResult[],
  }),

  actions: {
    addPlace(place: Place) {
      Object.assign(place.address.position, getLatLng(place.address.position))
      this.places.push(place)
      this.saveToLocalStorage()
    },
    removePlace(place: Place) {
      const index = this.places.indexOf(place)
      // cannot delete place 0
      if (index > 0) {
        this.places.splice(index, 1)
        this.saveToLocalStorage()
      }
    },
    loadFromLocalStorage() {
      this.places = JSON.parse(localStorage.getItem('places') ?? '[]')
      this.places.forEach((place) => {
        if (!place.icon) {
          place.icon = defaultPlace().icon
        }
        updateEvents(place)
      })
      if (this.places.length == 0) {
        this.places.push(defaultMyLocation())
      } else {
        Object.assign(this.places[0], defaultMyLocation())
      }
      this.currentPlace = this.places[0]
      navigator.geolocation.getCurrentPosition(async (position) => {
        this.places[0].address.position = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
      })
    },
    saveToLocalStorage() {
      localStorage.setItem('places', JSON.stringify(this.places))
    },
  },
})

export const updateEvents = async (place: Place) => {
  if (!place.address.position?.latitude || !place.address.position?.longitude)
    return
  const response = await fetch(
    `${serverUrl}/events?lat=${place.address.position?.latitude}&lon=${place.address.position?.longitude}`,
    { headers: { 'Content-Type': 'application/json' } }
  )
  place.events = JSON.parse(await response.json())
}

const getLatLng = (position: Position) => {
  if (!position.x || !position.y) return
  const fromProj =
    '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
  const toProj = '+proj=longlat +datum=WGS84 +no_defs +type=crs'

  const { y: latitude, x: longitude } = proj4(fromProj, toProj).forward({
    x: position.x,
    y: position.y,
  })
  return { latitude, longitude }
}

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(usePlaceStore, import.meta.hot))
}
