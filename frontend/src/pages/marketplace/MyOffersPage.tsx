// src/pages/marketplace/OffersPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Tab,
  Tabs,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
  Chat as ChatIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Store as StoreIcon,
  ShoppingCart as CartIcon,
  TrendingUp as TrendingIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ArrowForward as ArrowIcon,
  Refresh as RefreshIcon,
  AddOffer as AddOfferIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import marketplaceApi from '../../api/marketplaceApi';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Stripe configuration
const stripePromise = loadStripe('your_publishable_key_here');

// ============================================
// ✅ OFFER STATUS COMPONENT
// ============================================

const OfferStatusChip = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending_payment':
        return { color: 'warning', label: 'Payment Required', icon: <PaymentIcon fontSize="small" /> };
      case 'pending':
        return { color: 'info', label: 'Pending Review', icon: <TimeIcon fontSize="small" /> };
      case 'paid':
        return { color: 'success', label: 'Paid', icon: <CheckIcon fontSize="small" /> };
      case 'accepted':
        return { color: 'success', label: 'Accepted', icon: <CheckIcon fontSize="small" /> };
      case 'rejected':
        return { color: 'error', label: 'Rejected', icon: <CancelIcon fontSize="small" /> };
      case 'cancelled':
        return { color: 'error', label: 'Cancelled', icon: <CancelIcon fontSize="small" /> };
      case 'expired':
        return { color: 'default', label: 'Expired', icon: <TimeIcon fontSize="small" /> };
      default:
        return { color: 'default', label: status, icon: null };
    }
  };

  const config = getStatusConfig(status);
  return (
    <Chip
      size="small"
      label={config.label}
      color={config.color}
      icon={config.icon}
      variant="outlined"
      sx={{ ml: 1 }}
    />
  );
};

// ============================================
// ✅ PAYMENT MODAL COMPONENT
// ============================================

