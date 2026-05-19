import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import api from '../services/api';

export default function GooglePlacesInput({ onSelectPlace }) {
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        // No auth token, public endpoint preferred (remove verifyToken in server if possible)!
        const res = await api.get('/api/config/google-maps-key');
        setApiKey(res.data.key);
      } catch (e) {
        setApiKey(null);
      } finally {
        setLoading(false);
      }
    };
    fetchKey();
  }, []);

  if (loading) {
    return (
      <View style={{minHeight:40,alignItems:'center',justifyContent:'center'}}>
        <ActivityIndicator size="small" color="#ccc" />
      </View>
    );
  }

  if (!apiKey) {
    return (
      <View style={{minHeight:40,alignItems:'center',justifyContent:'center'}}>
        <Text style={{color:'#f00'}}>Google Places key not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 0, zIndex: 1000 }}>
      <GooglePlacesAutocomplete
        placeholder="Search location..."
        onPress={(data, details = null) => {
          if (onSelectPlace && data) {
            onSelectPlace(data.description || data.name || '');
          }
        }}
        query={{
          key: apiKey,
          language: 'en',
        }}
        fetchDetails={false}
        debounce={300}
        enablePoweredByContainer={false}
        styles={autocompleteStyles}
        listViewDisplayed="auto"
        renderDescription={(row) => row.description || row.formatted_address || row.name}
        suppressDefaultStyles={false}
      />
    </View>
  );
}

const autocompleteStyles = StyleSheet.create({
  container: { 
    flex: 0, 
    zIndex: 1000,
    position: 'relative',
  },
  textInputContainer: {
    width: '100%',
  },
  textInput: {
    backgroundColor: '#f5f5f5', 
    borderRadius: 10, 
    fontSize: 16, 
    paddingVertical: 8,
    paddingHorizontal: 16, 
    borderWidth: 1, 
    borderColor: '#ccc',
    height: 44,
  },
  listView: { 
    backgroundColor: '#fff', 
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 300,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1001,
  },
  row: {
    padding: 13,
    height: 50,
    flexDirection: 'row',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  description: {
    fontSize: 14,
  },
});
