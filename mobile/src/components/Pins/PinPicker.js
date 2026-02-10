import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import databaseService from '../../services/database/DatabaseService';

export default function PinPicker({ onSelect }) {
  const [types, setTypes] = useState([]);

  useEffect(() => {
    (async () => {
      // Load pin types from local DB; fallback to static list
      try {
        const res = await databaseService.executeQuery('SELECT * FROM pin_types WHERE is_active = 1 ORDER BY sort_order');
        const rows = [];
        for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
        setTypes(rows);
      } catch (err) {
        console.warn('Failed to load pin types, using fallback', err);
        setTypes([
          { pin_type_id: 1, pin_category: 'Info', pin_subtype: 'Note' },
          { pin_type_id: 2, pin_category: 'Safety', pin_subtype: 'Hazard' }
        ]);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pin Type</Text>
      <FlatList
        data={types}
        keyExtractor={(item, index) => String(item.pin_type_id || item.Pin_Type_ID || `pin-type-${index}`)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => onSelect(item)}>
            <Text style={styles.itemText}>{`${item.pin_category || item.Pin_Category} - ${item.pin_subtype || item.Pin_Subtype}`}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 8 },
  title: { fontWeight: '700', marginBottom: 8 },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemText: { fontSize: 14 }
});
