import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

interface RepairRequest {
  id: number;
  user_name: string;
  user_phone: string;
  services: Array<{
    id: number;
    name: string;
    description: string;
    special_instructions: string;
    price: number;
    discount_amount: number;
  }>;
  files: Array<{
    id: number;
    s3_key: string;
    file_type: string;
    original_name: string;
    file_size: number;
    display_order: number;
    downloadUrl?: string;
  }>;
  total_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  preferred_date: string;
  notes: string;
  payment_method: string;
  alternate_number?: string;
  email?: string;
  address?: string;
  rejection_note?: string;
  // Additional fields for better admin view
  contact_number?: string;
  start_time?: string;
  end_time?: string;
  expires_at?: string;
  updated_at?: string;
  // Coupon information
  coupon_code?: string;
  coupon_discount_type?: string;
  coupon_discount_value?: number;
  coupon_discount_amount?: number;
}

interface RepairService {
  id: number;
  name: string;
  description: string;
  special_instructions: string;
  price: number;
}

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
}

const RepairManagement: React.FC = () => {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [services, setServices] = useState<RepairService[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [mechanicCharge, setMechanicCharge] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Request details modal
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{files: any[], currentIndex: number, type?: string} | null>(null);
  
  // Service management states
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<RepairService | null>(null);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    special_instructions: '',
    price: 0
  });
  const [servicesInUse, setServicesInUse] = useState<Set<number>>(new Set());

  // Time slot management states
  const [showTimeSlotForm, setShowTimeSlotForm] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState({
    start_time: '',
    end_time: ''
  });

  // Confirmation modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState(false);
  const [showDeleteTimeSlotModal, setShowDeleteTimeSlotModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    type: 'status' | 'delete' | 'deleteService' | 'deleteTimeSlot' | 'reject';
    requestId?: number;
    serviceId?: number;
    timeSlotId?: number;
    newStatus?: string;
    currentStatus?: string;
  } | null>(null);

  // Status filter state
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('pending');

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRepairRequests();
    } else if (activeTab === 'catalog') {
      fetchRepairServices();
      fetchTimeSlots();
      fetchMechanicCharge();
      checkServicesInUse(); // Call this function when services are fetched
    }
  }, [activeTab]);

  // Test connection to backend
  const testConnection = async () => {
    try {
      console.log('🔍 Testing connection to backend...');
      const response = await fetch(`${API_BASE_URL}/health`);
      console.log('📡 Health check response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend is running:', data);
        setSuccess('Backend connection successful');
      } else {
        console.error('❌ Backend health check failed:', response.status);
        setError(`Backend connection failed: HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('❌ Connection test failed:', err);
      setError(`Cannot connect to backend: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const fetchRepairRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        setError('Admin token not found. Please log in again.');
        return;
      }
      
      console.log('🔄 Fetching repair requests...');
      console.log('🌐 API URL:', `${API_BASE_URL}/api/repair/admin/requests`);
      
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch repair requests`);
      }

      const data = await response.json();
      console.log('✅ Success response:', data);
      
      setRequests(Array.isArray(data.data?.requests) ? data.data.requests : []);
      setSuccess('Repair requests loaded successfully');
    } catch (err) {
      console.error('❌ Error in fetchRepairRequests:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepairServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/services`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repair services');
      }

      const data = await response.json();
      setServices(Array.isArray(data.data) ? data.data : []);
      
      // Check which services are in use
      await checkServicesInUse();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/time-slots`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTimeSlots(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch time slots:', err);
    }
  };

  const fetchMechanicCharge = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/mechanic-charge`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMechanicCharge(data.data?.charge || 0);
      }
    } catch (err) {
      console.error('Failed to fetch mechanic charge:', err);
    }
  };

  const checkServicesInUse = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const requests = Array.isArray(data.data?.requests) ? data.data.requests : [];
        
        // Extract all service IDs that are being used in active requests
        const usedServiceIds = new Set<number>();
        requests.forEach((request: any) => {
          if (request.services && Array.isArray(request.services)) {
            request.services.forEach((service: any) => {
              if (service.id) {
                usedServiceIds.add(service.id);
              }
            });
          }
        });
        
        setServicesInUse(usedServiceIds);
      }
    } catch (err) {
      console.error('Failed to check services in use:', err);
    }
  };

  const updateRequestStatus = async (requestId: number, status: string, rejectionNote?: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        setError('Admin token not found. Please log in again.');
        return;
      }
      
      const requestBody: any = { status };
      if (status === 'rejected' && rejectionNote) {
        requestBody.rejectionNote = rejectionNote;
      }
      
      console.log('🔄 Updating request status:', { requestId, status, requestBody });
      console.log('🌐 API URL:', `${API_BASE_URL}/api/repair/admin/requests/${requestId}/status`);
      
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update request status`);
      }

      const successData = await response.json();
      console.log('✅ Success response:', successData);

      setSuccess(`Request status updated to ${status}`);
      fetchRepairRequests();
    } catch (err) {
      console.error('❌ Error in updateRequestStatus:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteRequest = async (requestId: number) => {
    try {
      setError(null);
      
      // Optimistic update - remove from UI immediately
      setRequests(prevRequests => prevRequests.filter(r => r.id !== requestId));
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Revert optimistic update on error
        fetchRepairRequests();
        throw new Error('Failed to delete request');
      }

      setSuccess('Request deleted successfully');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const createService = async () => {
    try {
      setError(null);
      
      // Frontend validation
      if (!newService.name.trim()) {
        setError('Service name is required');
        return;
      }
      
      if (newService.price <= 0) {
        setError('Price must be greater than 0');
        return;
      }
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/services`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newService)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create service');
      }

      setSuccess('Service created successfully');
      clearServiceForm();
      fetchRepairServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateService = async (serviceId: number) => {
    if (!editingService) return;

    try {
      setError(null);
      
      // Frontend validation
      if (!editingService.name.trim()) {
        setError('Service name is required');
        return;
      }
      
      if (editingService.price <= 0) {
        setError('Price must be greater than 0');
        return;
      }
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingService)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update service');
      }

      setSuccess('Service updated successfully');
      setEditingService(null);
      fetchRepairServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteService = async (serviceId: number) => {
    try {
      setError(null);
      
      // Optimistic update - remove from UI immediately
      setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Revert optimistic update on error
        fetchRepairServices();
        
        // Show specific error message for services in use
        if (response.status === 400 && errorData.message?.includes('being used')) {
          throw new Error('Cannot delete service. It is being used in existing repair requests. Please complete or cancel those requests first.');
        }
        
        throw new Error(errorData.message || 'Failed to delete service');
      }

      setSuccess('Service deleted successfully');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateMechanicCharge = async () => {
    try {
      setError(null);
      
      // Frontend validation
      if (mechanicCharge < 0) {
        setError('Mechanic charge cannot be negative');
        return;
      }
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/mechanic-charge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ charge: mechanicCharge })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update mechanic charge');
      }

      setSuccess('Mechanic charge updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const createTimeSlot = async () => {
    try {
      setError(null);
      
      // Frontend validation
      if (!newTimeSlot.start_time.trim()) {
        setError('Start time is required');
        return;
      }
      
      if (!newTimeSlot.end_time.trim()) {
        setError('End time is required');
        return;
      }
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/time-slots`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTimeSlot)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create time slot');
      }

      setSuccess('Time slot created successfully');
      clearTimeSlotForm();
      fetchTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteTimeSlot = async (timeSlotId: number) => {
    try {
      setError(null);
      
      // Optimistic update - remove from UI immediately
      setTimeSlots(prevTimeSlots => prevTimeSlots.filter(ts => ts.id !== timeSlotId));
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/repair/admin/time-slots/${timeSlotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Revert optimistic update on error
        fetchTimeSlots();
        throw new Error(errorData.message || 'Failed to delete time slot');
      }

      setSuccess('Time slot deleted successfully');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleStatusChange = (requestId: number, newStatus: string) => {
    const currentRequest = requests.find(r => r.id === requestId);
    setPendingAction({ 
      type: 'status', 
      requestId, 
      newStatus, 
      currentStatus: currentRequest?.status 
    });
    setShowStatusModal(true);
  };

  const handleDeleteRequest = (requestId: number) => {
    setPendingAction({ type: 'delete', requestId });
    setShowDeleteModal(true);
  };

  const handleDeleteService = (serviceId: number) => {
    if (servicesInUse.has(serviceId)) {
      setError('Cannot delete service. It is being used in repair requests. Please complete or cancel those requests first.');
      return;
    }
    setPendingAction({ type: 'deleteService', serviceId });
    setShowDeleteServiceModal(true);
  };

  const handleDeleteTimeSlot = (timeSlotId: number) => {
    setPendingAction({ type: 'deleteTimeSlot', timeSlotId });
    setShowDeleteTimeSlotModal(true);
  };

  const handleRejectRequest = (requestId: number) => {
    setPendingAction({ type: 'reject', requestId });
    setRejectionNote('');
    setShowRejectModal(true);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    try {
      if (pendingAction.type === 'status' && pendingAction.requestId && pendingAction.newStatus) {
        await updateRequestStatus(pendingAction.requestId, pendingAction.newStatus);
      } else if (pendingAction.type === 'delete' && pendingAction.requestId) {
        await deleteRequest(pendingAction.requestId);
      } else if (pendingAction.type === 'deleteService' && pendingAction.serviceId) {
        await deleteService(pendingAction.serviceId);
      } else if (pendingAction.type === 'deleteTimeSlot' && pendingAction.timeSlotId) {
        await deleteTimeSlot(pendingAction.timeSlotId);
      } else if (pendingAction.type === 'reject' && pendingAction.requestId) {
        await updateRequestStatus(pendingAction.requestId, 'rejected', rejectionNote);
      }
    } catch (error) {
      // Error is already handled in the individual functions
      return; // Don't close modals if there's an error
    }

    // Only close modals if all operations completed successfully
    setShowStatusModal(false);
    setShowDeleteModal(false);
    setShowDeleteServiceModal(false);
    setShowDeleteTimeSlotModal(false);
    setShowRejectModal(false);
    setPendingAction(null);
    setRejectionNote('');
  };

  const clearServiceForm = () => {
    setNewService({
      name: '',
      description: '',
      special_instructions: '',
      price: 0
    });
    setShowServiceForm(false);
  };

  const clearTimeSlotForm = () => {
    setNewTimeSlot({
      start_time: '',
      end_time: ''
    });
    setShowTimeSlotForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#ffc107';
      case 'approved': return '#28a745';
      case 'waiting_payment': return '#17a2b8';
      case 'active': return '#28a745';
      case 'completed': return '#6c757d';
      case 'expired': return '#dc3545';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'waiting_payment': return 'Waiting for Payment';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'expired': return 'Expired';
      case 'rejected': return 'Rejected';
      default: return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  };

  const getPendingRequests = () => requests.filter(r => r.status.toLowerCase() === 'pending').length;
  const getActiveRequests = () => requests.filter(r => r.status.toLowerCase() === 'active').length;
  const getTotalRequests = () => requests.length;

  // Filter functions
  const getFilteredRequests = () => {
    if (activeStatusFilter === 'all') {
      return requests;
    }
    return requests.filter(r => r.status.toLowerCase() === activeStatusFilter);
  };

  const getStatusCount = (status: string) => {
    return requests.filter(r => r.status.toLowerCase() === status).length;
  };

  if (loading && requests.length === 0 && services.length === 0) return <div className="loading">Loading...</div>;
  if (error && requests.length === 0 && services.length === 0) return <div className="error">Error: {error}</div>;

  return (
    <div className="repair-management">
      <div className="page-header">
      <h2>Repair Management</h2>
        <div className="header-actions">
          <button onClick={testConnection} className="test-btn">
            <span>🔍</span> Test Connection
          </button>
          <button onClick={activeTab === 'requests' ? fetchRepairRequests : fetchRepairServices} className="refresh-btn">
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {success && (
        <div className="success-message">
          <span>✅</span> {success}
        </div>
      )}
      
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Repair Requests
        </button>
        <button 
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Service Catalog
        </button>
      </div>

      {activeTab === 'requests' && (
        <>
          <div className="requests-overview">
            <div className="overview-stats">
              <div className="stat-card">
                <div className="stat-number">{getTotalRequests()}</div>
                <div className="stat-label">Total Requests</div>
          </div>
              <div className="stat-card">
                <div className="stat-number">{getPendingRequests()}</div>
                <div className="stat-label">Pending Requests</div>
                    </div>
              <div className="stat-card">
                <div className="stat-number">{getActiveRequests()}</div>
                <div className="stat-label">Active</div>
                      </div>
                      </div>
                    </div>

          <div className="requests-section">
            <div className="status-filter-tabs">
              <button 
                className={`status-tab ${activeStatusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('all')}
                                >
                All Requests ({getTotalRequests()})
              </button>
                      <button 
                className={`status-tab ${activeStatusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('pending')}
                      >
                Pending ({getStatusCount('pending')})
                      </button>
                            <button 
                className={`status-tab ${activeStatusFilter === 'approved' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('approved')}
                            >
                Approved ({getStatusCount('approved')})
                            </button>
                            <button 
                className={`status-tab ${activeStatusFilter === 'waiting_payment' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('waiting_payment')}
                            >
                Waiting Payment ({getStatusCount('waiting_payment')})
                            </button>
                          <button 
                className={`status-tab ${activeStatusFilter === 'active' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('active')}
                          >
                Active ({getStatusCount('active')})
                          </button>
                        <button 
                className={`status-tab ${activeStatusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('completed')}
                        >
                Completed ({getStatusCount('completed')})
                        </button>
              <button 
                className={`status-tab ${activeStatusFilter === 'expired' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('expired')}
              >
                Expired ({getStatusCount('expired')})
              </button>
              <button 
                className={`status-tab ${activeStatusFilter === 'rejected' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('rejected')}
              >
                Rejected ({getStatusCount('rejected')})
              </button>
                    </div>
            
            {getFilteredRequests().length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔧</div>
                <h3>No {activeStatusFilter === 'all' ? '' : activeStatusFilter} Requests</h3>
                <p>
                  {activeStatusFilter === 'all' 
                    ? 'No repair requests have been made yet.' 
                    : `No ${activeStatusFilter} repair requests found.`
                  }
                </p>
            </div>
            ) : (
              <div className="requests-grid">
                {getFilteredRequests().map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-header">
                      <h4>Request #{request.id}</h4>
                  <span 
                    className="status-badge"
                        style={{ backgroundColor: getStatusColor(request.status) }}
                  >
                        {getStatusText(request.status)}
                  </span>
              </div>

                    <div className="quick-info">
                      <div className="quick-info-item">
                        <span className="quick-info-label">Customer</span>
                        <span className="quick-info-value">{request.user_name}</span>
                  </div>
                      <div className="quick-info-item">
                        <span className="quick-info-label">Amount</span>
                        <span className="quick-info-value">₹{request.net_amount}</span>
                  </div>
                      <div className="quick-info-item">
                        <span className="quick-info-label">Services</span>
                        <span className="quick-info-value">
                          {request.services.length} service{request.services.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                      <div className="quick-info-item">
                        <span className="quick-info-label">Date</span>
                        <span className="quick-info-value">
                          {new Date(request.preferred_date).toLocaleDateString()}
                    </span>
                </div>
              </div>

                    <div className="request-summary">
                      <div className="summary-row">
                        <span className="summary-label">Phone:</span>
                        <span className="summary-value">{request.user_phone}</span>
                  </div>
                      <div className="summary-row">
                        <span className="summary-label">Time:</span>
                        <span className="summary-value">
                          {request.start_time && request.end_time 
                            ? `${request.start_time} - ${request.end_time}`
                            : 'Time slot not available'
                          }
                        </span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">Payment:</span>
                        <span className="summary-value">{request.payment_method}</span>
                      </div>
                      {request.files.length > 0 && (
                        <div className="summary-row">
                          <span className="summary-label">Files:</span>
                          <span className="summary-value">{request.files.length} attached</span>
                      </div>
                  )}
              </div>

                    <div className="request-actions">
                    <button 
                        onClick={() => setSelectedRequest(request)}
                        className="action-btn view"
                    >
                        View Details
                    </button>
                      
                                            {request.status.toLowerCase() === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusChange(request.id, 'approved')}
                            className="action-btn approve"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRejectRequest(request.id)}
                            className="action-btn reject"
                          >
                            Reject
                          </button>
                        </>
                      )}
              
                      {request.status.toLowerCase() === 'approved' && (
                <button 
                          onClick={() => handleStatusChange(request.id, 'active')}
                          className="action-btn progress"
                >
                          Start Work
                </button>
              )}
              
                      {request.status.toLowerCase() === 'waiting_payment' && (
              <button 
                          onClick={() => handleStatusChange(request.id, 'active')}
                          className="action-btn progress"
              >
                          Payment Received
              </button>
      )}

                      {request.status.toLowerCase() === 'active' && (
            <button 
                          onClick={() => handleStatusChange(request.id, 'completed')}
                  className="action-btn complete"
            >
                          Complete
            </button>
              )}
              
                  <button 
                        onClick={() => handleDeleteRequest(request.id)}
                className="action-btn delete"
                  >
                    Delete
                  </button>
            </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'catalog' && (
        <div className="catalog-section">
          {/* Services Management */}
          <div className="services-management">
            <div className="section-header">
              <h3>Repair Services</h3>
            <button 
              onClick={() => setShowServiceForm(!showServiceForm)} 
              className="add-btn"
            >
              {showServiceForm ? 'Cancel' : 'Add New Service'}
            </button>
            </div>

            {showServiceForm && (
              <div className="service-form">
                <h4>Add New Service</h4>
                <div className="form-grid">
                <div className="form-group">
                  <label>Service Name:</label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({...newService, name: e.target.value})}
                      placeholder="e.g., Brake Repair"
                  />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={newService.description}
                    onChange={(e) => setNewService({...newService, description: e.target.value})}
                    placeholder="Service description"
                  />
                </div>
                <div className="form-group">
                  <label>Special Instructions:</label>
                  <textarea
                    value={newService.special_instructions}
                    onChange={(e) => setNewService({...newService, special_instructions: e.target.value})}
                    placeholder="Special instructions for mechanics"
                  />
                </div>
                <div className="form-group">
                  <label>Price (₹):</label>
                  <input
                    type="number"
                    value={newService.price}
                    onChange={(e) => setNewService({...newService, price: Number(e.target.value)})}
                    min="0"
                    step="10"
                  />
                </div>
                </div>
                <button 
                  onClick={createService} 
                  className="submit-btn"
                >
                  Create Service
                </button>
              </div>
            )}

            <div className="services-grid">
              {services.map((service) => (
                <div key={service.id} className="service-card">
                  {editingService?.id === service.id ? (
                    <div className="service-edit-form">
                      <input
                        type="text"
                        value={editingService.name}
                        onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                      />
                      <textarea
                        value={editingService.description}
                        onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                      />
                      <textarea
                        value={editingService.special_instructions}
                        onChange={(e) => setEditingService({...editingService, special_instructions: e.target.value})}
                      />
                      <input
                        type="number"
                        value={editingService.price}
                        onChange={(e) => setEditingService({...editingService, price: Number(e.target.value)})}
                      />
                      <div className="edit-actions">
                        <button onClick={() => updateService(service.id)} className="save-btn">
                          Save
                        </button>
                        <button onClick={() => setEditingService(null)} className="cancel-btn">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="service-header">
                        <h4>{service.name}</h4>
                        <span className="price">₹{service.price}</span>
                      </div>
                      
                      <div className="service-details">
                        <p><strong>Description:</strong> {service.description}</p>
                        {service.special_instructions && (
                          <p><strong>Special Instructions:</strong> {service.special_instructions}</p>
                        )}
                      </div>

                      <div className="service-actions">
                        <button 
                          onClick={() => setEditingService(service)}
                          className="edit-btn"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteService(service.id)}
                          className={`delete-btn ${servicesInUse.has(service.id) ? 'disabled' : ''}`}
                          disabled={servicesInUse.has(service.id)}
                          title={servicesInUse.has(service.id) ? 'Cannot delete: Service is being used in repair requests' : ''}
                        >
                          Delete
                        </button>
                      </div>
                      {servicesInUse.has(service.id) && (
                        <div className="service-warning">
                          ⚠️ This service is being used in repair requests
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Time Slots Management */}
          <div className="time-slots-management">
            <div className="section-header">
              <h3>Time Slots</h3>
              <button 
                onClick={() => setShowTimeSlotForm(!showTimeSlotForm)} 
                className="add-btn"
              >
                {showTimeSlotForm ? 'Cancel' : 'Add New Time Slot'}
              </button>
            </div>

            {showTimeSlotForm && (
              <div className="time-slot-form">
                <h4>Add New Time Slot</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Start Time:</label>
                    <input
                      type="time"
                      value={newTimeSlot.start_time}
                      onChange={(e) => setNewTimeSlot({...newTimeSlot, start_time: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time:</label>
                    <input
                      type="time"
                      value={newTimeSlot.end_time}
                      onChange={(e) => setNewTimeSlot({...newTimeSlot, end_time: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  onClick={createTimeSlot} 
                  className="submit-btn"
                >
                  Create Time Slot
                </button>
        </div>
      )}

            <div className="time-slots-grid">
              {timeSlots.map((timeSlot) => (
                <div key={timeSlot.id} className="time-slot-card">
                  <div className="time-slot-header">
                    <h4>{timeSlot.start_time} - {timeSlot.end_time}</h4>
                  </div>
                  
                  <div className="time-slot-actions">
                    <button 
                      onClick={() => handleDeleteTimeSlot(timeSlot.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mechanic Charge Management */}
          <div className="mechanic-charge-management">
            <div className="section-header">
              <h3>Mechanic Charge</h3>
            </div>
            <div className="mechanic-charge-form">
              <div className="form-group">
                <label>Base Mechanic Charge (₹):</label>
                <input
                  type="number"
                  value={mechanicCharge}
                  onChange={(e) => setMechanicCharge(Number(e.target.value))}
                  min="0"
                  step="10"
                />
              </div>
              <button 
                onClick={updateMechanicCharge} 
                className="submit-btn"
              >
                Update Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Status Change</h3>
              <button className="close-btn" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="status-change-info">
                <div className="current-status">
                  <span className="status-label">Current Status:</span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(pendingAction?.currentStatus || '') }}
                  >
                    {getStatusText(pendingAction?.currentStatus || '')}
                  </span>
                </div>
                <div className="status-arrow">→</div>
                <div className="new-status">
                  <span className="status-label">New Status:</span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(pendingAction?.newStatus || '') }}
                  >
                    {getStatusText(pendingAction?.newStatus || '')}
                  </span>
                </div>
              </div>
              <p className="confirmation-text">Are you sure you want to change the status?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowStatusModal(false)}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmAction}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Are you sure you want to delete this repair request?</p>
              <p><strong>This action cannot be undone.</strong></p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={confirmAction}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteServiceModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteServiceModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="close-btn" onClick={() => setShowDeleteServiceModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Are you sure you want to delete this service?</p>
              <p><strong>This action cannot be undone.</strong></p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDeleteServiceModal(false)}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={confirmAction}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteTimeSlotModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteTimeSlotModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="close-btn" onClick={() => setShowDeleteTimeSlotModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Are you sure you want to delete this time slot?</p>
              <p><strong>This action cannot be undone.</strong></p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDeleteTimeSlotModal(false)}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={confirmAction}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Repair Request Details</h3>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="request-details-grid">
                <div className="detail-group">
                  <label>Customer Name:</label>
                  <p>{selectedRequest.user_name}</p>
                </div>
                <div className="detail-group">
                  <label>Phone:</label>
                  <p>{selectedRequest.user_phone}</p>
                </div>
                <div className="detail-group">
                  <label>Email:</label>
                  <p>{selectedRequest.email || 'Not provided'}</p>
                </div>
                <div className="detail-group">
                  <label>Preferred Date:</label>
                  <p>{new Date(selectedRequest.preferred_date).toLocaleDateString()}</p>
                </div>
                <div className="detail-group">
                  <label>Time Slot:</label>
                  <p>
                    {selectedRequest.start_time && selectedRequest.end_time 
                      ? `${selectedRequest.start_time} - ${selectedRequest.end_time}`
                      : 'Time slot not available'
                    }
                  </p>
                </div>
                <div className="detail-group">
                  <label>Total Amount:</label>
                  <p>₹{selectedRequest.total_amount}</p>
                </div>
                <div className="detail-group">
                  <label>Net Amount:</label>
                  <p>₹{selectedRequest.net_amount}</p>
                </div>
                <div className="detail-group">
                  <label>Payment Method:</label>
                  <p>{selectedRequest.payment_method}</p>
                </div>
                {selectedRequest.address && (
                  <div className="detail-group full-width">
                    <label>Address:</label>
                    <p>{selectedRequest.address}</p>
                  </div>
                )}
                {selectedRequest.notes && (
                  <div className="detail-group full-width">
                    <label>Notes:</label>
                    <p>{selectedRequest.notes}</p>
                  </div>
                )}
                {selectedRequest.coupon_code && (
                  <div className="detail-group">
                    <label>Coupon Used:</label>
                    <p>{selectedRequest.coupon_code} (₹{selectedRequest.coupon_discount_amount} off)</p>
                  </div>
                )}
                <div className="detail-group">
                  <label>Status:</label>
                  <p>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedRequest.status) }}
                    >
                      {getStatusText(selectedRequest.status)}
                    </span>
                  </p>
                </div>
                <div className="detail-group">
                  <label>Created:</label>
                  <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
                {selectedRequest.rejection_note && (
                  <div className="detail-group full-width">
                    <label>Rejection Note:</label>
                    <p className="rejection-note">{selectedRequest.rejection_note}</p>
                  </div>
                )}
              </div>

              {/* Services Section */}
              <div className="services-section">
                <h4>Requested Services</h4>
                <div className="services-list">
                  {selectedRequest.services.map((service, index) => (
                    <div key={index} className="service-item">
                      <div className="service-header">
                        <h5>{service.name}</h5>
                        <span className="service-price">₹{service.price}</span>
                      </div>
                      <p className="service-description">{service.description}</p>
                      {service.special_instructions && (
                        <p className="service-instructions">
                          <strong>Instructions:</strong> {service.special_instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Files Section */}
              {selectedRequest.files.length > 0 && (
                <div className="files-section">
                  <h4>Attached Media ({selectedRequest.files.length})</h4>
                  
                  {/* File Type Summary */}
                  <div className="file-summary">
                    <span className="file-count">
                      📷 {selectedRequest.files.filter(f => f.file_type === 'image').length} photos
                    </span>
                    <span className="file-count">
                      🎥 {selectedRequest.files.filter(f => f.file_type === 'video').length} videos
                    </span>
                  </div>

                  {/* Images Grid */}
                  {selectedRequest.files.filter(f => f.file_type === 'image').length > 0 && (
                    <div className="images-section">
                      <h5>Photos</h5>
                      <div className="images-grid">
                        {selectedRequest.files
                          .filter(f => f.file_type === 'image')
                          .map((file, index) => (
                            <div key={file.id} className="image-item">
                              {file.downloadUrl ? (
                                <img 
                                  src={file.downloadUrl} 
                                  alt={`${index + 1}`}
                                  className="request-image"
                                  onClick={() => {
                                    const imageFiles = selectedRequest.files.filter(f => f.file_type === 'image');
                                    const imageIndex = imageFiles.findIndex(f => f.id === file.id);
                                    setSelectedMedia({ 
                                      files: imageFiles, 
                                      currentIndex: imageIndex,
                                      type: 'images'
                                    });
                                    setShowMediaModal(true);
                                  }}
                                />
                              ) : (
                                <div className="image-placeholder">
                                  <span>📷</span>
                                  <p>Loading...</p>
                                </div>
                              )}
                              <div className="image-overlay">
                                <span className="image-number">Photo {index + 1}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Videos Section */}
                  {selectedRequest.files.filter(f => f.file_type === 'video').length > 0 && (
                    <div className="videos-section">
                      <h5>Videos</h5>
                      <div className="videos-grid">
                        {selectedRequest.files
                          .filter(f => f.file_type === 'video')
                          .map((file, index) => (
                            <div key={file.id} className="video-item">
                              <div className="video-preview">
                                {file.downloadUrl ? (
                                  <video 
                                    src={file.downloadUrl}
                                    className="request-video"
                                    controls
                                    preload="metadata"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                ) : (
                                  <div className="video-placeholder">
                                    <span>🎥</span>
                                    <p>Loading...</p>
                                  </div>
                                )}
                                <div className="video-overlay">
                                  <span className="video-number">Video {index + 1}</span>
                                  <button 
                                    className="play-button"
                                    onClick={() => {
                                      const videoFiles = selectedRequest.files.filter(f => f.file_type === 'video');
                                      const videoIndex = videoFiles.findIndex(f => f.id === file.id);
                                      setSelectedMedia({ 
                                        files: videoFiles, 
                                        currentIndex: videoIndex,
                                        type: 'videos'
                                      });
                                      setShowMediaModal(true);
                                    }}
                                  >
                                    ▶️ Fullscreen
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && selectedMedia && (
        <div className="modal-overlay" onClick={() => setShowMediaModal(false)}>
          <div className="modal-content media-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Media Viewer</h3>
              <button className="close-btn" onClick={() => setShowMediaModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="media-viewer">
                {selectedMedia.files[selectedMedia.currentIndex]?.file_type === 'image' ? (
                  selectedMedia.files[selectedMedia.currentIndex]?.downloadUrl ? (
                    <img 
                      src={selectedMedia.files[selectedMedia.currentIndex].downloadUrl}
                      alt={`Media ${selectedMedia.currentIndex + 1}`}
                      className="media-image"
                    />
                  ) : (
                    <div className="media-placeholder">
                      <span>📷</span>
                      <p>Image not available</p>
                    </div>
                  )
                ) : (
                  <div className="video-player">
                    {selectedMedia.files[selectedMedia.currentIndex]?.downloadUrl ? (
                      <>
                        <video 
                          src={selectedMedia.files[selectedMedia.currentIndex].downloadUrl}
                          controls
                          autoPlay
                          className="media-video"
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div className="video-info">
                          <p>Video: {selectedMedia.files[selectedMedia.currentIndex]?.original_name}</p>
                          <a 
                            href={selectedMedia.files[selectedMedia.currentIndex].downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="video-download-link"
                          >
                            Download Video
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="media-placeholder">
                        <span>🎥</span>
                        <p>Video not available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedMedia.files.length > 1 && (
              <div className="media-navigation">
                <button 
                  onClick={() => setSelectedMedia({
                    ...selectedMedia,
                    currentIndex: selectedMedia.currentIndex > 0 ? selectedMedia.currentIndex - 1 : selectedMedia.files.length - 1
                  })}
                    className="nav-btn"
                >
                    ‹ Previous
                </button>
                <span className="media-counter">
                  {selectedMedia.currentIndex + 1} of {selectedMedia.files.length}
                </span>
                <button 
                  onClick={() => setSelectedMedia({
                    ...selectedMedia,
                    currentIndex: selectedMedia.currentIndex < selectedMedia.files.length - 1 ? selectedMedia.currentIndex + 1 : 0
                  })}
                    className="nav-btn"
                >
                    Next ›
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Repair Request</h3>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Are you sure you want to reject this repair request?</p>
              <p><strong>This action cannot be undone.</strong></p>
              
              <div className="form-group">
                <label htmlFor="rejectionNote">Rejection Note (Required):</label>
                <textarea
                  id="rejectionNote"
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={4}
                  required
                  className="rejection-note-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button 
                className="reject-confirm-btn" 
                onClick={confirmAction}
                disabled={!rejectionNote.trim()}
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairManagement;

// Enhanced styles for media display
const styles = `
  /* File Summary */
  .file-summary {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 8px;
  }
  
  .file-count {
    font-size: 14px;
    color: #6c757d;
    font-weight: 500;
  }
  
  /* Images Section */
  .images-section {
    margin-bottom: 30px;
  }
  
  .images-section h5 {
    margin-bottom: 15px;
    color: #495057;
    font-size: 16px;
  }
  
  .images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }
  
  .image-item {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.2s;
    cursor: pointer;
  }
  
  .image-item:hover {
    transform: scale(1.02);
  }
  
  .request-image {
    width: 100%;
    height: 150px;
    object-fit: cover;
    display: block;
  }
  
  .image-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.7));
    padding: 10px;
    color: white;
  }
  
  .image-number {
    font-size: 12px;
    font-weight: 500;
  }
  
  /* Videos Section */
  .videos-section {
    margin-bottom: 30px;
  }
  
  .videos-section h5 {
    margin-bottom: 15px;
    color: #495057;
    font-size: 16px;
  }
  
  .videos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }
  
  .video-item {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .video-preview {
    position: relative;
  }
  
  .request-video {
    width: 100%;
    height: 180px;
    object-fit: cover;
    display: block;
  }
  
  .video-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.8));
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .video-number {
    color: white;
    font-size: 12px;
    font-weight: 500;
  }
  
  .play-button {
    background: rgba(255,255,255,0.9);
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .play-button:hover {
    background: white;
  }
  
  /* Media Modal Enhancements */
  .media-modal {
    max-width: 90vw;
    max-height: 90vh;
  }
  
  .media-viewer {
    text-align: center;
  }
  
  .media-image {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    border-radius: 8px;
  }
  
  .video-player {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }
  
  .media-video {
    max-width: 100%;
    max-height: 60vh;
    border-radius: 8px;
  }
  
  .video-info {
    text-align: center;
  }
  
  .video-info p {
    margin-bottom: 10px;
    color: #6c757d;
  }
  
  .video-download-link {
    display: inline-block;
    margin-top: 10px;
    padding: 8px 16px;
    background-color: #007bff;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-size: 14px;
    transition: background-color 0.3s;
  }
  
  .video-download-link:hover {
    background-color: #0056b3;
    text-decoration: none;
    color: white;
  }
  
  /* Media Navigation */
  .media-navigation {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 8px;
  }
  
  .nav-btn {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .nav-btn:hover {
    background: #0056b3;
  }
  
  .media-counter {
    font-weight: 500;
    color: #495057;
  }
  
  /* Placeholder styles */
  .image-placeholder,
  .video-placeholder,
  .media-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    background-color: #f8f9fa;
    color: #6c757d;
    font-size: 14px;
  }
  
  .image-placeholder span,
  .video-placeholder span,
  .media-placeholder span {
    font-size: 24px;
    margin-bottom: 8px;
  }
  
  .image-placeholder p,
  .video-placeholder p,
  .media-placeholder p {
    margin: 0;
    font-size: 12px;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 