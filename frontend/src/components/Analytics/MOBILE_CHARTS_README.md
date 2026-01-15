# Mobile Charts with Swipe Functionality - Documentation

## Overview

This package includes fully responsive mobile-friendly charts with swipe gestures, perfect for displaying analytics data on mobile devices.

## Components Created

### 1. **MobileSwipeCharts** (`MobileSwipeCharts.tsx`)
A dedicated mobile chart component with swipe navigation and animated bar charts.

**Features:**
- ✅ Touch swipe gestures (left/right)
- ✅ Animated bar charts with smooth transitions
- ✅ Statistics display (Max, Min, Avg)
- ✅ Dot navigation indicator
- ✅ Previous/Next buttons
- ✅ Real-time data fetching from API
- ✅ Responsive design for all screen sizes

**Usage:**
```tsx
import { MobileSwipeCharts } from '@/components/Analytics';

export default function Page() {
  return <MobileSwipeCharts />;
}
```

### 2. **ResponsiveCharts** (`ResponsiveCharts.tsx`)
A wrapper component that automatically switches between desktop and mobile views.

**Features:**
- ✅ Auto-detects screen size
- ✅ Responsive breakpoint (default: 768px)
- ✅ Smooth transitions between views

**Usage:**
```tsx
import { ResponsiveCharts } from '@/components/Analytics';

export default function Page() {
  // Uses 768px breakpoint by default
  return <ResponsiveCharts />;
  
  // Or custom breakpoint
  return <ResponsiveCharts breakpoint={600} />;
}
```

### 3. **useSwipe Hook** (`hooks/useSwipe.ts`)
A reusable React hook for handling swipe gestures on any element.

**Features:**
- ✅ Left/Right/Up/Down swipe detection
- ✅ Configurable threshold and time threshold
- ✅ Swiping state tracking

**Usage:**
```tsx
import { useSwipe } from '@/hooks/useSwipe';

export default function MyComponent() {
  const swipeHandlers = useSwipe(
    {
      onSwipeLeft: () => console.log('Swiped Left'),
      onSwipeRight: () => console.log('Swiped Right'),
      onSwipeUp: () => console.log('Swiped Up'),
      onSwipeDown: () => console.log('Swiped Down'),
    },
    { threshold: 50, timeThreshold: 500 }
  );

  return (
    <div {...swipeHandlers}>
      Your content here
    </div>
  );
}
```

## Data Fetching

All components automatically fetch data from your API endpoints:

```
GET /video/genres/graph?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /video/themes/graph?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /video/ratings/graph?from=YYYY-MM-DD&to=YYYY-MM-DD
```

The components process and display:
- **Top 5 Genres** with individual charts
- **Top 5 Themes** with individual charts
- **Average Ratings** chart
- **Total Ratings** chart

## Styling

All components use CSS variables and can be customized. Key styles:

```css
/* Colors */
--primary-color: #6495ff;
--danger-color: #FF4757;
--success-color: #2ED573;

/* Responsive */
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
```

## Chart Colors

Default color palette for different chart types:

```
Genre 1: #FF6B8B (Pink)
Genre 2: #2ED573 (Green)
Genre 3: #1E90FF (Blue)
Genre 4: #FFA502 (Orange)
Genre 5: #9B59B6 (Purple)
```

## Responsive Breakpoints

The mobile swipe charts are optimized for:
- **Phones**: 320px - 480px
- **Tablets**: 480px - 768px
- **Desktops**: 768px+

## Browser Support

- ✅ iOS Safari
- ✅ Android Chrome
- ✅ Modern desktop browsers
- ✅ Touch events compatible

## File Sizes

- `MobileSwipeCharts.tsx`: ~8KB
- `MobileSwipeCharts.css`: ~12KB
- `useSwipe.ts`: ~2KB
- `ResponsiveCharts.tsx`: ~1KB

## Dependencies

- React 18+
- Framer Motion (for animations)
- Heroicons (for SVG icons)
- Axios (for API calls)

## Integration Examples

### In Analytics Dashboard
```tsx
import { ResponsiveCharts } from '@/components/Analytics';

export default function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Analytics</h1>
      <ResponsiveCharts />
    </div>
  );
}
```

### Custom Swipe Handler
```tsx
import { useSwipe } from '@/hooks/useSwipe';
import { MobileSwipeCharts } from '@/components/Analytics';

export default function CustomCharts() {
  const swipe = useSwipe({
    onSwipeLeft: () => alert('Next chart'),
    onSwipeRight: () => alert('Previous chart'),
  });

  return (
    <div {...swipe}>
      <MobileSwipeCharts />
    </div>
  );
}
```

## Performance Optimizations

- ✅ Lazy loading with Framer Motion
- ✅ Memoized components
- ✅ Optimized re-renders
- ✅ CSS animations instead of JS where possible
- ✅ Touch action optimization

## Accessibility

- ✅ Keyboard navigation support
- ✅ ARIA labels for screen readers
- ✅ High contrast mode support
- ✅ Focus indicators

## Troubleshooting

### Swipe not working
- Ensure `touch-action: pan-y` is set on parent
- Check if touch events are not being prevented
- Verify threshold value matches your swipe distance

### Charts not loading
- Check API endpoint returns correct format
- Verify date range parameters
- Check browser console for API errors

### Styling issues
- Ensure CSS files are imported
- Check for conflicting global styles
- Verify dark theme is enabled

## Future Enhancements

- [ ] Add chart type toggle (bar/line/area)
- [ ] Add date range picker
- [ ] Add export to CSV/PDF
- [ ] Add filtering options
- [ ] Add chart animation toggles
- [ ] Add dark/light mode toggle

## Support

For issues or questions, check the components' inline comments or refer to individual component documentation.
