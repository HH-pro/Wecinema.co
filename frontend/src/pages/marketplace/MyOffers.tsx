// src/pages/BuyerOffersPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  Snackbar,
  Tab,
  Tabs,
  Paper,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress
} from '@mui/material';
import {
  AttachMoney,
  CheckCircle,
  Pending,
  HourglassEmpty,
  Cancel,
  Error,
  Payment,
  Visibility,
  Chat,
  Receipt,
  TrendingUp,
  LocalOffer,
  Update,
  Delete,
  Refresh
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import marketplaceApi, { Offer, ApiResponse } from '../../api/marketplaceApi';
import { formatCurrency } from '../../utilities/helperfFunction';

// Stripe configuration
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_your_public_key');

// Payment Form Component
const PaymentForm: React.FC<{
  offerId: string;
  amount: number;
  onPaymentComplete: (success: boolean, data?: any) => void;
  onClose: () => void;
}> = ({ offerId, amount, onPaymentComplete, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setError('Stripe not initialized');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Get payment intent from offer
      const paymentResult = await marketplaceApi.offers.makeOffer({
        listingId: '',
        amount,
        message: 'Payment for offer'
      });

      if (!paymentResult.success || !paymentResult.data?.clientSecret) {
        throw new Error(paymentResult.error || 'Failed to create payment intent');
      }

      // Confirm payment with Stripe
      const result = await stripe.confirmCardPayment(paymentResult.data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (result.error) {
        setError(result.error.message || 'Payment failed');
        onPaymentComplete(false, { error: result.error.message });
      } else {
        if (result.paymentIntent?.status === 'succeeded') {
          // Confirm payment with our backend
          const confirmResult = await marketplaceApi.offers.confirmOfferPayment({
            offerId,
            paymentIntentId: result.paymentIntent.id
          });

          if (confirmResult.success) {
            onPaymentComplete(true, confirmResult.data);
          } else {
            setError(confirmResult.error || 'Payment confirmation failed');
            onPaymentComplete(false, { error: confirmResult.error });
          }
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment processing failed');
      onPaymentComplete(false, { error: err.message });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Payment />
          <Typography variant="h6">Complete Payment</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Typography variant="subtitle1" color="text.secondary">
            Amount to pay
          </Typography>
          <Typography variant="h4" color="primary" fontWeight="bold">
            {formatCurrency(amount)}
          </Typography>
        </Box>

        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Enter your card details
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </Paper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            By completing this payment, you agree to our Terms of Service. 
            The payment is protected by Stripe's secure payment processing.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={processing}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!stripe || processing}
          startIcon={processing ? <CircularProgress size={20} /> : <Payment />}
        >
          {processing ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
        </Button>
      </DialogActions>
    </form>
  );
};

// Main Component
const BuyerOffersPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    paid: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    expired: 0
  });
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  const [refreshing, setRefreshing] = useState(false);

  // Fetch offers
  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.offers.getMyOffers();
      
      if (response.success && response.data?.offers) {
        const offersData = response.data.offers;
        setOffers(offersData);
        
        // Calculate statistics
        const statsData = {
          total: offersData.length,
          pending: offersData.filter(o => o.status === 'pending').length,
          accepted: offersData.filter(o => o.status === 'accepted').length,
          paid: offersData.filter(o => o.status === 'paid').length,
          completed: offersData.filter(o => o.status === 'completed').length,
          rejected: offersData.filter(o => o.status === 'rejected').length,
          cancelled: offersData.filter(o => o.status === 'cancelled').length,
          expired: offersData.filter(o => o.status === 'expired').length
        };
        setStats(statsData);
      } else {
        setSnackbar({
          open: true,
          message: response.error || 'Failed to load offers',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      setSnackbar({
        open: true,
        message: 'Network error. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Filter offers based on active tab
  useEffect(() => {
    let filtered = [...offers];
    
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter(o => o.status === 'pending' || o.status === 'pending_payment');
        break;
      case 'active':
        filtered = filtered.filter(o => ['accepted', 'paid'].includes(o.status));
        break;
      case 'completed':
        filtered = filtered.filter(o => ['completed', 'delivered'].includes(o.status));
        break;
      case 'cancelled':
        filtered = filtered.filter(o => ['cancelled', 'rejected', 'expired'].includes(o.status));
        break;
      case 'payment':
        filtered = filtered.filter(o => o.status === 'pending_payment');
        break;
    }
    
    setFilteredOffers(filtered);
  }, [offers, activeTab]);

  // Initial load
  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  // Handle offer payment
  const handlePaymentClick = (offer: Offer) => {
    setSelectedOffer(offer);
    setPaymentDialogOpen(true);
  };

  // Handle payment completion
  const handlePaymentComplete = (success: boolean, data?: any) => {
    setPaymentDialogOpen(false);
    
    if (success) {
      setSnackbar({
        open: true,
        message: 'Payment completed successfully!',
        severity: 'success'
      });
      // Refresh offers
      fetchOffers();
      // Navigate to order page if order created
      if (data?.orderId) {
        navigate(`/orders/${data.orderId}`);
      }
    } else {
      setSnackbar({
        open: true,
        message: data?.error || 'Payment failed',
        severity: 'error'
      });
    }
  };

  // Handle offer cancellation
  const handleCancelClick = (offer: Offer) => {
    setSelectedOffer(offer);
    setCancelDialogOpen(true);
  };

  // Confirm cancellation
  const handleConfirmCancel = async () => {
    if (!selectedOffer) return;
    
    try {
      const response = await marketplaceApi.offers.cancelOffer(selectedOffer._id);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Offer cancelled successfully',
          severity: 'success'
        });
        // Update local state
        setOffers(prev => prev.map(o => 
          o._id === selectedOffer._id 
            ? { ...o, status: 'cancelled', cancelledAt: new Date().toISOString() }
            : o
        ));
      } else {
        setSnackbar({
          open: true,
          message: response.error || 'Failed to cancel offer',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error cancelling offer:', error);
      setSnackbar({
        open: true,
        message: 'Network error. Please try again.',
        severity: 'error'
      });
    } finally {
      setCancelDialogOpen(false);
      setSelectedOffer(null);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status chip properties
  const getStatusChipProps = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'warning', icon: <Pending />, label: 'Pending' };
      case 'pending_payment':
        return { color: 'info', icon: <HourglassEmpty />, label: 'Payment Required' };
      case 'accepted':
        return { color: 'success', icon: <CheckCircle />, label: 'Accepted' };
      case 'paid':
        return { color: 'success', icon: <AttachMoney />, label: 'Paid' };
      case 'completed':
        return { color: 'primary', icon: <CheckCircle />, label: 'Completed' };
      case 'rejected':
        return { color: 'error', icon: <Cancel />, label: 'Rejected' };
      case 'cancelled':
        return { color: 'error', icon: <Cancel />, label: 'Cancelled' };
      case 'expired':
        return { color: 'default', icon: <Error />, label: 'Expired' };
      default:
        return { color: 'default', icon: <Pending />, label: status };
    }
  };

  // Get action buttons based on status
  const getActionButtons = (offer: Offer) => {
    const buttons = [];
    
    switch (offer.status) {
      case 'pending_payment':
        buttons.push(
          <Button
            key="pay"
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Payment />}
            onClick={() => handlePaymentClick(offer)}
          >
            Pay Now
          </Button>
        );
        break;
        
      case 'pending':
        buttons.push(
          <Button
            key="cancel"
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Cancel />}
            onClick={() => handleCancelClick(offer)}
          >
            Cancel
          </Button>
        );
        break;
        
      case 'accepted':
      case 'paid':
        buttons.push(
          <Button
            key="view"
            variant="outlined"
            size="small"
            startIcon={<Visibility />}
            onClick={() => {
              if (offer._id) {
                navigate(`/offers/${offer._id}`);
              }
            }}
          >
            View Details
          </Button>
        );
        break;
        
      case 'completed':
        buttons.push(
          <Button
            key="review"
            variant="outlined"
            size="small"
            startIcon={<Chat />}
            onClick={() => {
              if (offer._id) {
                navigate(`/orders/${offer._id}/review`);
              }
            }}
          >
            Leave Review
          </Button>
        );
        break;
    }
    
    return buttons;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            <LocalOffer sx={{ verticalAlign: 'middle', mr: 1 }} />
            My Offers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your offers, complete payments, and track status
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary" fontWeight="bold">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Offers
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" fontWeight="bold">
              {stats.pending}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending Payment
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" fontWeight="bold">
              {stats.accepted + stats.paid}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Offers
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="error.main" fontWeight="bold">
              {stats.cancelled + stats.rejected}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cancelled/Rejected
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={`All (${stats.total})`} 
            value="all" 
            icon={<LocalOffer fontSize="small" />}
          />
          <Tab 
            label={`Pending Payment (${stats.pending})`} 
            value="payment"
            icon={<HourglassEmpty fontSize="small" />}
          />
          <Tab 
            label={`Active (${stats.accepted + stats.paid})`} 
            value="active"
            icon={<CheckCircle fontSize="small" />}
          />
          <Tab 
            label={`Completed (${stats.completed})`} 
            value="completed"
            icon={<CheckCircle fontSize="small" />}
          />
          <Tab 
            label={`Cancelled (${stats.cancelled + stats.rejected + stats.expired})`} 
            value="cancelled"
            icon={<Cancel fontSize="small" />}
          />
        </Tabs>
      </Paper>

      {/* Offers List */}
      {filteredOffers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LocalOffer sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No offers found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeTab === 'all' 
              ? "You haven't made any offers yet."
              : `You don't have any ${activeTab} offers.`}
          </Typography>
          {activeTab === 'payment' && (
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => navigate('/marketplace')}
            >
              Browse Listings
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredOffers.map((offer) => {
            const statusProps = getStatusChipProps(offer.status);
            const listing = offer.listingId as any;
            
            return (
              <Grid item xs={12} key={offer._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {listing?.title || 'Listing'}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Chip
                            icon={statusProps.icon}
                            label={statusProps.label}
                            color={statusProps.color as any}
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            Made on {formatDate(offer.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {formatCurrency(offer.offeredPrice)}
                      </Typography>
                    </Box>

                    {offer.message && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          {offer.message}
                        </Typography>
                      </Alert>
                    )}

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Seller
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar 
                            src={offer.sellerId?.avatar}
                            sx={{ width: 24, height: 24 }}
                          >
                            {offer.sellerId?.username?.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {offer.sellerId?.username || 'Seller'}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Expected Delivery
                        </Typography>
                        <Typography variant="body2">
                          {offer.expectedDelivery 
                            ? formatDate(offer.expectedDelivery)
                            : 'Not specified'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Requirements
                        </Typography>
                        <Typography variant="body2">
                          {offer.requirements || 'No specific requirements'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Last Updated
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(offer.updatedAt)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  
                  <Divider />
                  
                  <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                    <Box>
                      {getActionButtons(offer)}
                    </Box>
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (offer._id) {
                            navigate(`/offers/${offer._id}`);
                          }
                        }}
                        title="View Details"
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      {offer.status === 'accepted' && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            // Navigate to chat
                            marketplaceApi.offers.getChatLink(offer._id)
                              .then(response => {
                                if (response.success && response.data?.chatLink) {
                                  window.open(response.data.chatLink, '_blank');
                                }
                              });
                          }}
                          title="Chat with Seller"
                        >
                          <Chat fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Payment Dialog */}
      {selectedOffer && (
        <Dialog 
          open={paymentDialogOpen} 
          onClose={() => setPaymentDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <Elements stripe={stripePromise}>
            <PaymentForm
              offerId={selectedOffer._id}
              amount={selectedOffer.offeredPrice}
              onPaymentComplete={handlePaymentComplete}
              onClose={() => setPaymentDialogOpen(false)}
            />
          </Elements>
        </Dialog>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Offer</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this offer for{' '}
            <strong>{formatCurrency(selectedOffer?.offeredPrice || 0)}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. The seller will be notified.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            Keep Offer
          </Button>
          <Button
            onClick={handleConfirmCancel}
            color="error"
            variant="contained"
          >
            Cancel Offer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BuyerOffersPage;