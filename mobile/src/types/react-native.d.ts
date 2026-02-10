declare module 'react-native-dropdown-picker' {
  import { ComponentType } from 'react';
  
  export interface DropDownPickerProps {
    open: boolean;
    value: any;
    items: any[];
    setOpen: (open: boolean | ((open: boolean) => boolean)) => void;
    setValue: (value: any) => void;
    setItems: (items: any[]) => void;
    style?: any;
    dropDownContainerStyle?: any;
    textStyle?: any;
    placeholder?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    zIndex?: number;
    zIndexInverse?: number;
    listMode?: 'SCROLLVIEW' | 'FLATLIST' | 'MODAL';
    mode?: 'DEFAULT' | 'SIMPLE' | 'BADGE';
    [key: string]: any;
  }
  
  const DropDownPicker: ComponentType<DropDownPickerProps>;
  export default DropDownPicker;
}

