import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import apiService from '../services/api/ApiService';
import databaseService from '../services/database/DatabaseService';
import PinPicker from '../components/Pins/PinPicker';

export default function PinCaptureScreen({ navigation, route }) {
  const { authorityId } = route.params || {};
  const [pinTypeId, setPinTypeId] = useState(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [latitude, setLatitude] = useState(route?.params?.latitude || null);
  const [longitude, setLongitude] = useState(route?.params?.longitude || null);
  const [saving, setSaving] = useState(false);

  const selectPhoto = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (res?.assets && res.assets.length > 0) {
      setPhoto(res.assets[0]);
    }
  };

  const takePhoto = async () => {
    const res = await launchCamera({ mediaType: 'photo', quality: 0.8 });
    if (res?.assets && res.assets.length > 0) {
      setPhoto(res.assets[0]);
    }
  };

  const uploadPhoto = async (local) => {
    const form = new FormData();
    const file = {
      uri: local.uri,
      name: local.fileName || `photo-${Date.now()}.jpg`,
      type: local.type || 'image/jpeg'
    };
    form.append('photo', file);
    form.append('authorityId', String(authorityId));

    const resp = await apiService.uploadPinPhoto(form);
    return resp?.data?.url || resp?.data?.downloadUrl || resp?.data?.url || resp?.data?.photoUrl || resp?.data?.url;
  };

  const savePin = async () => {
    if (!authorityId || !latitude || !longitude) {
      alert('Missing authority or location');
      return;
    }

    setSaving(true);

    try {
      let photoUrl = null;
      let photoLocalPath = null;
      if (photo) {
        // Store local path and upload later via sync, but upload immediately for convenience
        photoLocalPath = photo.uri;
        try {
          const uploaded = await uploadPhoto(photo);
          photoUrl = uploaded || null;
        } catch (err) {
          console.warn('Photo upload failed, will sync later', err);
        }
      }

      const pinData = {
        Authority_ID: authorityId,
        Pin_Type_ID: pinTypeId || null,
        Latitude: latitude,
        Longitude: longitude,
        Track_Type: null,
        Track_Number: null,
        MP: null,
        Notes: notes || null,
        Photo_URL: photoUrl,
        Photo_Local_Path: photoLocalPath
      };

      const insertedId = await databaseService.savePin(pinData);

      // Add to sync queue
      await databaseService.addToSyncQueue('pins', insertedId, 'INSERT', pinData);

      alert('Pin saved');
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save pin:', err);
      alert('Failed to save pin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Drop Pin</Text>

      <View style={styles.field}>
        <PinPicker onSelect={(type) => setPinTypeId(type.pin_type_id || type.Pin_Type_ID)} />
      </View>

      <View style={styles.field}>
        <Text>Notes</Text>
        <TextInput value={notes} onChangeText={setNotes} placeholder="Notes" style={[styles.input, { height: 80 }]} multiline />
      </View>

      <View style={styles.field}>
        <Text>Photo</Text>
        {photo ? <Image source={{ uri: photo.uri }} style={styles.preview} /> : <Text>No photo</Text>}
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity style={styles.btn} onPress={selectPhoto}><Text>Select</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { marginLeft: 8 }]} onPress={takePhoto}><Text>Camera</Text></TouchableOpacity>
        </View>
      </View>

      <Button title={saving ? 'Saving...' : 'Save Pin'} onPress={savePin} disabled={Boolean(saving)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  field: { marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6 },
  preview: { width: 200, height: 200, marginTop: 8 },
  btn: { padding: 10, backgroundColor: '#eee', borderRadius: 6 }
});
