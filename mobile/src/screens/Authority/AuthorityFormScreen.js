import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import DropDownPicker from 'react-native-dropdown-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createAuthority } from '../../store/slices/authoritySlice';
import databaseService from '../../services/database/DatabaseService';
import navigationService from '../../navigation/NavigationService';

const authoritySchema = yup.object().shape({
  authorityType: yup.string().required('Authority type is required'),
  subdivisionId: yup.number().required('Subdivision is required'),
  beginMP: yup.number()
    .typeError('Begin milepost must be a number')
    .required('Begin milepost is required')
    .positive('Begin milepost must be positive'),
  endMP: yup.number()
    .typeError('End milepost must be a number')
    .required('End milepost is required')
    .positive('End milepost must be positive')
    .min(yup.ref('beginMP'), 'End milepost must be greater than or equal to begin milepost'),
  trackType: yup.string().required('Track type is required'),
  trackNumber: yup.string().required('Track number is required'),
  employeeNameDisplay: yup.string(),
  employeeContactDisplay: yup.string(),
  expirationTime: yup.date().nullable(),
});

const AuthorityFormScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const authorityState = useSelector((state) => state.authority);
  const isCreating = Boolean(authorityState.isCreating);
  const error = authorityState.error;

  const [subdivisions, setSubdivisions] = useState([]);
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);
  const [expirationDate, setExpirationDate] = useState(new Date());
  
  // Dropdown states
  const [authorityTypeOpen, setAuthorityTypeOpen] = useState(false);
  const [subdivisionOpen, setSubdivisionOpen] = useState(false);
  const [trackTypeOpen, setTrackTypeOpen] = useState(false);
  
  const authorityTypes = [
    { label: 'Track Authority', value: 'Track_Authority' },
    { label: 'Lone Worker Authority', value: 'Lone_Worker_Authority' },
  ];

  const trackTypes = [
    { label: 'Main', value: 'Main' },
    { label: 'Yard', value: 'Yard' },
    { label: 'Siding', value: 'Siding' },
    { label: 'Storage', value: 'Storage' },
    { label: 'X_Over', value: 'X_Over' },
    { label: 'Other', value: 'Other' },
  ];

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: yupResolver(authoritySchema),
    defaultValues: {
      authorityType: 'Track_Authority',
      employeeNameDisplay: user?.Employee_Name || '',
      employeeContactDisplay: user?.Employee_Contact || '',
    },
  });

  // Load subdivisions from database
  useEffect(() => {
    loadSubdivisions();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const loadSubdivisions = async () => {
    try {
      const query = 'SELECT * FROM subdivisions WHERE agency_id = ? AND is_active = 1';
      const result = await databaseService.executeQuery(query, [user?.Agency_ID]);
      
      const subdivisionOptions = [];
      for (let i = 0; i < result.rows.length; i++) {
        const sub = result.rows.item(i);
        subdivisionOptions.push({
          label: `${sub.subdivision_code} - ${sub.subdivision_name}`,
          value: sub.subdivision_id,
        });
      }
      
      setSubdivisions(subdivisionOptions);
    } catch (error) {
      console.error('Failed to load subdivisions:', error);
    }
  };

  const handleExpirationDateChange = (event, selectedDate) => {
    setShowExpirationPicker(false);
    if (selectedDate) {
      setExpirationDate(selectedDate);
      setValue('expirationTime', selectedDate);
    }
  };

  const showExpirationDatePicker = () => {
    setShowExpirationPicker(true);
  };

  const clearExpirationDate = () => {
    setExpirationDate(new Date());
    setValue('expirationTime', null);
  };

  const onSubmit = async (data) => {
    try {
      const result = await dispatch(createAuthority(data)).unwrap();
      
      if (result.hasOverlap && result.overlapDetails.length > 0) {
        Alert.alert(
          'Authority Created with Overlap',
          `Your authority overlaps with ${result.overlapDetails.length} other worker(s). Alerts have been sent.`,
          [
            {
              text: 'View Details',
              onPress: () => {
                navigationService.navigateToMapWithAuthority(result.authorityId || result.id);
              },
            },
            {
              text: 'Continue',
              onPress: () => {
                navigationService.navigateToMapWithAuthority(result.authorityId || result.id);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Authority Created',
          'Your authority has been created successfully.',
          [
            {
              text: 'Go to Map',
              onPress: () => {
                navigationService.navigateToMapWithAuthority(result.authorityId || result.id);
              },
            },
          ]
        );
      }
      
      // Reset form
      reset();
      setExpirationDate(new Date());
    } catch (err) {
      console.error('Failed to create authority:', err);
    }
  };

  const renderFormField = (name, label, renderInput) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      {renderInput}
      {errors[name] && (
        <Text style={styles.errorText}>{errors[name]?.message}</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Authority Type */}
        {renderFormField('authorityType', 'Authority Type', (
          <Controller
            control={control}
            name="authorityType"
            render={({ field: { onChange, value } }) => (
              <DropDownPicker
                open={authorityTypeOpen}
                value={value}
                items={authorityTypes}
                setOpen={setAuthorityTypeOpen}
                setValue={(callback) => onChange(callback(value))}
                setItems={() => {}}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                textStyle={styles.dropdownText}
                placeholder="Select authority type"
                zIndex={3000}
                zIndexInverse={1000}
              />
            )}
          />
        ))}

        {/* Subdivision */}
        {renderFormField('subdivisionId', 'Subdivision', (
          <Controller
            control={control}
            name="subdivisionId"
            render={({ field: { onChange, value } }) => (
              <DropDownPicker
                open={subdivisionOpen}
                value={value}
                items={subdivisions}
                setOpen={setSubdivisionOpen}
                setValue={(callback) => onChange(callback(value))}
                setItems={() => {}}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                textStyle={styles.dropdownText}
                placeholder="Select subdivision"
                searchable={true}
                searchPlaceholder="Search subdivisions..."
                zIndex={2000}
                zIndexInverse={2000}
              />
            )}
          />
        ))}

        {/* Milepost Range */}
        <View style={styles.row}>
          <View style={[styles.fieldContainer, styles.halfWidth]}>
            {renderFormField('beginMP', 'Begin Milepost', (
              <Controller
                control={control}
                name="beginMP"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, errors.beginMP && styles.inputError]}
                    placeholder="e.g., 1.0"
                    value={value?.toString()}
                    onChangeText={onChange}
                    keyboardType="numeric"
                  />
                )}
              />
            ))}
          </View>
          
          <View style={[styles.fieldContainer, styles.halfWidth]}>
            {renderFormField('endMP', 'End Milepost', (
              <Controller
                control={control}
                name="endMP"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, errors.endMP && styles.inputError]}
                    placeholder="e.g., 7.0"
                    value={value?.toString()}
                    onChangeText={onChange}
                    keyboardType="numeric"
                  />
                )}
              />
            ))}
          </View>
        </View>

        {/* Track Type */}
        {renderFormField('trackType', 'Track Type', (
          <Controller
            control={control}
            name="trackType"
            render={({ field: { onChange, value } }) => (
              <DropDownPicker
                open={trackTypeOpen}
                value={value}
                items={trackTypes}
                setOpen={setTrackTypeOpen}
                setValue={(callback) => onChange(callback(value))}
                setItems={() => {}}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                textStyle={styles.dropdownText}
                placeholder="Select track type"
                zIndex={1000}
                zIndexInverse={3000}
              />
            )}
          />
        ))}

        {/* Track Number */}
        {renderFormField('trackNumber', 'Track Number', (
          <Controller
            control={control}
            name="trackNumber"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.trackNumber && styles.inputError]}
                placeholder="e.g., 1, A, B1"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        ))}

        {/* Display Name */}
        {renderFormField('employeeNameDisplay', 'Display Name (Optional)', (
          <Controller
            control={control}
            name="employeeNameDisplay"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="Name to show in alerts"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        ))}

        {/* Display Contact */}
        {renderFormField('employeeContactDisplay', 'Display Contact (Optional)', (
          <Controller
            control={control}
            name="employeeContactDisplay"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="Contact to show in alerts"
                value={value}
                onChangeText={onChange}
                keyboardType="phone-pad"
              />
            )}
          />
        ))}

        {/* Expiration Time */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Expiration Time (Optional)</Text>
          <View style={styles.expirationContainer}>
            <TouchableOpacity
              style={styles.expirationButton}
              onPress={showExpirationDatePicker}
            >
              <MaterialCommunityIcons name="calendar" size={20} color="#FFD100" />
              <Text style={styles.expirationText}>
                {watch('expirationTime')
                  ? new Date(watch('expirationTime')).toLocaleString()
                  : 'Set expiration time'}
              </Text>
            </TouchableOpacity>
            
            {watch('expirationTime') && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearExpirationDate}
              >
                <MaterialCommunityIcons name="close" size={20} color="#FF4444" />
              </TouchableOpacity>
            )}
          </View>
          
          {showExpirationPicker && (
            <DateTimePicker
              value={expirationDate}
              mode="datetime"
              display="default"
              onChange={handleExpirationDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Example Section */}
        <View style={styles.exampleContainer}>
          <Text style={styles.exampleTitle}>Example:</Text>
          <Text style={styles.exampleText}>
            Subdivision: Medlin{'\n'}
            Begin MP: 1{'\n'}
            End MP: 7{'\n'}
            Track Type: Main{'\n'}
            Track Number: 1{'\n'}
            Display Name: Ryan Medlin{'\n'}
            Display Contact: XXX-XXX-XXXX
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isCreating === true}
        >
          {isCreating ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <>
              <MaterialCommunityIcons name="clipboard-check" size={24} color="#000000" />
              <Text style={styles.submitButtonText}>Create Authority</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Add TextInput import and style
import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  dropdown: {
    backgroundColor: '#2A2A2A',
    borderColor: '#333333',
    borderRadius: 8,
  },
  dropdownContainer: {
    backgroundColor: '#2A2A2A',
    borderColor: '#333333',
  },
  dropdownText: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
  },
  expirationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expirationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  expirationText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 10,
    padding: 10,
  },
  exampleContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD100',
  },
  exampleTitle: {
    color: '#FFD100',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  exampleText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#FFD100',
    borderRadius: 8,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#666666',
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default AuthorityFormScreen;
