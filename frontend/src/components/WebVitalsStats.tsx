// src/components/WebVitalsStats.tsx
import { useEffect, useState } from 'react';
import { getRequest } from '../api'; // adjust the path to your actual file

interface WebVitals {
  lcp?: number;
  fid?: number;
  cls?: number;
}

const WebVitalsStats = () => {
  const [vitals, setVitals] = useState<WebVitals>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVitals = async () => {
      try {
        const data = await getRequest('/sentry/web-vitals', setLoading);
        if (data) setVitals(data);
        else setError("No vitals data available.");
      } catch (err) {
        setError("Failed to load web vitals");
      } finally {
        setLoading(false);
      }
    };

    fetchVitals();
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      {error && <p className="text-red-500 col-span-3">{error}</p>}
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-gray-600">LCP</p>
        <p className="text-2xl font-bold">
          {loading ? '--' : vitals.lcp ? `${vitals.lcp}ms` : 'N/A'}
        </p>
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-gray-600">FID</p>
        <p className="text-2xl font-bold">
          {loading ? '--' : vitals.fid ? `${vitals.fid}ms` : 'N/A'}
        </p>
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-gray-600">CLS</p>
        <p className="text-2xl font-bold">
          {loading ? '--' : vitals.cls ?? 'N/A'}
        </p>
      </div>
    </div>
  );
};

export default WebVitalsStats;
