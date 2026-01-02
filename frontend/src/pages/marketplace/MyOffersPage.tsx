// src/pages/MyOffersPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  AttachMoney,
  CheckCircle,
  Pending,
  Cancel,
  Payment,
  Refresh,
  Error as ErrorIcon
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import marketplaceApi, { Offer } from '../../api/marketplaceApi';
import { formatCurrency } from '../../utilities/helperfFunction';

// Stripe configuration
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_your_key');

// Payment Modal Component
const PaymentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  offer: Offer;
  onSuccess: (orderData: any) => void;
}> = ({ open, onClose, offer, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    try {
      // Step 1: Make offer to get payment intent
      const offerResponse = await marketplaceApi.offers.makeOffer({
        listingId: (offer.listingId as any)._id,
        amount: offer.offeredPrice,
        message: offer.message || 'Payment for offer'
      });

      if (!offerResponse.success || !offerResponse.data?.clientSecret) {
        throw new Error(offerResponse.error || 'Payment failed');
      }

      // Step 2: Confirm card payment with Stripe
      const stripeResult = await stripe.confirmCardPayment(offerResponse.data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (stripeResult.error) {
        throw new Error(stripeResult.error.message || 'Payment failed');
      }

      if (stripeResult.paymentIntent?.status === 'succeeded') {
        // Step 3: Confirm payment with backend
        const confirmResponse = await marketplaceApi.offers.confirmOfferPayment({
          offerId: offer._id,
          paymentIntentId: stripeResult.paymentIntent.id
        });

        if (confirmResponse.success) {
          onSuccess(confirmResponse.data);
          onClose();
        } else {
          throw new Error(confirmResponse.error || 'Payment confirmation failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AttachMoney />
            <Typography variant="h6">Complete Payment</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box mb={3}>
            <Typography variant="body1" color="text.secondary">
              Pay for offer on
            </Typography>
            <Typography variant="h6" color="primary">
              {(offer.listingId as any)?.title}
            </Typography>
          </Box>

          <Box mb={3}>
            <Typography variant="body2" color="text.secondary">
              Amount to pay
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="primary">
              {formatCurrency(offer.offeredPrice)}
            </Typography>
          </Box>

          <Box mb={3}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Card Details
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
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

          <Typography variant="caption" color="text.secondary">
            Your payment is secured with Stripe. Card details are never stored on our servers.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={processing || !stripe}
            startIcon={processing ? <CircularProgress size={20} /> : <Payment />}
          >
            {processing ? 'Processing...' : `Pay ${formatCurrency(offer.offeredPrice)}`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// Main Component
const MyOffersPage: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Fetch offers function
  const fetchOffers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const response = await marketplaceApi.offers.getMyOffers();
      
      if (response.success && response.data?.offers) {
        setOffers(response.data.offers);
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
  };

  // Initial load
  useEffect(() => {
    fetchOffers();
  }, []);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers(false);
  };

  // Handle payment button click
  const handlePaymentClick = (offer: Offer) => {
    setSelectedOffer(offer);
    setPaymentModalOpen(true);
  };

  // Handle payment success
  const handlePaymentSuccess = (orderData: any) => {
    // Refresh offers list
    fetchOffers(false);
    
    // Show success message
    setSnackbar({
      open: true,
      message: 'Payment successful! Offer is now paid.',
      severity: 'success'
    });
  };

  // Handle cancel offer
  const handleCancelOffer = async (offerId: string) => {
    if (!window.confirm('Are you sure you want to cancel this offer?')) return;
    
    try {
      const response = await marketplaceApi.offers.cancelOffer(offerId);
      
      if (response.success) {
        // Update local state
        setOffers(prev => prev.map(offer => 
          offer._id === offerId 
            ? { ...offer, status: 'cancelled', cancelledAt: new Date().toISOString() }
            : offer
        ));
        
        setSnackbar({
          open: true,
          message: 'Offer cancelled successfully',
          severity: 'success'
        });
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
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get status chip
  const getStatusChip = (status: string) => {
    switch (status) {
      case 'pending':
        return <Chip icon={<Pending />} label="Pending" color="warning" size="small" />;
      case 'pending_payment':
        return <Chip icon={<Pending />} label="Payment Required" color="info" size="small" />;
      case 'accepted':
        return <Chip icon={<CheckCircle />} label="Accepted" color="success" size="small" />;
      case 'paid':
        return <Chip icon={<AttachMoney />} label="Paid" color="success" size="small" />;
      case 'completed':
        return <Chip icon={<CheckCircle />} label="Completed" color="primary" size="small" />;
      case 'rejected':
        return <Chip icon={<Cancel />} label="Rejected" color="error" size="small" />;
      case 'cancelled':
        return <Chip icon={<Cancel />} label="Cancelled" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  // Count offers by status
  const pendingOffers = offers.filter(o => ['pending', 'pending_payment'].includes(o.status));
  const activeOffers = offers.filter(o => ['accepted', 'paid'].includes(o.status));
  const completedOffers = offers.filter(o => o.status === 'completed');
  const cancelledOffers = offers.filter(o => ['rejected', 'cancelled'].includes(o.status));

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            My Offers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your offers and complete payments
          </Typography>
        </Box>
        <Button
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outlined"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" color="primary" fontWeight="bold">
              {offers.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Offers
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" color="warning.main" fontWeight="bold">
              {pendingOffers.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" color="success.main" fontWeight="bold">
              {activeOffers.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" color="error.main" fontWeight="bold">
              {cancelledOffers.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cancelled
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Offers List */}
      {offers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AttachMoney sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No offers yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start by making offers on listings in the marketplace.
          </Typography>
          <Button variant="contained" href="/marketplace">
            Browse Marketplace
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {offers.map((offer) => {
            const listing = offer.listingId as any;
            
            return (
              <Grid item xs={12} key={offer._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                          {listing?.title || 'Listing'}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          {getStatusChip(offer.status)}
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(offer.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {formatCurrency(offer.offeredPrice)}
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Seller
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar
                            sx={{ width: 24, height: 24 }}
                            src={offer.sellerId?.avatar}
                          >
                            {offer.sellerId?.username?.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {offer.sellerId?.username || 'Seller'}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Delivery
                        </Typography>
                        <Typography variant="body2">
                          {offer.expectedDelivery 
                            ? formatDate(offer.expectedDelivery)
                            : 'Not specified'}
                        </Typography>
                      </Grid>
                    </Grid>

                    {offer.message && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          {offer.message}
                        </Typography>
                      </Alert>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Action Buttons */}
                    <Box display="flex" gap={2} mt={2}>
                      {offer.status === 'pending_payment' && (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<Payment />}
                          onClick={() => handlePaymentClick(offer)}
                          size="small"
                        >
                          Complete Payment
                        </Button>
                      )}
                      
                      {offer.status === 'pending' && (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => handleCancelOffer(offer._id)}
                          size="small"
                        >
                          Cancel Offer
                        </Button>
                      )}
                      
                      {['accepted', 'paid', 'completed'].includes(offer.status) && (
                        <Button
                          variant="outlined"
                          size="small"
                          href={`/orders/${offer._id}`}
                        >
                          View Details
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Payment Modal */}
      {selectedOffer && (
        <Elements stripe={stripePromise}>
          <PaymentModal
            open={paymentModalOpen}
            onClose={() => {
              setPaymentModalOpen(false);
              setSelectedOffer(null);
            }}
            offer={selectedOffer}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      )}

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

export default MyOffersPage;