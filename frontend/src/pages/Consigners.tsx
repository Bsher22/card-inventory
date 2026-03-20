// src/pages/Consigners.tsx
// Consigner list page - cards link to individual detail pages

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { api } from '../api';
import type { Consigner } from '../types';
import { ConsignerFormModal, formatCurrency } from '../components/ConsignerComponents';
import { AddressInline } from '../components/AddressFields';

export default function Consigners() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const { data: consigners, isLoading } = useQuery({
    queryKey: ['consigners', showInactive],
    queryFn: () => api.consignments.getConsigners({ active_only: !showInactive }),
  });

  const handleCreated = () => {
    setShowCreateModal(false);
    queryClient.invalidateQueries({ queryKey: ['consigners'] });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consigners</h1>
          <p className="text-gray-500 mt-1">Manage people who get autographs at games and events</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add Consigner
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Show inactive consigners</span>
        </label>
      </div>

      {/* Consigners Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consigners?.map((consigner) => (
            <ConsignerListCard key={consigner.id} consigner={consigner} />
          ))}

          {consigners?.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No consigners found. Add one to start tracking autograph consignments.
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ConsignerFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreated}
        />
      )}
    </div>
  );
}


// ============================================
// CONSIGNER LIST CARD (clickable, links to detail)
// ============================================

function ConsignerListCard({ consigner }: { consigner: Consigner }) {
  const homeTeams = consigner.home_teams || [];

  return (
    <Link
      to={`/consigners/${consigner.id}`}
      className={`block bg-white rounded-xl border transition-all hover:shadow-md ${
        consigner.is_active
          ? 'border-gray-100 hover:border-blue-200'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">{consigner.name}</h3>
              {!consigner.is_active && (
                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded shrink-0">
                  Inactive
                </span>
              )}
            </div>

            {(consigner.city || consigner.state) && (
              <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                <MapPin size={14} />
                <AddressInline city={consigner.city} state={consigner.state} />
              </div>
            )}

            {/* Home teams badges */}
            {homeTeams.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {homeTeams.map((ht) => (
                  <span
                    key={ht.id}
                    className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200"
                  >
                    {ht.team_abbreviation || ht.team_name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {consigner.default_fee && (
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(Number(consigner.default_fee))}/card
              </span>
            )}
            <ChevronRight size={18} className="text-gray-400" />
          </div>
        </div>
      </div>
    </Link>
  );
}
