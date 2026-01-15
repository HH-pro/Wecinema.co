# Complete Mobile Charts Implementation Guide

## 📱 Quick Start

### Option 1: Simple Mobile Swipe Charts
```tsx
import { MobileSwipeCharts } from '@/components/Analytics';

export default function Page() {
  return <MobileSwipeCharts />;
}
```

### Option 2: Advanced Charts with Multiple Types
```tsx
import { AdvancedMobileCharts } from '@/components/Analytics';

export default function Page() {
  return <AdvancedMobileCharts autoRotate={true} rotationInterval={5000} />;
}
```

### Option 3: Auto-Responsive (Desktop + Mobile)
```tsx
import { ResponsiveCharts } from '@/components/Analytics';

export default function Page() {
  return <ResponsiveCharts breakpoint={768} />;
}
```

## 🎯 Components Overview

### 1. **MobileSwipeCharts** - Lightweight Mobile Charts
- Simple swipe navigation
- Animated bar charts
- Touch-friendly controls
- Best for: Quick analytics display

```tsx
<MobileSwipeCharts />

// Props:
// (None - uses default API endpoints)
```

### 2. **AdvancedMobileCharts** - Full-Featured Charts
- Multiple chart types (Bar, Line, Area)
- Advanced statistics
- Auto-rotate option
- Data filtering
- Best for: Comprehensive analytics

```tsx
<AdvancedMobileCharts 
  maxCharts={10}
  autoRotate={false}
  rotationInterval={5000}
/>

// Props:
// - maxCharts: number (default: 10) - Maximum charts to display
// - autoRotate: boolean (default: false) - Auto-rotate through charts
// - rotationInterval: number (default: 5000) - Rotation speed in ms
```

### 3. **ResponsiveCharts** - Adaptive Layout
- Switches desktop/mobile automatically
- Responsive to window resizing
- Best for: Mixed device support

```tsx
<ResponsiveCharts breakpoint={768} />

// Props:
// - breakpoint: number (default: 768px) - Responsive breakpoint
```

## 🔗 Using with useSwipe Hook

```tsx
import { useSwipe } from '@/hooks/useSwipe';

function MyChart() {
  const swipeHandlers = useSwipe(
    {
      onSwipeLeft: () => console.log('Next'),
      onSwipeRight: () => console.log('Previous'),
      onSwipeUp: () => console.log('Scroll up'),
      onSwipeDown: () => console.log('Scroll down'),
    },
    { threshold: 50, timeThreshold: 500 }
  );

  return (
    <div {...swipeHandlers}>
      Your chart content
    </div>
  );
}
```

## 📊 Data Format

The components expect data in this format from your API:

### Genre/Theme Data:
```json
{
  "Genre1": {
    "2024-01-01": { "count": 10 },
    "2024-01-02": { "count": 15 },
    "2024-01-03": { "count": 12 }
  },
  "Genre2": {
    "2024-01-01": { "count": 8 },
    "2024-01-02": { "count": 20 },
    "2024-01-03": { "count": 18 }
  }
}
```

### Rating Data:
```json
{
  "2024-01-01": { "averageRating": 4.5, "totalRatings": 100 },
  "2024-01-02": { "averageRating": 4.6, "totalRatings": 110 },
  "2024-01-03": { "averageRating": 4.4, "totalRatings": 95 }
}
```

## 🎨 Customization

### Change Colors
```tsx
// In MobileSwipeCharts.tsx, modify colors array:
const colors = [
  "#FF6B8B",  // Pink
  "#2ED573",  // Green
  "#1E90FF",  // Blue
  "#FFA502",  // Orange
  "#9B59B6"   // Purple
];
```

### Modify Chart Height
```css
/* In MobileSwipeCharts.css */
.mobile-bar-chart {
  height: 250px; /* Change this value */
}
```

### Adjust Swipe Threshold
```tsx
// In useSwipe.ts, change threshold
const swipeHandlers = useSwipe(handlers, {
  threshold: 80, // Increase for less sensitive
  timeThreshold: 600 // Increase for slower swipes
});
```

## 🚀 Performance Optimization

### Lazy Load Charts
```tsx
import { lazy, Suspense } from 'react';

const AdvancedCharts = lazy(() => import('@/components/Analytics/AdvancedMobileCharts'));

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdvancedCharts />
    </Suspense>
  );
}
```

### Memoize Component
```tsx
import { memo } from 'react';
import { MobileSwipeCharts } from '@/components/Analytics';

const MemoizedCharts = memo(MobileSwipeCharts);

export default function Page() {
  return <MemoizedCharts />;
}
```

## 🔧 Integration Examples

