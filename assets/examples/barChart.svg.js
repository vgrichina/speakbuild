function Component({ data, labels, height, width }) {
  // Default values
  const chartHeight = height || 200;
  const chartWidth = width || 300;
  const chartPadding = 30;
  
  // Calculate chart dimensions
  const graphHeight = chartHeight - (chartPadding * 2);
  const graphWidth = chartWidth - (chartPadding * 2);
  
  // Find the maximum value for scaling
  const maxValue = Math.max(...data);
  
  // Calculate bar properties
  const barCount = data.length;
  const barWidth = graphWidth / barCount * 0.8;
  const barSpacing = graphWidth / barCount * 0.2;
  
  const styles = {
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
    }
  };
  
  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.SVG.Svg, {
      width: chartWidth,
      height: chartHeight,
      viewBox: `0 0 ${chartWidth} ${chartHeight}`
    },
      // Y-axis
      React.createElement(RN.SVG.Line, {
        x1: chartPadding,
        y1: chartPadding,
        x2: chartPadding,
        y2: chartHeight - chartPadding,
        stroke: '#888',
        strokeWidth: 1
      }),
      
      // X-axis
      React.createElement(RN.SVG.Line, {
        x1: chartPadding,
        y1: chartHeight - chartPadding,
        x2: chartWidth - chartPadding,
        y2: chartHeight - chartPadding,
        stroke: '#888',
        strokeWidth: 1
      }),
      
      // Bars
      ...data.map((value, index) => {
        const barHeight = (value / maxValue) * graphHeight;
        const x = chartPadding + (index * (barWidth + barSpacing));
        const y = chartHeight - chartPadding - barHeight;
        
        return React.createElement(RN.SVG.G, { key: `bar-${index}` },
          // Bar
          React.createElement(RN.SVG.Rect, {
            x: x,
            y: y,
            width: barWidth,
            height: barHeight,
            fill: '#3b82f6',
            rx: 4
          }),
          
          // Value label
          React.createElement(RN.SVG.Text, {
            x: x + (barWidth / 2),
            y: y - 5,
            fontSize: 10,
            textAnchor: 'middle',
            fill: '#333'
          }, value.toString()),
          
          // X-axis label
          React.createElement(RN.SVG.Text, {
            x: x + (barWidth / 2),
            y: chartHeight - chartPadding + 15,
            fontSize: 10,
            textAnchor: 'middle',
            fill: '#333'
          }, labels && labels[index] ? labels[index] : ``)
        );
      })
    )
  );
}
