import * as Sentry from "@sentry/react";

export default function TestError() {
  return (
    <div>
      <button onClick={() => {
        throw new Error("Frontend Test Error - Button Click");
      }}>
        Trigger Frontend Error
      </button>

      <button onClick={() => {
        Sentry.metrics?.increment?.("admin.test_button_click");
      }}>
        Track Custom Metric
      </button>
    </div>
  );
}