### In Dashboard
```tsx
import { ResponsiveCharts } from '@/components/Analytics';
import { Container } from '@/components/Layout';

export default function Dashboard() {
  return (
    <Container>
      <h1>Analytics Dashboard</h1>
      <ResponsiveCharts />
    </Container>
  );
}
```

### With Multiple Chart Types
```tsx
import { MobileSwipeCharts, AdvancedMobileCharts } from '@/components/Analytics';
import { useState } from 'react';

export default function Page() {
  const [view, setView] = useState<'simple' | 'advanced'>('simple');

  return (
    <>
      <button onClick={() => setView('simple')}>Simple View</button>
      <button onClick={() => setView('advanced')}>Advanced View</button>
      
      {view === 'simple' ? <MobileSwipeCharts /> : <AdvancedMobileCharts />}
    </>
  );
}
```

## 📱 Responsive Breakpoints

```css
/* Mobile Phone: 320px - 480px */
.mobile-bar-chart { height: 140px; }

/* Mobile Phone: 480px - 600px */
.mobile-bar-chart { height: 160px; }

/* Tablet: 600px - 768px */
.mobile-bar-chart { height: 200px; }

/* Desktop: 768px+ */
/* Desktop charts display */
```

## ⚙️ API Endpoints

Components automatically call:

```
GET /video/genres/graph?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /video/themes/graph?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /video/ratings/graph?from=YYYY-MM-DD&to=YYYY-MM-DD
```

### Customize Date Range
Modify in component:
```tsx
const today = new Date();
const fromDate = new Date();
fromDate.setDate(today.getDate() - 330); // Change 330 to desired days

const from = fromDate.toISOString().split("T")[0];
const to = today.toISOString().split("T")[0];
```

## 🐛 Troubleshooting

### Charts Not Showing
- ✅ Check API returns correct format
- ✅ Verify date range parameters
- ✅ Check browser console for errors
- ✅ Ensure getRequest function works

### Swipe Not Working
- ✅ Set `touch-action: pan-y` on parent
- ✅ Check touch events aren't prevented
- ✅ Verify threshold value

### Styling Issues
- ✅ Import CSS files
- ✅ Check dark mode is enabled
- ✅ Verify no conflicting global styles

### Performance Issues
- ✅ Lazy load components
- ✅ Use memo for memoization
- ✅ Reduce maxCharts prop
- ✅ Check API response time

## 📦 Files Created

```
frontend/src/components/Analytics/
├── MobileSwipeCharts.tsx          (8KB)
├── MobileSwipeCharts.css          (12KB)
├── AdvancedMobileCharts.tsx       (15KB)
├── AdvancedMobileCharts.css       (18KB)
├── ResponsiveCharts.tsx           (1KB)
├── ResponsiveCharts.css           (1KB)
├── index.tsx                      (Updated)
└── MOBILE_CHARTS_README.md        (This file)

frontend/src/hooks/
└── useSwipe.ts                    (2KB)
```

## 🎯 Feature Checklist

- ✅ Swipe gesture support
- ✅ Multiple chart types (Bar, Line, Area)
- ✅ Animated transitions
- ✅ Mobile responsive
- ✅ Touch-friendly controls
- ✅ Real-time data fetching
- ✅ Statistics display
- ✅ Auto-rotate option
- ✅ Dark theme support
- ✅ Accessibility features
- ✅ Performance optimized
- ✅ Customizable colors

## 🚦 Next Steps

1. **Import Components**
   ```tsx
   import { ResponsiveCharts } from '@/components/Analytics';
   ```

2. **Add to Page**
   ```tsx
   <ResponsiveCharts />
   ```

3. **Customize** (if needed)
   - Change colors
   - Adjust breakpoints
   - Modify data ranges

4. **Test**
   - Test on mobile device
   - Test swipe gestures
   - Test API calls
   - Check styling

## 📚 Additional Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [React Hooks Guide](https://react.dev/reference/react)
- [Touch Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)

## 💡 Pro Tips

1. **For Better Performance**
   - Use ResponsiveCharts for automatic switching
   - Lazy load AdvancedMobileCharts when not needed
   - Debounce API calls

2. **For Better UX**
   - Enable autoRotate for engaging display
   - Reduce swipe threshold on small screens
   - Add feedback animations on chart selection

3. **For Better Customization**
   - Create CSS variables for colors
   - Extract data processing to utils
   - Build chart type selector component

## 📞 Support

If you encounter issues:
1. Check the component inline comments
2. Review the troubleshooting section
3. Check browser console for errors
4. Verify API endpoints return data
5. Test on different devices

---

**Last Updated:** January 2026
**Version:** 1.0.0
