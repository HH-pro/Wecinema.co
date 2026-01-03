// DashboardHeader component میں:
interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  earnings: string; // Total earnings string
  totalEarnings?: string; // ✅ Add this new prop
  onRefresh: () => void;
  refreshing: boolean;
  stripeStatus: {
    connected: boolean;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    status: string;
    availableBalance: number;
  };
  onCheckStripe: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  earnings,
  totalEarnings, // ✅ New prop
  onRefresh,
  refreshing,
  stripeStatus,
  onCheckStripe
}) => {
  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-2">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition duration-200 flex items-center"
          >
            {refreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Earnings Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-xl mr-4">
              <span className="text-2xl text-yellow-600">💰</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Total Earnings</h3>
              <p className="text-gray-700">
                {/* ✅ Display totalEarnings if available, otherwise use earnings */}
                <span className="text-3xl font-bold text-gray-900 mr-2">
                  {totalEarnings || earnings}
                </span>
                all-time revenue
              </p>
            </div>
          </div>
          
          {stripeStatus.connected && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">
                ${(stripeStatus.availableBalance / 100).toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </p>
              <p className="text-sm text-gray-500">Ready to withdraw</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;