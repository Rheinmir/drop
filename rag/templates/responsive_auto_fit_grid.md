# Professional Auto-Fit Grid System (React + Tailwind)

This template implements a "Perfect Fit" responsive grid that automatically adjusts columns and row heights to fill 100% of the container's vertical space without scrolling or empty gaps.

## Philosophy
- **Fixed Viewport**: The grid fits exactly within the container (e.g., `h-screen` or fixed height panel).
- **Dynamic Columns**: Number of columns adjusts ±1 from standard breakpoints to find the best fit.
- **Vertical Stretch**: Item height is dynamic (`gridAutoRows`) to consume remaining vertical space ("waste"), ensuring zero bottom margin.
- **Pagination**: Strict pagination (no inner scroll) based on the calculated item count.

## Core Logic (Hook / Component)

### 1. The Algorithm
Place this logic inside a `useEffect` with a `ResizeObserver` on the grid container.

```typescript
// State
const [itemsPerPage, setItemsPerPage] = useState(20);
const [currentCols, setCurrentCols] = useState(5);
const [gridRowHeight, setGridRowHeight] = useState(200);
const gridContainerRef = useRef<HTMLDivElement>(null);

// Effect
useEffect(() => {
    if (!gridContainerRef.current) return;

    const calculateItems = () => {
        if (!gridContainerRef.current) return;
        const { clientWidth, clientHeight } = gridContainerRef.current;
        const windowWidth = window.innerWidth;

        // 1. Define Constants
        const gap = 16; // gap-4 (16px)
        const verticalPadding = 40; // Total vertical padding (e.g. p-4 + parent p-1)
        const horizontalPadding = 40; // Total horizontal padding

        const availableHeight = clientHeight - verticalPadding;
        const availableWidthInContainer = clientWidth - horizontalPadding;

        // 2. Determine Standard Columns (Tailwind Breakpoints)
        let standardCols = 2;
        if (windowWidth >= 1536) standardCols = 6;
        else if (windowWidth >= 1024) standardCols = 5;
        else if (windowWidth >= 768) standardCols = 4;
        else if (windowWidth >= 640) standardCols = 3;

        // 3. Find Best Configuration (Columns & Row Height)
        // We iterate standardCols ± 2 to find a config that allows >= 3 rows (user pref)
        // and minimizes aspect ratio distortion.
        
        let bestConfig = {
            cols: standardCols,
            rows: 3,
            total: standardCols * 3,
            rowHeight: 200,
            aspectRatioDiff: 0 
        };
        let foundBetter = false;
        
        const candidates = [standardCols, standardCols - 1, standardCols + 1, standardCols + 2].filter(c => c >= 2 && c <= 10);

        candidates.forEach(c => {
            const w = (availableWidthInContainer - (gap * (c - 1))) / c;
            const h = w; // Base square
            
            // Calc raw rows
            let r = Math.floor((availableHeight + gap) / (h + gap));
            
            // Preference: Force at least 3 rows if space permits (even if items get short/wide)
             if (r < 3 && availableHeight > 500) {
                 const forcedH = (availableHeight - (gap * 2)) / 3;
                 if (forcedH / w > 0.6) r = 3; // Allow if aspect ratio > 0.6
             }
            if (r < 1) r = 1;

            // Voodoo Math: Calc EXACT row height to fill space
            // availableHeight = (r * finalH) + ((r-1) * gap)
            const finalH = ((availableHeight + gap) / r) - gap;

            // Score based on Squareness + Row Count Preference
            const ar = w / finalH;
            const diff = Math.abs(1 - ar);
            const score = (r >= 3 ? 1000 : 0) - (diff * 100);
            const currentBestScore = (bestConfig.rows >= 3 ? 1000 : 0) - (bestConfig.aspectRatioDiff * 100);

            if (!foundBetter || score > currentBestScore) {
                bestConfig = { cols: c, rows: r, total: c * r, rowHeight: finalH, aspectRatioDiff: diff };
                foundBetter = true;
            }
        });

        setCurrentCols(bestConfig.cols);
        setGridRowHeight(bestConfig.rowHeight);
        setItemsPerPage(bestConfig.total);
    };

    calculateItems();
    const observer = new ResizeObserver(() => window.requestAnimationFrame(calculateItems));
    observer.observe(gridContainerRef.current);
    return () => observer.disconnect();
}, []);
```

## CSS / JSX Implementation

### Container
Use inline styles for columns and auto-rows. Alignment should be `content-start`.

```tsx
<div 
  ref={gridContainerRef}
  className="grid gap-4 p-4 content-start h-full overflow-hidden" 
  style={{ 
      gridTemplateColumns: `repeat(${currentCols}, minmax(0, 1fr))`,
      gridAutoRows: `${gridRowHeight}px`
  }}
>
  {items.map(item => <GridItem key={item.id} data={item} />)}
</div>
```

### Grid Item
**Crucial**: Remove `aspect-square`. Use `h-full w-full` to fill the stretched cell.

```tsx
<div className="h-full w-full relative flex flex-col ...">
   {/* Content */}
</div>
```

## Benefits
1. **No Scrollbar**: Perfect for dashboard/app-like views.
2. **Zero Waste**: Every pixel of the container is used.
3. **Responsive**: Adapts not just to width, but to height (e.g. user opens DevTools, resizes window vertically).
