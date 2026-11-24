// Each address field owns its search session. Older Google Cloud projects may
// have Places enabled without access to Places API (New).
export function createAddressSearch(places) {
  let legacy = false;
  let token = null;
  let legacyService;

  async function legacySuggestions(input) {
    legacyService ||= new places.AutocompleteService();
    return new Promise((resolve, reject) => {
      legacyService.getPlacePredictions({
        input,
        componentRestrictions: { country: 'au' },
        locationBias: { center: { lat: -33.8688, lng: 151.2093 }, radius: 50000 },
        // Legacy requests use per-request billing; no Place Details call needed.
      }, (predictions, status) => {
        if (status === 'ZERO_RESULTS') return resolve([]);
        if (status !== 'OK') return reject(new Error(`Google address search: ${status}`));
        resolve((predictions || []).map(prediction => ({
          placeId: prediction.place_id,
          text: prediction.description,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text,
        })));
      });
    });
  }

  return {
    async search(input) {
      if (!legacy && places.AutocompleteSuggestion) {
        try {
          token ||= new places.AutocompleteSessionToken();
          const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            sessionToken: token,
            includedRegionCodes: ['au'],
            locationBias: { center: { lat: -33.8688, lng: 151.2093 }, radius: 50000 },
            language: 'en-AU',
            region: 'au',
          });
          return suggestions.filter(result => result.placePrediction).map(result => result.placePrediction);
        } catch (error) {
          if (!places.AutocompleteService) throw error;
          legacy = true;
          token = null;
        }
      }
      return legacySuggestions(input);
    },
    reset() { token = null; },
    select(prediction) {
      token = null;
      if (prediction.toPlace) {
        // Only the new API uses a session that must end with Place Details.
        return prediction.toPlace().fetchFields({ fields: ['formattedAddress'] });
      }
      return Promise.resolve();
    },
  };
}
