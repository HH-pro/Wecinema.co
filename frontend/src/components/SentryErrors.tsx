import { useEffect, useState } from 'react';

interface SentryError {
  id: string;
  title: string;
  count: number;
  lastSeen: string;
  status: string;
  level: string;
}

export default function SentryErrors() {
  const [errors, setErrors] = useState<SentryError[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchErrors = async () => {
      try {
        const response = await fetch('/api/sentry/errors');
        const data = await response.json();
        setErrors(data);
      } catch (error) {
        console.error('Error fetching Sentry data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchErrors();
  }, []);

  if (loading) return <div>Loading errors...</div>;

  return (
    <div className="sentry-errors">
      <h2>Recent Errors</h2>
      <div className="error-list">
        {errors.map((error) => (
          <div key={error.id} className={`error-item ${error.level}`}>
            <div className="error-header">
              <span className="error-level">{error.level}</span>
              <span className="error-status">{error.status}</span>
            </div>
            <h3 className="error-title">{error.title}</h3>
            <div className="error-meta">
              <span>Occurrences: {error.count}</span>
              <span>Last seen: {new Date(error.lastSeen).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}