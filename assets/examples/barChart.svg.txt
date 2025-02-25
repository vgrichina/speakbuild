function Component({ data, labels, height, width, colors }) {
  // Default values with better fallbacks
  const chartHeight = height || 200;
  const chartWidth = width || 300;
  const chartPadding = { top: 30, right: 20, bottom: 40, left: 40 };
  const barColors = colors || ['#3b82f6', '#4f46e5', '#7c3aed', '#a855f7', '#ec4899'];
  
  // Handle empty data gracefully
  if (!data || data.length === 0) {
    return React.createElement(RN.View, { style: styles.container },
      React.createElement(RN.Text, { style: styles.errorText }, "No data available")
    );
  }
  
  // Calculate chart dimensions
  const graphHeight = chartHeight - (chartPadding.top + chartPadding.bottom);
  const graphWidth = chartWidth - (chartPadding.left + chartPadding.right);
  
  // Find the maximum value for scaling (with minimum to avoid division by zero)
  const maxValue = Math.max(...data, 0.1);
  
  // Calculate bar properties
  const barCount = data.length;
  const barWidth = graphWidth / barCount * 0.8;
  const barSpacing = graphWidth / barCount * 0.2;
  
  // Generate grid lines (e.g., 5 horizontal lines)
  const gridLineCount = 5;
  const gridLines = Array.from({ length: gridLineCount }).map((_, index) => {
    const y = chartPadding.top + (graphHeight / gridLineCount) * index;
    const value = Math.round((maxValue / gridLineCount) * (gridLineCount - index));
    
    return {
      y,
      value
    };
  });
  
  // Create unique gradient IDs
  const gradientIds = data.map((_, index) => `barGradient-${index}`);
  
  // Define styles
  const styles = {
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      backgroundColor: '#ffffff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    errorText: {
      color: '#ef4444',
      fontSize: 14,
    }
  };
  
  // Create tooltip state (for interactive version)
  const [activeBarIndex, setActiveBarIndex] = React.useState(null);
  
  // Handle bar press
  const handleBarPress = (index) => {
    setActiveBarIndex(activeBarIndex === index ? null : index);
    // Optional haptic feedback
    try {
      Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log('Haptics not available');
    }
  };
  
  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.SVG.Svg, {
      width: chartWidth,
      height: chartHeight,
      viewBox: `0 0 ${chartWidth} ${chartHeight}`,
      // Add accessibility attributes
      accessible: true,
      accessibilityLabel: `Bar chart showing ${data.length} values`
    },
      // Definitions for gradients
      React.createElement(RN.SVG.Defs, null,
        ...data.map((_, index) => 
          React.createElement(RN.SVG.LinearGradient, {
            id: gradientIds[index],
            x1: "0%",
            y1: "0%",
            x2: "0%",
            y2: "100%",
            key: `gradient-${index}`
          },
            React.createElement(RN.SVG.Stop, {
              offset: "0%",
              stopColor: barColors[index % barColors.length],
              stopOpacity: 0.8
            }),
            React.createElement(RN.SVG.Stop, {
              offset: "100%",
              stopColor: barColors[index % barColors.length],
              stopOpacity: 0.5
            })
          )
        )
      ),
      
      // Grid lines
      ...gridLines.map((line, index) => 
        React.createElement(RN.SVG.G, { key: `grid-${index}` },
          // Horizontal grid line
          React.createElement(RN.SVG.Line, {
            x1: chartPadding.left,
            y1: line.y,
            x2: chartWidth - chartPadding.right,
            y2: line.y,
            stroke: '#e5e7eb',
            strokeWidth: 1,
            strokeDasharray: "5,5"
          }),
          // Y-axis label
          React.createElement(RN.SVG.Text, {
            x: chartPadding.left - 10,
            y: line.y + 4,
            fontSize: 10,
            textAnchor: 'end',
            fill: '#6b7280'
          }, line.value.toString())
        )
      ),
      
      // Y-axis
      React.createElement(RN.SVG.Line, {
        x1: chartPadding.left,
        y1: chartPadding.top,
        x2: chartPadding.left,
        y2: chartHeight - chartPadding.bottom,
        stroke: '#9ca3af',
        strokeWidth: 1
      }),
      
      // X-axis
      React.createElement(RN.SVG.Line, {
        x1: chartPadding.left,
        y1: chartHeight - chartPadding.bottom,
        x2: chartWidth - chartPadding.right,
        y2: chartHeight - chartPadding.bottom,
        stroke: '#9ca3af',
        strokeWidth: 1
      }),
      
      // Bars
      ...data.map((value, index) => {
        const barHeight = (value / maxValue) * graphHeight;
        const x = chartPadding.left + (index * (barWidth + barSpacing)) + (barSpacing / 2);
        const y = chartHeight - chartPadding.bottom - barHeight;
        const isActive = activeBarIndex === index;
        
        return React.createElement(RN.SVG.G, { key: `bar-${index}` },
          // Bar with gradient fill and press handler
          React.createElement(RN.SVG.Rect, {
            x: x,
            y: y,
            width: barWidth,
            height: barHeight,
            fill: `url(#${gradientIds[index]})`,
            rx: 4,
            // Add slight highlight for active bar
            stroke: isActive ? '#2563eb' : 'none',
            strokeWidth: isActive ? 2 : 0,
            // Make bars interactive
            onPress: () => handleBarPress(index),
            // Accessibility
            accessible: true,
            accessibilityLabel: `${labels && labels[index] ? labels[index] : 'Bar'} value: ${value}`
          }),
          
          // Value label
          React.createElement(RN.SVG.Text, {
            x: x + (barWidth / 2),
            y: y - 8,
            fontSize: 10,
            fontWeight: 'bold',
            textAnchor: 'middle',
            fill: '#374151'
          }, value.toString()),
          
          // X-axis label
          React.createElement(RN.SVG.Text, {
            x: x + (barWidth / 2),
            y: chartHeight - chartPadding.bottom + 15,
            fontSize: 10,
            textAnchor: 'middle',
            fill: '#4b5563'
          }, labels && labels[index] ? labels[index] : ``)
        );
      }),
      
      // Chart title
      React.createElement(RN.SVG.Text, {
        x: chartWidth / 2,
        y: 15,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
        fill: '#111827'
      }, "Data Visualization")
    ),
    
    // Optional tooltip/detail view that appears when a bar is selected
    activeBarIndex !== null && React.createElement(RN.View, {
      style: {
        marginTop: 10,
        padding: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: barColors[activeBarIndex % barColors.length],
      }
    },
      React.createElement(RN.Text, {
        style: { fontWeight: 'bold' }
      }, `${labels && labels[activeBarIndex] ? labels[activeBarIndex] : 'Item'}: ${data[activeBarIndex]}`)
    )
  );
}
