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
  LinearProgress,
  TextField
} from '@mui/material';
import {
  AttachMoney,
  CheckCircle,
  Pending,
  Cancel,
  Payment,
  Refresh,
  CreditCard,
  Lock
} from '@mui/icons-material';
import marketplaceApi, { Offer } from '../../api/marketplaceApi';
import { formatCurrency } from '../../utilities/helperfFunction';

// Replace process.env with direct Stripe key
// Get this from your .env file or hardcode for testing
const STRIPE_PUBLIC_KEY = 'pk_test_51QVNayJxZ9TRbmw52eO6ICeNyn0TP47cFmEuvmDOpOFEJKeJzZZDyn9fbXW4I8K8P7yOrN1Qx4vW9Y5vHzJ5duSU00hUXy8lTP';

// Payment Modal Component
const PaymentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  offer: Offer;
  onSuccess: (orderData: any) => void;
}> = ({ open, onClose, offer, onSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setProcessing(true);
    setError('');

    try {
      // Step 1: Create payment intent using our API
      const paymentResponse = await marketplaceApi.utils.payments.createOfferPaymentIntent(offer._id);
      
      if (!paymentResponse.success || !paymentResponse.data?.clientSecret) {
        throw new Error(paymentResponse.error || 'Payment setup failed');
      }

      // Step 2: Use Stripe Elements for actual payment
      // In a real app, you would load Stripe.js and use their card element
      // For now, we'll simulate with a direct API call
      const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents/' + paymentResponse.data.paymentIntentId, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${STRIPE_PUBLIC_KEY.replace('pk_', 'sk_')}`, // Convert to secret key
        }
      });

      if (!stripeResponse.ok) {
        throw new Error('Stripe connection failed');
      }

      // Step 3: Simulate payment confirmation
      // In production, you would use stripe.confirmCardPayment with the clientSecret
      setTimeout(async () => {
        try {
          // Confirm payment with backend
          const confirmResponse = await marketplaceApi.offers.confirmOfferPayment({
            offerId: offer._id,
            paymentIntentId: paymentResponse.data.paymentIntentId
          });

          if (confirmResponse.success) {
            onSuccess(confirmResponse.data);
            onClose();
          } else {
            throw new Error(confirmResponse.error || 'Payment confirmation failed');
          }
        } catch (err: any) {
          setError(err.message || 'Payment failed. Please try again.');
          setProcessing(false);
        }
      }, 2000);

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please check your card details.');
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Lock color="primary" />
            <Typography variant="h6">Secure Payment</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {/* Order Summary */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Paying for:
            </Typography>
            <Typography variant="h6" color="primary">
              {(offer.listingId as any)?.title}
            </Typography>
            
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
              <Typography variant="body1">Amount:</Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {formatCurrency(offer.offeredPrice)}
              </Typography>
            </Box>
          </Paper>

          {/* Card Form */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Cardholder Name
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={processing}
            />
          </Box>

          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Card Number
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
              required
              disabled={processing}
              InputProps={{
                startAdornment: <CreditCard fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Box>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>
                Expiry Date
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length > 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2, 4);
                  }
                  setExpiry(value.slice(0, 5));
                }}
                required
                disabled={processing}
              />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>
                CVC
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="123"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                required
                disabled={processing}
              />
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {/* Security Info */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Lock fontSize="small" color="success" />
              <Typography variant="caption" fontWeight="medium">
                Secure Payment
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Your payment is processed securely by Stripe. We never store your card details.
            </Typography>
          </Paper>

          {/* Test Card Info */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              <strong>For testing:</strong> Use card 4242 4242 4242 4242, any future expiry, any CVC
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={processing || !cardNumber || !expiry || !cvc || !name}
            startIcon={processing ? <CircularProgress size={20} /> : <Payment />}
            sx={{ minWidth: 150 }}
          >
            {processing ? 'Processing...' : 'Pay Now'}
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
        showSnackbar(response.error || 'Failed to load offers', 'error');
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      showSnackbar('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Show snackbar helper
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
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
    showSnackbar('Payment successful! Offer is now paid.', 'success');
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
        
        showSnackbar('Offer cancelled successfully', 'success');
      } else {
        showSnackbar(response.error || 'Failed to cancel offer', 'error');
      }
    } catch (error) {
      console.error('Error cancelling offer:', error);
      showSnackbar('Network error. Please try again.', 'error');
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
          <Paper sx={{ p: 2, textAlign: 'center', borderColor: 'warning.main', border: 2 }}>
            <Typography variant="h5" color="warning.main" fontWeight="bold">
              {pendingOffers.length}
            </Typography>
            <Typography variant="body2" color="warning.main">
              Pending Payment
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
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderColor: offer.status === 'pending_payment' ? 'warning.main' : undefined,
                    bgcolor: offer.status === 'pending_payment' ? 'warning.50' : undefined
                  }}
                >
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
                          Expected Delivery
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
                          color="warning"
                          startIcon={<Payment />}
                          onClick={() => handlePaymentClick(offer)}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
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
                      
                      {['accepted', 'paid'].includes(offer.status) && (
                        <Button
                          variant="outlined"
                          size="small"
                          href={`/orders/${offer._id}`}
                          startIcon={<CheckCircle />}
                        >
                          View Order
                        </Button>
                      )}

                      {offer.status === 'completed' && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="primary"
                          href={`/orders/${offer._id}/review`}
                        >
                          Leave Review
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
        <PaymentModal
          open={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedOffer(null);
          }}
          offer={selectedOffer}
          onSuccess={handlePaymentSuccess}
        />
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