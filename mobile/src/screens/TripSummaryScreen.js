import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import databaseService from '../services/database/DatabaseService';

export default function TripSummaryScreen({ route }) {
  const { authorityId } = route.params || {};
  const [pins, setPins] = useState([]);
  const [gpsLogs, setGpsLogs] = useState([]);

  useEffect(() => {
    (async () => {
      if (!authorityId) return;
      const p = await databaseService.getAuthorityPins(authorityId);
      setPins(p || []);

      // get GPS for authority - using pending logs as example
      const allLogs = await databaseService.getPendingGPSLogs(1000);
      const filtered = allLogs.filter(l => String(l.authority_id) === String(authorityId) || l.authority_id === authorityId);
      setGpsLogs(filtered || []);
    })();
  }, [authorityId]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Trip Summary</Text>

      <Text style={styles.sectionTitle}>Pins</Text>
      <FlatList
        data={pins}
        keyExtractor={(item) => String(item.pin_id || item.id || Math.random())}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>{item.pin_category || item.Pin_Category || 'Pin'}</Text>
            <Text>{item.notes || item.Notes}</Text>
            <Text>{`MP: ${item.mp || item.MP || ''}`}</Text>
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>GPS Logs</Text>
      <FlatList
        data={gpsLogs}
        keyExtractor={(i) => String(i.log_id || i.id || Math.random())}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{new Date(item.created_at || item.createdAt || Date.now()).toLocaleString()}</Text>
            <Text>{`Lat: ${item.latitude}, Lon: ${item.longitude}`}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  sectionTitle: { marginTop: 12, fontSize: 16, fontWeight: '600' },
  item: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemTitle: { fontWeight: '600' }
});
