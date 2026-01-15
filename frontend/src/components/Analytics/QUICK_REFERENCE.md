# 🚀 Mobile Charts - Quick Reference Card

## Components at a Glance

### 1️⃣ MobileSwipeCharts
**Best for:** Simple, lightweight charts
```tsx
import { MobileSwipeCharts } from '@/components/Analytics';

<MobileSwipeCharts />
```
- Swipe navigation
- Bar charts only
- Minimal deps
- Fast loading

### 2️⃣ AdvancedMobileCharts
**Best for:** Feature-rich analytics
```tsx
import { AdvancedMobileCharts } from '@/components/Analytics';

<AdvancedMobileCharts 
  autoRotate={false}
  maxCharts={10}
  rotationInterval={5000}
/>
```
- 3 chart types
- Advanced stats
- Auto-rotate
- Full features

### 3️⃣ ResponsiveCharts
**Best for:** Multi-device support ⭐ RECOMMENDED
```tsx
import { ResponsiveCharts } from '@/components/Analytics';

<ResponsiveCharts breakpoint={768} />
```
- Auto switches mode
- Desktop + Mobile
- Smart breakpoint
- Professional

---

## Hook Usage

### useSwipe
```tsx
import { useSwipe } from '@/hooks/useSwipe';

const swipe = useSwipe(
  {
    onSwipeLeft: () => console.log('Left'),
    onSwipeRight: () => console.log('Right'),
    onSwipeUp: () => console.log('Up'),
    onSwipeDown: () => console.log('Down'),
  },
  { threshold: 50, timeThreshold: 500 }
);

<div {...swipe}>Content</div>
```

---

## Utility Functions

### Formatting
```tsx
import { chartUtils } from '@/utilities/chartUtils';

// Format date
chartUtils.formatChartDate('2024-01-15', 'short')  // "Jan 15"
chartUtils.formatChartDate('2024-01-15', 'long')   // "January 15, 2024"

// Format numbers
chartUtils.formatLargeNumber(1500)  // "1.5K"
chartUtils.formatLargeNumber(1500000)  // "1.5M"
```

### Statistics
```tsx
// Calculate stats
const stats = chartUtils.calculateStats([10, 20, 30, 40, 50]);
// { min: 10, max: 50, avg: 30, total: 150, median: 30 }

// Get trend
const trend = chartUtils.getTrend(100, 80);  // "up"

// Percentage change
const change = chartUtils.getPercentageChange(100, 80);  // 25
```

### Colors
```tsx
// Get random color
const color = chartUtils.getRandomColor();

// Get color for value
const color = chartUtils.getColorForValue(50, 0, 100);

// Create gradient
const colors = chartUtils.createGradientScale('#FF0000', '#00FF00', 5);

// Get contrast color
const contrast = chartUtils.getContrastColor('#FF6B8B');  // "#000000"
```

### Data Processing
```tsx
// Normalize values
const normalized = chartUtils.normalizeValues([10, 20, 30]);

// Group by period
const grouped = chartUtils.groupByPeriod(data, 'week');

// Smooth data
const smoothed = chartUtils.smoothData([1, 5, 2, 8, 3], 3);
```

### Device Detection
```tsx
// Check device type
const isMobile = chartUtils.isMobileDevice(768);
const device = chartUtils.getDeviceType();  // "mobile" | "tablet" | "desktop"
```

---

## Data API