const PaymentModal = ({ open, onClose, clientSecret, offerId, amount, onPaymentSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: 'Customer Name', // Get from user profile
            email: 'customer@example.com' // Get from user profile
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
        setSuccess(true);
        
        // Call parent callback
        if (onPaymentSuccess) {
          onPaymentSuccess(offerId, paymentIntent.id);
        }
        
        // Close after delay
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      setError('Payment failed. Please try again.');
      console.error('Payment error:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <PaymentIcon sx={{ mr: 1 }} />
          Complete Payment
        </Box>
      </DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ my: 2 }}>
            <AlertTitle>Payment Successful!</AlertTitle>
            Your payment has been processed successfully. Redirecting...
          </Alert>
        ) : (
          <>
            <Alert severity="info" sx={{ my: 2 }}>
              <AlertTitle>Payment Required</AlertTitle>
              Please complete payment of ${amount} to submit your offer.
            </Alert>

            {error && (
              <Alert severity="error" sx={{ my: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ my: 3 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
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
                      invalid: {
                        color: '#9e2146',
                      },
                    },
                  }}
                />
              </Paper>
            </Box>

            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              <InfoIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
              Your card will be charged immediately. Offer will be submitted upon successful payment.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {!success && (
          <>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              disabled={!stripe || processing}
              startIcon={processing ? <CircularProgress size={20} /> : <PaymentIcon />}
            >
              {processing ? 'Processing...' : `Pay $${amount}`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ============================================
// ✅ OFFER DETAILS MODAL
// ============================================

const OfferDetailsModal = ({ open, onClose, offer, userRole }) => {
  if (!offer) return null;

  const canCancel = offer.status === 'pending' || offer.status === 'pending_payment';
  const canPay = offer.status === 'pending_payment' && userRole === 'buyer';
  const canAccept = offer.status === 'paid' && userRole === 'seller';
  const canReject = (offer.status === 'pending' || offer.status === 'paid') && userRole === 'seller';

  const handleAction = async (action) => {
    try {
      switch (action) {
        case 'cancel':
          await marketplaceApi.offers.cancelOffer(offer._id);
          break;
        case 'accept':
          await marketplaceApi.offers.acceptOffer(offer._id);
          break;
        case 'reject':
          await marketplaceApi.offers.rejectOffer(offer._id, 'Seller rejected the offer');
          break;
      }
      onClose();
      window.location.reload();
    } catch (error) {
      console.error(`Error ${action}ing offer:`, error);
      alert(`Failed to ${action} offer`);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <ReceiptIcon sx={{ mr: 1 }} />
            Offer Details
          </Box>
          <OfferStatusChip status={offer.status} />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Listing Details
              </Typography>
              <Typography variant="h6" gutterBottom>
                {offer.listingId?.title || 'N/A'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Price: ${offer.listingId?.price || 0}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Financial Details
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Offer Amount" />
                  <Typography variant="body1" fontWeight="bold">
                    ${offer.amount || offer.offeredPrice}
                  </Typography>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="Created At" />
                  <Typography variant="body2">
                    {format(new Date(offer.createdAt), 'PPpp')}
                  </Typography>
                </ListItem>
                {offer.paidAt && (
                  <ListItem>
                    <ListItemText primary="Paid At" />
                    <Typography variant="body2">
                      {format(new Date(offer.paidAt), 'PPpp')}
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                {userRole === 'buyer' ? 'Seller Info' : 'Buyer Info'}
              </Typography>
              <Box display="flex" alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    mr: 2
                  }}
                >
                  {userRole === 'buyer' ? 'S' : 'B'}
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {userRole === 'buyer' 
                      ? offer.listingId?.sellerId?.username || 'Seller'
                      : offer.buyerId?.username || 'Buyer'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {userRole === 'buyer'
                      ? offer.listingId?.sellerId?.email || ''
                      : offer.buyerId?.email || ''}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {offer.message && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Message
                </Typography>
                <Typography variant="body2">{offer.message}</Typography>
              </Paper>
            )}

            {offer.requirements && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Requirements
                </Typography>
                <Typography variant="body2">{offer.requirements}</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        
        {userRole === 'buyer' && canCancel && (
          <Button
            onClick={() => handleAction('cancel')}
            color="error"
            startIcon={<CancelIcon />}
          >
            Cancel Offer
          </Button>
        )}
        
        {userRole === 'seller' && canAccept && (
          <Button
            onClick={() => handleAction('accept')}
            color="success"
            variant="contained"
            startIcon={<CheckIcon />}
          >
            Accept Offer
          </Button>
        )}
        
        {userRole === 'seller' && canReject && (
          <Button
            onClick={() => handleAction('reject')}
            color="error"
            variant="outlined"
            startIcon={<CancelIcon />}
          >
            Reject Offer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ============================================
// ✅ PENDING PAYMENT CARD COMPONENT
// ============================================

const PendingPaymentCard = ({ offer, onCompletePayment, onCancelOffer }) => {
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCompletePayment = async () => {
    try {
      setLoading(true);
      
      // Get payment status first
      const statusResponse = await marketplaceApi.offers.getPaymentStatus(offer._id);
      
      if (statusResponse.success) {
        const { canContinuePayment, stripeStatus } = statusResponse.data;
        
        if (canContinuePayment) {
          // Get payment intent details
          const paymentResponse = await marketplaceApi.offers.makeOffer({
            listingId: offer.listingId._id,
            amount: offer.amount,
            message: offer.message,
            requirements: offer.requirements
          });
          
          if (paymentResponse.success) {
            setShowPayment(true);
          }
        } else {
          alert('Cannot continue payment. Please check offer status.');
        }
      }
    } catch (error) {
      console.error('Error completing payment:', error);
      alert('Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (offerId, paymentIntentId) => {
    try {
      // Confirm offer payment
      await marketplaceApi.offers.confirmOfferPayment({
        offerId,
        paymentIntentId
      });
      
      alert('Payment confirmed successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment');
    }
  };

  return (
    <>
      <Card variant="outlined" sx={{ borderColor: 'warning.main' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                {offer.listingId?.title || 'Unknown Listing'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Offer Amount: <strong>${offer.amount}</strong>
              </Typography>
            </Box>
            <Badge color="warning" badgeContent="!" overlap="circular">
              <WarningIcon color="warning" />
            </Badge>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Payment Required</AlertTitle>
            Please complete payment to submit your offer.
            {offer.expiresAt && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Expires: {format(new Date(offer.expiresAt), 'PPpp')}
              </Typography>
            )}
          </Alert>

          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <Typography variant="caption" color="textSecondary">
              Created: {format(new Date(offer.createdAt), 'PP')}
            </Typography>
            <Box>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => onCancelOffer(offer._id)}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
                onClick={handleCompletePayment}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Complete Payment'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {showPayment && (
        <Elements stripe={stripePromise}>
          <PaymentModal
            open={showPayment}
            onClose={() => setShowPayment(false)}
            clientSecret={offer.paymentIntentId}
            offerId={offer._id}
            amount={offer.amount}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </Elements>
      )}
    </>
  );
};

// ============================================
// ✅ OFFER CARD COMPONENT
// ============================================

const OfferCard = ({ offer, type = 'received', onViewDetails, onCancelOffer }) => {
  const isPendingPayment = offer.status === 'pending_payment';
  
  if (isPendingPayment && type === 'made') {
    return (
      <PendingPaymentCard 
        offer={offer} 
        onCompletePayment={() => {}} 
        onCancelOffer={onCancelOffer}
      />
    );
  }

  const getActionButtons = () => {
    if (type === 'made') {
      // Buyer's view
      return (
        <>
          {offer.status === 'pending' && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => onCancelOffer(offer._id)}
            >
              Cancel Offer
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<ViewIcon />}
            onClick={() => onViewDetails(offer)}
          >
            View Details
          </Button>
        </>
      );
    } else {
      // Seller's view
      return (
        <>
          {offer.status === 'paid' && (
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => onViewDetails(offer)}
              sx={{ mr: 1 }}
            >
              Accept
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<ViewIcon />}
            onClick={() => onViewDetails(offer)}
          >
            View
          </Button>
        </>
      );
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" gutterBottom>
              {offer.listingId?.title || 'Unknown Listing'}
            </Typography>
            <Box display="flex" alignItems="center" mb={1}>
              <MoneyIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="body1" fontWeight="medium">
                ${offer.amount || offer.offeredPrice}
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" paragraph>
              {type === 'made' ? 'To: ' : 'From: '}
              <strong>
                {type === 'made' 
                  ? offer.listingId?.sellerId?.username || 'Seller'
                  : offer.buyerId?.username || 'Buyer'}
              </strong>
            </Typography>
          </Box>
          <OfferStatusChip status={offer.status} />
        </Box>

        {offer.message && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            "{offer.message.substring(0, 100)}..."
          </Typography>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <Typography variant="caption" color="textSecondary">
            {format(new Date(offer.createdAt), 'PP')}
          </Typography>
          <Box>
            {getActionButtons()}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ============================================
// ✅ MAIN OFFERS PAGE COMPONENT
// ============================================

const OffersPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [offers, setOffers] = useState([]);
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ made: 0, received: 0 });
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Fetch offers data
  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch offers made
      const madeResponse = await marketplaceApi.offers.getMyOffers();
      if (madeResponse.success) {
        setOffers(madeResponse.data?.offers || []);
        setStats(prev => ({ ...prev, made: madeResponse.data?.count || 0 }));
      }

      // Fetch offers received
      const receivedResponse = await marketplaceApi.offers.getReceivedOffers();
      if (receivedResponse.success) {
        setReceivedOffers(receivedResponse.data?.offers || []);
        setStats(prev => ({ ...prev, received: receivedResponse.data?.count || 0 }));
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      setError('Failed to load offers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle view offer details
  const handleViewDetails = (offer) => {
    setSelectedOffer(offer);
    setShowDetails(true);
  };

  // Handle cancel offer
  const handleCancelOffer = async (offerId) => {
    setCancelDialog({ offerId, open: true });
  };

  // Confirm cancel offer
  const confirmCancelOffer = async () => {
    if (!cancelDialog) return;

    try {
      setProcessing(true);
      const response = await marketplaceApi.offers.cancelOffer(cancelDialog.offerId);
      
      if (response.success) {
        alert('Offer cancelled successfully');
        fetchOffers(); // Refresh list
      } else {
        alert(response.error || 'Failed to cancel offer');
      }
    } catch (error) {
      console.error('Error cancelling offer:', error);
      alert('Failed to cancel offer');
    } finally {
      setProcessing(false);
      setCancelDialog(null);
    }
  };

  // Handle cancel temporary offer
  const handleCancelTemporaryOffer = async (offerId) => {
    try {
      setProcessing(true);
      const response = await marketplaceApi.offers.cancelTemporaryOffer(offerId);
      
      if (response.success) {
        alert('Temporary offer cancelled');
        fetchOffers(); // Refresh list
      } else {
        alert(response.error || 'Failed to cancel offer');
      }
    } catch (error) {
      console.error('Error cancelling temporary offer:', error);
      alert('Failed to cancel temporary offer');
    } finally {
      setProcessing(false);
    }
  };

  // Filter offers by status
  const filterOffersByStatus = (offersList, status) => {
    return offersList.filter(offer => offer.status === status);
  };

  // Calculate statistics
  const calculateStats = (offersList) => {
    const pendingPayment = filterOffersByStatus(offersList, 'pending_payment').length;
    const pending = filterOffersByStatus(offersList, 'pending').length;
    const paid = filterOffersByStatus(offersList, 'paid').length;
    const accepted = filterOffersByStatus(offersList, 'accepted').length;
    const rejected = filterOffersByStatus(offersList, 'rejected').length;
    const cancelled = filterOffersByStatus(offersList, 'cancelled').length;

    return { pendingPayment, pending, paid, accepted, rejected, cancelled };
  };

  const madeStats = calculateStats(offers);
  const receivedStats = calculateStats(receivedOffers);

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
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Manage Offers
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Track and manage all your offers and negotiations in one place
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
              <CartIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {stats.made}
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              Offers Made
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
              <StoreIcon color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {stats.received}
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              Offers Received
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
              <PaymentIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {madeStats.pendingPayment}
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              Pending Payments
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign:"center" }}>
            <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
              <TrendingIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {receivedStats.paid}
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              Paid Offers
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button
            size="small"
            color="inherit"
            onClick={fetchOffers}
            sx={{ ml: 2 }}
            startIcon={<RefreshIcon />}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Tabs Section */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={
              <Box display="flex" alignItems="center">
                <CartIcon sx={{ mr: 1 }} />
                Offers Made ({stats.made})
                {madeStats.pendingPayment > 0 && (
                  <Badge
                    badgeContent={madeStats.pendingPayment}
                    color="error"
                    sx={{ ml: 1 }}
                  >
                    <span />
                  </Badge>
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box display="flex" alignItems="center">
                <StoreIcon sx={{ mr: 1 }} />
                Offers Received ({stats.received})
                {receivedStats.paid > 0 && (
                  <Badge
                    badgeContent={receivedStats.paid}
                    color="success"
                    sx={{ ml: 1 }}
                  >
                    <span />
                  </Badge>
                )}
              </Box>
            }
          />
        </Tabs>

        {/* Tab Content */}
        <Box p={3}>
          {/* Offers Made Tab */}
          {activeTab === 0 && (
            <>
              {/* Pending Payments Section */}
              {madeStats.pendingPayment > 0 && (
                <Box mb={4}>
                  <Typography variant="h6" gutterBottom color="warning.main">
                    <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Action Required: Complete Payment ({madeStats.pendingPayment})
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    You have {madeStats.pendingPayment} offer(s) that need payment completion.
                    These offers will expire if not paid within 30 minutes.
                  </Alert>
                  <Grid container spacing={2}>
                    {filterOffersByStatus(offers, 'pending_payment').map((offer) => (
                      <Grid item xs={12} key={offer._id}>
                        <PendingPaymentCard
                          offer={offer}
                          onCompletePayment={() => {}}
                          onCancelOffer={handleCancelTemporaryOffer}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  <Divider sx={{ my: 3 }} />
                </Box>
              )}

              {/* All Offers Made */}
              {offers.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <AddOfferIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Offers Made Yet
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Start making offers on listings to see them here.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/marketplace')}
                    startIcon={<ArrowIcon />}
                  >
                    Browse Listings
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {/* Active Offers */}
                  {offers.filter(o => 
                    ['pending', 'pending_payment', 'paid'].includes(o.status)
                  ).length > 0 && (
                    <>
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                          Active Offers
                        </Typography>
                      </Grid>
                      {offers.filter(o => 
                        ['pending', 'pending_payment', 'paid'].includes(o.status)
                      ).map((offer) => (
                        <Grid item xs={12} md={6} key={offer._id}>
                          <OfferCard
                            offer={offer}
                            type="made"
                            onViewDetails={handleViewDetails}
                            onCancelOffer={handleCancelOffer}
                          />
                        </Grid>
                      ))}
                    </>
                  )}

                  {/* Past Offers */}
                  {offers.filter(o => 
                    ['accepted', 'rejected', 'cancelled', 'expired'].includes(o.status)
                  ).length > 0 && (
                    <>
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 3 }}>
                          Past Offers
                        </Typography>
                      </Grid>
                      {offers.filter(o => 
                        ['accepted', 'rejected', 'cancelled', 'expired'].includes(o.status)
                      ).map((offer) => (
                        <Grid item xs={12} md={6} key={offer._id}>
                          <OfferCard
                            offer={offer}
                            type="made"
                            onViewDetails={handleViewDetails}
                          />
                        </Grid>
                      ))}
                    </>
                  )}
                </Grid>
              )}
            </>
          )}

          {/* Offers Received Tab */}
          {activeTab === 1 && (
            <>
              {receivedOffers.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <StoreIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Offers Received Yet
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    When buyers make offers on your listings, they will appear here.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/marketplace/my-listings')}
                    startIcon={<ArrowIcon />}
                  >
                    Manage Listings
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {/* Paid Offers (Need Action) */}
                  {receivedStats.paid > 0 && (
                    <>
                      <Grid item xs={12}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <AlertTitle>Action Required</AlertTitle>
                          You have {receivedStats.paid} paid offer(s) waiting for your acceptance.
                        </Alert>
                      </Grid>
                      {filterOffersByStatus(receivedOffers, 'paid').map((offer) => (
                        <Grid item xs={12} md={6} key={offer._id}>
                          <OfferCard
                            offer={offer}
                            type="received"
                            onViewDetails={handleViewDetails}
                          />
                        </Grid>
                      ))}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                      </Grid>
                    </>
                  )}

                  {/* All Received Offers */}
                  {receivedOffers.map((offer) => (
                    offer.status !== 'paid' && (
                      <Grid item xs={12} md={6} key={offer._id}>
                        <OfferCard
                          offer={offer}
                          type="received"
                          onViewDetails={handleViewDetails}
                        />
                      </Grid>
                    )
                  ))}
                </Grid>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="space-between" mt={4}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchOffers}
          disabled={loading}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate('/marketplace')}
          startIcon={<ArrowIcon />}
        >
          Browse Marketplace
        </Button>
      </Box>

      {/* Offer Details Modal */}
      {selectedOffer && (
        <OfferDetailsModal
          open={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedOffer(null);
          }}
          offer={selectedOffer}
          userRole={activeTab === 0 ? 'buyer' : 'seller'}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialog?.open || false} onClose={() => setCancelDialog(null)}>
        <DialogTitle>Cancel Offer</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this offer? This action cannot be undone.
          </Typography>
          {selectedOffer?.status === 'pending_payment' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              This will also cancel the pending payment intent.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(null)} disabled={processing}>
            No, Keep Offer
          </Button>
          <Button
            onClick={confirmCancelOffer}
            color="error"
            variant="contained"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <CancelIcon />}
          >
            {processing ? 'Cancelling...' : 'Yes, Cancel Offer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Instructions */}
      <Paper variant="outlined" sx={{ p: 3, mt: 4, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          How Offers Work
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><Badge badgeContent="1" color="primary" /></ListItemIcon>
            <ListItemText 
              primary="Make an Offer" 
              secondary="Submit an offer with payment to negotiate on listings"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><Badge badgeContent="2" color="primary" /></ListItemIcon>
            <ListItemText 
              primary="Complete Payment" 
              secondary="Payment is required to submit your offer securely"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><Badge badgeContent="3" color="primary" /></ListItemIcon>
            <ListItemText 
              primary="Seller Review" 
              secondary="Seller reviews and accepts or rejects your offer"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><Badge badgeContent="4" color="primary" /></ListItemIcon>
            <ListItemText 
              primary="Order Creation" 
              secondary="Accepted offers become orders with dedicated chat"
            />
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
};

export default OffersPage;