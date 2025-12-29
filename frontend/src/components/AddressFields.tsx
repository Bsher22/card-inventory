// src/components/AddressFields.tsx
// Reusable address form fields component

import React from 'react';
import { US_STATES } from '../types/consignment';

interface AddressData {
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface AddressFieldsProps {
  values: AddressData;
  onChange: (field: keyof AddressData, value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export const AddressFields: React.FC<AddressFieldsProps> = ({
  values,
  onChange,
  disabled = false,
  required = false,
}) => {
  return (
    <div className="address-fields">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Shipping Address
        {required && <span className="text-red-500 ml-1">*</span>}
      </h4>
      
      {/* Street Address */}
      <div className="mb-3">
        <label htmlFor="street_address" className="block text-sm text-gray-600 mb-1">
          Street Address
        </label>
        <input
          type="text"
          id="street_address"
          name="street_address"
          value={values.street_address || ''}
          onChange={(e) => onChange('street_address', e.target.value)}
          disabled={disabled}
          placeholder="123 Main St, Suite 100"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
      
      {/* City, State, Zip Row */}
      <div className="grid grid-cols-6 gap-3 mb-3">
        {/* City */}
        <div className="col-span-3">
          <label htmlFor="city" className="block text-sm text-gray-600 mb-1">
            City
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={values.city || ''}
            onChange={(e) => onChange('city', e.target.value)}
            disabled={disabled}
            placeholder="City"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
        
        {/* State */}
        <div className="col-span-1">
          <label htmlFor="state" className="block text-sm text-gray-600 mb-1">
            State
          </label>
          <select
            id="state"
            name="state"
            value={values.state || ''}
            onChange={(e) => onChange('state', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">--</option>
            {US_STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.value}
              </option>
            ))}
          </select>
        </div>
        
        {/* Postal Code */}
        <div className="col-span-2">
          <label htmlFor="postal_code" className="block text-sm text-gray-600 mb-1">
            ZIP Code
          </label>
          <input
            type="text"
            id="postal_code"
            name="postal_code"
            value={values.postal_code || ''}
            onChange={(e) => onChange('postal_code', e.target.value)}
            disabled={disabled}
            placeholder="12345"
            maxLength={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>
      
      {/* Country */}
      <div className="mb-3">
        <label htmlFor="country" className="block text-sm text-gray-600 mb-1">
          Country
        </label>
        <input
          type="text"
          id="country"
          name="country"
          value={values.country || 'USA'}
          onChange={(e) => onChange('country', e.target.value)}
          disabled={disabled}
          placeholder="USA"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};

/**
 * Display-only formatted address component
 */
interface AddressDisplayProps {
  address: string | null | undefined;
  label?: string;
  className?: string;
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  label = 'Address',
  className = '',
}) => {
  if (!address) {
    return (
      <div className={`text-gray-400 italic ${className}`}>
        No address on file
      </div>
    );
  }
  
  return (
    <div className={className}>
      {label && (
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </div>
      )}
      <div className="whitespace-pre-line text-gray-900">
        {address}
      </div>
    </div>
  );
};

/**
 * Compact address display for tables/lists
 */
interface AddressInlineProps {
  city?: string | null;
  state?: string | null;
  className?: string;
}

export const AddressInline: React.FC<AddressInlineProps> = ({
  city,
  state,
  className = '',
}) => {
  if (!city && !state) {
    return <span className={`text-gray-400 ${className}`}>—</span>;
  }
  
  const parts = [city, state].filter(Boolean);
  return <span className={className}>{parts.join(', ')}</span>;
};

export default AddressFields;