Components use these endpoints:
```
GET /video/genres/graph?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /video/themes/graph?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /video/ratings/graph?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Expected format:
```json
{
  "Genre1": {
    "2024-01-15": { "count": 10 }
  }
}
```

---

## Types

```tsx
import type {
  AdvancedChartData,
  ChartDataPoint,
  SwipeHandlers,
  Statistics,
  DeviceType
} from '@/types/chartTypes';
```

---

## CSS Classes

### MobileSwipeCharts
```css
.mobile-swipe-container     /* Main container */
.mobile-chart-header        /* Chart title area */
.mobile-bar-chart           /* Bar chart display */
.mobile-chart-stats         /* Stats section */
.mobile-chart-nav           /* Navigation buttons */
.nav-button                 /* Nav button */
.dot                        /* Indicator dot */
```

### AdvancedMobileCharts
```css
.advanced-mobile-charts      /* Main container */
.advanced-chart-header       /* Header section */
.chart-type-selector         /* Type toggle buttons */
.advanced-chart-display      /* Chart area */
.advanced-stats-grid         /* Stats grid */
.data-list-advanced          /* Data list */
.advanced-chart-footer       /* Footer nav */
```

---

## Common Patterns

### Initialize on Page Load
```tsx
useEffect(() => {
  const fetchData = async () => {
    // Component handles this automatically
  };
  fetchData();
}, []);
```

### Handle Navigation
```tsx
const nextChart = () => {
  if (currentIndex < charts.length - 1) {
    setCurrentIndex(currentIndex + 1);
  }
};
```

### Smooth Animations
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

---

## Customization Quick Tips

### Change Swipe Distance
```tsx
// In useSwipe.ts
const { threshold = 80 } = options;  // Higher = less sensitive
```

### Change Animation Speed
```css
/* In CSS */
.bar {
  transition: all 0.5s ease;  /* Change duration */
}
```

### Change Colors
```tsx
// In component
const colors = ['#FF0000', '#00FF00', '#0000FF'];
```

### Change Date Range
```tsx
// In component
fromDate.setDate(today.getDate() - 180);  // Change 180
```

---

## Error Handling

```tsx
if (loading) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorMessage error={error} />;
}

if (charts.length === 0) {
  return <EmptyState />;
}

return <ChartDisplay />;
```

---

## Performance Tips

✅ **DO:**
- Use ResponsiveCharts
- Lazy load components
- Memoize heavy components
- Cache API responses

❌ **DON'T:**
- Fetch data on every render
- Update state too frequently
- Create new functions in render
- Use index as key in lists

---

## Files Reference

| File | Size | Purpose |
|------|------|---------|
| MobileSwipeCharts.tsx | 8KB | Simple swipe charts |
| AdvancedMobileCharts.tsx | 15KB | Advanced charts |
| ResponsiveCharts.tsx | 1KB | Auto-responsive |
| useSwipe.ts | 2KB | Swipe hook |
| chartUtils.ts | 8KB | Utilities |
| chartTypes.ts | 5KB | Types |

---

## Import Cheatsheet

```tsx
// Components
import { MobileSwipeCharts, AdvancedMobileCharts, ResponsiveCharts } from '@/components/Analytics';

// Hooks
import { useSwipe } from '@/hooks/useSwipe';

// Utilities
import { chartUtils } from '@/utilities/chartUtils';

// Types
import type { AdvancedChartData, ChartDataPoint } from '@/types/chartTypes';
```

---

## Environment Setup

✅ Required:
- React 18+
- TypeScript
- Framer Motion
- Heroicons

✅ Optional:
- Next.js
- Tailwind CSS
- Redux

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Charts blank | Check API endpoints |
| Swipe not work | Test on mobile/simulated |
| Styling broken | Import CSS files |
| Animations stutter | Check device performance |

---

## Responsive Breakpoints

```
Mobile:   0px - 480px
Tablet:   480px - 768px
Desktop:  768px+
```

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| ← | Previous chart |
| → | Next chart |
| ↑ | Scroll up |
| ↓ | Scroll down |
| Tab | Focus navigation |
| Enter | Select |

---

## Browser DevTools Tips

1. **Check Network Tab**
   - Verify API calls work
   - Check response format

2. **Check Console Tab**
   - Look for errors
   - Check logs

3. **Check Elements Tab**
   - Inspect CSS classes
   - Check computed styles

4. **Simulate Mobile**
   - DevTools > Device Toggle (Ctrl+Shift+M)
   - Test touch gestures

---

## Deployment Checklist

- [ ] Components imported
- [ ] CSS files included
- [ ] API endpoints available
- [ ] Mobile tested
- [ ] Animations smooth
- [ ] No console errors
- [ ] Data loads correctly
- [ ] Responsive at all breakpoints

---

**Save this page for quick reference! 📌**

Last Updated: January 2026
