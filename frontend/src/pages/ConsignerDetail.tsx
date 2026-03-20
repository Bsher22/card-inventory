// src/pages/ConsignerDetail.tsx
// Individual consigner detail page

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Copy,
  Check,
  CreditCard,
  Edit2,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import { api } from '../api';
import type { Consigner } from '../types';
import {
  UpcomingSchedulePanel,
  ConsignerFormModal,
  formatCurrency,
} from '../components/ConsignerComponents';

export default function ConsignerDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const { data: consigner, isLoading } = useQuery<Consigner>({
    queryKey: ['consigner', id],
    queryFn: () => api.consignments.getConsigner(id!),
    enabled: !!id,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => api.consignments.updateConsigner(id!, {
      is_active: !consigner?.is_active
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consigner', id] });
      queryClient.invalidateQueries({ queryKey: ['consigners'] });
    },
  });

  const handleCopyAddress = async () => {
    if (consigner?.formatted_address) {
      await navigator.clipboard.writeText(consigner.formatted_address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleUpdated = () => {
    setShowEditModal(false);
    queryClient.invalidateQueries({ queryKey: ['consigner', id] });
    queryClient.invalidateQueries({ queryKey: ['consigners'] });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-40 bg-gray-200 rounded-xl"></div>
            <div className="h-40 bg-gray-200 rounded-xl"></div>
            <div className="h-40 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!consigner) {
    return (
      <div className="p-8">
        <Link to="/consigners" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft size={16} />
          Back to Consigners
        </Link>
        <div className="text-center py-12 text-gray-500">Consigner not found</div>
      </div>
    );
  }

  const homeTeams = consigner.home_teams || [];

  return (
    <div className="p-8">
      {/* Back link */}
      <Link to="/consigners" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-6">
        <ArrowLeft size={16} />
        Back to Consigners
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{consigner.name}</h1>
            {!consigner.is_active && (
              <span className="text-xs px-2.5 py-1 bg-gray-200 text-gray-600 rounded-full">
                Inactive
              </span>
            )}
            {consigner.default_fee && (
              <span className="text-sm font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                {formatCurrency(Number(consigner.default_fee))}/card
              </span>
            )}
          </div>
          {/* Home team badges */}
          {homeTeams.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {homeTeams.map((ht) => (
                <span
                  key={ht.id}
                  className="text-xs px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200"
                >
                  {ht.team_name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            onClick={() => toggleActiveMutation.mutate()}
            disabled={toggleActiveMutation.isPending}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              consigner.is_active
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {consigner.is_active ? 'Mark Inactive' : 'Mark Active'}
          </button>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Contact */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</h3>
          <div className="space-y-2">
            {consigner.email ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <a href={`mailto:${consigner.email}`} className="hover:text-blue-600 truncate">
                  {consigner.email}
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail size={14} className="shrink-0" />
                No email
              </div>
            )}
            {consigner.phone ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <a href={`tel:${consigner.phone}`} className="hover:text-blue-600">
                  {consigner.phone}
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone size={14} className="shrink-0" />
                No phone
              </div>
            )}
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <MapPin size={12} />
              Shipping Address
            </h3>
            {consigner.formatted_address && (
              <button
                onClick={handleCopyAddress}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Copy address"
              >
                {copiedAddress ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            )}
          </div>
          {consigner.formatted_address ? (
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {consigner.formatted_address}
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">No address on file</div>
          )}
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-3">
            <CreditCard size={12} />
            Payment
          </h3>
          {consigner.payment_method || consigner.payment_details ? (
            <div className="space-y-1">
              {consigner.payment_method && (
                <div className="text-sm font-medium text-gray-700">{consigner.payment_method}</div>
              )}
              {consigner.payment_details && (
                <div className="text-sm text-gray-500">{consigner.payment_details}</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">No payment info</div>
          )}
        </div>
      </div>

      {/* Notes */}
      {consigner.notes && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-5 mb-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h3>
          <p className="text-sm text-gray-700">{consigner.notes}</p>
        </div>
      )}

      {/* Schedule */}
      {homeTeams.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <UpcomingSchedulePanel homeTeams={homeTeams} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">No home teams assigned</p>
          <p className="text-xs text-gray-400 mt-1">Edit this consigner to add MiLB teams they attend</p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <ConsignerFormModal
          consigner={consigner}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleUpdated}
        />
      )}
    </div>
  );
}
