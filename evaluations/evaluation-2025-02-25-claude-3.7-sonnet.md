# Component Generation Evaluation Results

## Summary
- **Model**: anthropic/claude-3.7-sonnet
- **Date**: 2025-02-25T01:06:14.464Z
- **Success Rate**: 100.0%
- **Average Generation Time**: 16.4s per component
- **Total Duration**: 164.4s

## Test Cases


### New Component
**Widget URL**: `display/clock/digital/light?params=format:caption,size:integer`
**Parameters**: `{"format":"HH:mm","size":48}`
- **Status**: ✅ Success
- **Duration**: 8.3s


function Component({ format, size }) {
  const [time, setTime] = React.useState(new Date());
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const styles = {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F5F5F5',
      padding: 20
    },
    timeText: {
      fontSize: size || 48,
      fontWeight: 'bold',
      color: '#333',
      fontVariant: ['tabular-nums']
    },
    caption: {
      fontSize: size ? size / 3 : 16,
      color: '#666',
      marginTop: 10
    }
  };
  
  const formatTime = () => {
    let timeString;
    
    if (format === '24h') {
      timeString = time.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else if (format === 'short') {
      timeString = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // Default format
      timeString = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    
    return timeString;
  };
  
  const formatDate = () => {
    return time.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.Text, { style: styles.timeText }, formatTime()),
    format !== 'time-only' && React.createElement(RN.Text, { style: styles.caption }, formatDate())
  );
}


### New Component
**Widget URL**: `interactive/timer/countdown/light?with_controls=yes&params=duration:integer,size:integer,showControls:boolean`
**Parameters**: `{"duration":180,"size":48,"showControls":true}`
- **Status**: ✅ Success
- **Duration**: 18.7s


function Component({ duration, size, showControls }) {
  const [timeLeft, setTimeLeft] = React.useState(duration || 60);
  const [isActive, setIsActive] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const intervalRef = React.useRef(null);

  React.useEffect(() => {
    if (isActive && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(intervalRef.current);
            setIsActive(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (isPaused) {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, isPaused, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (timeLeft === 0) setTimeLeft(duration || 60);
    setIsActive(true);
    setIsPaused(false);
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePause = () => {
    setIsPaused(true);
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
  };

  const handleResume = () => {
    setIsPaused(false);
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
  };

  const handleReset = () => {
    clearInterval(intervalRef.current);
    setTimeLeft(duration || 60);
    setIsActive(false);
    setIsPaused(false);
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Heavy);
  };

  const fontSize = size || 48;
  const buttonSize = Math.max(fontSize * 0.6, 40);
  
  const styles = {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      padding: 20,
    },
    timerText: {
      fontSize: fontSize,
      fontWeight: 'bold',
      color: '#333333',
      marginBottom: 30,
    },
    controlsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
    },
    button: {
      width: buttonSize,
      height: buttonSize,
      borderRadius: buttonSize / 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 10,
      backgroundColor: '#f0f0f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    startButton: {
      backgroundColor: '#4CAF50',
    },
    pauseButton: {
      backgroundColor: '#FFC107',
    },
    resetButton: {
      backgroundColor: '#F44336',
    },
    buttonText: {
      fontSize: buttonSize * 0.4,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    progressRing: {
      width: fontSize * 3,
      height: fontSize * 3,
      borderRadius: fontSize * 1.5,
      borderWidth: fontSize * 0.1,
      borderColor: '#E0E0E0',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    progressFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: fontSize * 1.5,
      borderWidth: fontSize * 0.1,
      borderColor: '#4CAF50',
      opacity: 0.5,
    }
  };

  // Calculate progress for the ring
  const initialDuration = duration || 60;
  const progress = timeLeft / initialDuration;
  const circumference = 2 * Math.PI * (fontSize * 1.5 - fontSize * 0.05);
  const strokeDashoffset = circumference * (1 - progress);

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.View, { style: styles.progressRing },
      React.createElement(RN.View, { 
        style: [
          styles.progressFill,
          { 
            opacity: progress,
            transform: [{ scale: progress }]
          }
        ]
      }),
      React.createElement(RN.Text, { style: styles.timerText }, formatTime(timeLeft))
    ),
    showControls !== false && React.createElement(RN.View, { style: styles.controlsContainer },
      !isActive ? 
        React.createElement(RN.TouchableOpacity, { 
          style: [styles.button, styles.startButton],
          onPress: handleStart
        },
          React.createElement(RN.Text, { style: styles.buttonText }, "Start")
        ) :
        isPaused ?
          React.createElement(RN.TouchableOpacity, { 
            style: [styles.button, styles.pauseButton],
            onPress: handleResume
          },
            React.createElement(RN.Text, { style: styles.buttonText }, "Resume")
          ) :
          React.createElement(RN.TouchableOpacity, { 
            style: [styles.button, styles.pauseButton],
            onPress: handlePause
          },
            React.createElement(RN.Text, { style: styles.buttonText }, "Pause")
          ),
      React.createElement(RN.TouchableOpacity, { 
        style: [styles.button, styles.resetButton],
        onPress: handleReset
      },
        React.createElement(RN.Text, { style: styles.buttonText }, "Reset")
      )
    )
  );
}


### New Component
**Widget URL**: `input/list/editable/light?with_checkboxes=yes&params=title:caption,items:caption[],enableChecks:boolean`
**Parameters**: `{"title":"Shopping List","items":["Milk","Eggs"],"enableChecks":true}`
- **Status**: ✅ Success
- **Duration**: 17.2s


function Component({ title, items, enableChecks }) {
  const [listItems, setListItems] = React.useState(items || []);
  const [newItem, setNewItem] = React.useState('');
  const [checkedItems, setCheckedItems] = React.useState({});

  const addItem = () => {
    if (newItem.trim() !== '') {
      setListItems([...listItems, newItem]);
      setNewItem('');
    }
  };

  const removeItem = (index) => {
    const updatedItems = [...listItems];
    updatedItems.splice(index, 1);
    setListItems(updatedItems);
    
    // Update checked items
    const updatedCheckedItems = { ...checkedItems };
    delete updatedCheckedItems[index];
    
    // Adjust keys for items after deletion
    const newCheckedItems = {};
    Object.keys(updatedCheckedItems).forEach(key => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        newCheckedItems[keyNum - 1] = updatedCheckedItems[key];
      } else {
        newCheckedItems[key] = updatedCheckedItems[key];
      }
    });
    
    setCheckedItems(newCheckedItems);
  };

  const toggleCheck = (index) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const styles = {
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#FFFFFF',
    },
    header: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#333333',
    },
    inputContainer: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    input: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: '#DDDDDD',
      borderRadius: 8,
      paddingHorizontal: 12,
      marginRight: 8,
      color: '#333333',
    },
    addButton: {
      backgroundColor: '#007AFF',
      paddingHorizontal: 16,
      height: 44,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    listContainer: {
      flex: 1,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#EEEEEE',
    },
    itemText: {
      flex: 1,
      fontSize: 16,
      color: '#333333',
    },
    checkedItemText: {
      textDecorationLine: 'line-through',
      color: '#888888',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: '#007AFF',
      borderRadius: 4,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checked: {
      backgroundColor: '#007AFF',
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    deleteButton: {
      padding: 8,
    },
    deleteText: {
      fontSize: 16,
      color: '#FF3B30',
      fontWeight: '600',
    },
  };

  return React.createElement(RN.View, { style: styles.container }, [
    React.createElement(RN.Text, { key: 'header', style: styles.header }, title || 'Editable List'),
    
    React.createElement(RN.View, { key: 'input-container', style: styles.inputContainer }, [
      React.createElement(RN.TextInput, {
        key: 'input',
        style: styles.input,
        value: newItem,
        onChangeText: setNewItem,
        placeholder: 'Add new item',
        placeholderTextColor: '#999999',
      }),
      React.createElement(RN.TouchableOpacity, {
        key: 'add-button',
        style: styles.addButton,
        onPress: addItem,
      }, [
        React.createElement(RN.Text, {
          key: 'add-text',
          style: styles.buttonText,
        }, 'Add')
      ])
    ]),
    
    React.createElement(RN.ScrollView, { key: 'list', style: styles.listContainer },
      listItems.map((item, index) => 
        React.createElement(RN.View, { key: `item-${index}`, style: styles.item }, [
          enableChecks === true && React.createElement(RN.TouchableOpacity, {
            key: `checkbox-${index}`,
            style: [styles.checkbox, checkedItems[index] && styles.checked],
            onPress: () => toggleCheck(index),
          }, [
            checkedItems[index] && React.createElement(RN.Text, {
              key: `checkmark-${index}`,
              style: styles.checkmark,
            }, '✓')
          ]),
          React.createElement(RN.Text, {
            key: `text-${index}`,
            style: [
              styles.itemText, 
              enableChecks === true && checkedItems[index] && styles.checkedItemText
            ],
          }, item),
          React.createElement(RN.TouchableOpacity, {
            key: `delete-${index}`,
            style: styles.deleteButton,
            onPress: () => removeItem(index),
          }, [
            React.createElement(RN.Text, {
              key: `delete-text-${index}`,
              style: styles.deleteText,
            }, 'Delete')
          ])
        ])
      )
    )
  ]);
}


### New Component
**Widget URL**: `display/weather/forecast/light?with_daily=yes&params=location:caption,unit:caption,date:string,days:integer`
**Parameters**: `{"location":"current","unit":"celsius","date":"2024-02-06","days":7}`
- **Status**: ✅ Success
- **Duration**: 20.4s


function Component({ location, unit, date, days }) {
  const [forecast, setForecast] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // Simulate fetching weather data
    setLoading(true);
    
    // Mock API call
    setTimeout(() => {
      try {
        // Generate mock forecast data
        const mockForecast = generateMockForecast(days, unit);
        setForecast(mockForecast);
        setLoading(false);
      } catch (err) {
        setError('Failed to load weather data');
        setLoading(false);
      }
    }, 1500);
  }, [location, unit, days]);

  const generateMockForecast = (numDays, unitType) => {
    const forecastData = [];
    const weatherConditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rain', 'Thunderstorm'];
    const weatherIcons = ['☀️', '⛅', '☁️', '🌧️', '⛈️'];
    
    const today = new Date();
    
    for (let i = 0; i < numDays; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);
      
      const conditionIndex = Math.floor(Math.random() * weatherConditions.length);
      const minTemp = Math.floor(Math.random() * 10) + 15; // 15-25
      const maxTemp = minTemp + Math.floor(Math.random() * 10) + 5; // min+5 to min+15
      
      forecastData.push({
        date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        condition: weatherConditions[conditionIndex],
        icon: weatherIcons[conditionIndex],
        minTemp: minTemp,
        maxTemp: maxTemp,
        precipitation: Math.floor(Math.random() * 100),
        humidity: Math.floor(Math.random() * 30) + 40,
        wind: Math.floor(Math.random() * 30) + 5
      });
    }
    
    return forecastData;
  };

  const getTemperatureUnit = () => unit === 'fahrenheit' ? '°F' : '°C';
  
  const styles = {
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#f5f7fa',
      borderRadius: 12
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    },
    location: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333'
    },
    date: {
      fontSize: 16,
      color: '#666'
    },
    forecastContainer: {
      flex: 1
    },
    forecastCard: {
      backgroundColor: '#ffffff',
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2
    },
    dayInfo: {
      flex: 1
    },
    dayDate: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
      color: '#333'
    },
    condition: {
      fontSize: 14,
      color: '#666',
      marginBottom: 4
    },
    weatherIcon: {
      fontSize: 36,
      marginRight: 16
    },
    tempContainer: {
      alignItems: 'flex-end'
    },
    maxTemp: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#e74c3c'
    },
    minTemp: {
      fontSize: 16,
      color: '#3498db'
    },
    extraInfo: {
      flexDirection: 'row',
      marginTop: 6
    },
    extraInfoItem: {
      marginRight: 12,
      fontSize: 12,
      color: '#777'
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24
    },
    loadingText: {
      fontSize: 16,
      color: '#666',
      marginTop: 12
    },
    errorText: {
      color: '#e74c3c',
      textAlign: 'center',
      fontSize: 16,
      padding: 16
    }
  };

  if (loading) {
    return React.createElement(RN.View, { style: styles.loadingContainer },
      React.createElement(RN.Text, { style: styles.loadingText }, "Loading weather forecast...")
    );
  }

  if (error) {
    return React.createElement(RN.View, { style: styles.container },
      React.createElement(RN.Text, { style: styles.errorText }, error)
    );
  }

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.View, { style: styles.header },
      React.createElement(RN.Text, { style: styles.location }, location),
      React.createElement(RN.Text, { style: styles.date }, date || new Date().toLocaleDateString())
    ),
    React.createElement(RN.ScrollView, { style: styles.forecastContainer },
      forecast && forecast.map((day, index) => 
        React.createElement(RN.View, { key: index, style: styles.forecastCard },
          React.createElement(RN.Text, { style: styles.weatherIcon }, day.icon),
          React.createElement(RN.View, { style: styles.dayInfo },
            React.createElement(RN.Text, { style: styles.dayDate }, day.date),
            React.createElement(RN.Text, { style: styles.condition }, day.condition),
            React.createElement(RN.View, { style: styles.extraInfo },
              React.createElement(RN.Text, { style: styles.extraInfoItem }, `Humidity: ${day.humidity}%`),
              React.createElement(RN.Text, { style: styles.extraInfoItem }, `Wind: ${day.wind} km/h`)
            )
          ),
          React.createElement(RN.View, { style: styles.tempContainer },
            React.createElement(RN.Text, { style: styles.maxTemp }, `${day.maxTemp}${getTemperatureUnit()}`),
            React.createElement(RN.Text, { style: styles.minTemp }, `${day.minTemp}${getTemperatureUnit()}`)
          )
        )
      )
    )
  );
}


### New Component
**Widget URL**: `input/note/editable/light?params=title:caption,content:sentence,timestamp:boolean`
**Parameters**: `{"title":"Quick Note","content":"","timestamp":true}`
- **Status**: ✅ Success
- **Duration**: 15.1s


function Component({ title, content, timestamp }) {
  const [noteContent, setNoteContent] = React.useState(content || '');
  const [lastEdited, setLastEdited] = React.useState(
    timestamp ? new Date().toLocaleString() : null
  );
  const [isFocused, setIsFocused] = React.useState(false);

  const updateTimestamp = () => {
    if (timestamp) {
      setLastEdited(new Date().toLocaleString());
    }
  };

  const styles = {
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    titleContainer: {
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333333',
    },
    timestamp: {
      fontSize: 12,
      color: '#666666',
      fontStyle: 'italic',
    },
    inputContainer: {
      flex: 1,
      borderWidth: 1,
      borderColor: isFocused ? '#4A90E2' : '#E0E0E0',
      borderRadius: 6,
      padding: 12,
      backgroundColor: '#F9F9F9',
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: '#333333',
      textAlignVertical: 'top',
      minHeight: 100,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 12,
    },
    saveButton: {
      backgroundColor: '#4A90E2',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
      fontSize: 14,
    },
    copyButton: {
      backgroundColor: '#E0E0E0',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 4,
      marginRight: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyButtonText: {
      color: '#333333',
      fontWeight: '500',
      fontSize: 14,
    },
  };

  const handleCopy = () => {
    Expo.Clipboard.setStringAsync(noteContent).then(() => {
      RN.Alert.alert('Copied', 'Note content copied to clipboard');
      Expo.Haptics.notificationAsync(Expo.Haptics.NotificationFeedbackType.Success);
    }).catch(error => {
      console.error('Failed to copy to clipboard:', error);
      RN.Alert.alert('Error', 'Failed to copy to clipboard');
    });
  };

  const handleSave = () => {
    updateTimestamp();
    RN.Alert.alert('Saved', 'Your note has been saved');
    Expo.Haptics.notificationAsync(Expo.Haptics.NotificationFeedbackType.Success);
  };

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.View, { style: styles.titleContainer },
      React.createElement(RN.Text, { style: styles.title }, title || 'Note'),
      timestamp && lastEdited ? 
        React.createElement(RN.Text, { style: styles.timestamp }, `Last edited: ${lastEdited}`) : 
        null
    ),
    React.createElement(RN.View, { style: styles.inputContainer },
      React.createElement(RN.TextInput, {
        style: styles.input,
        value: noteContent,
        onChangeText: (text) => {
          setNoteContent(text);
        },
        multiline: true,
        placeholder: 'Write your note here...',
        onFocus: () => setIsFocused(true),
        onBlur: () => {
          setIsFocused(false);
          updateTimestamp();
        }
      })
    ),
    React.createElement(RN.View, { style: styles.buttonContainer },
      React.createElement(RN.TouchableOpacity, {
        style: styles.copyButton,
        onPress: handleCopy
      },
        React.createElement(RN.Text, { style: styles.copyButtonText }, 'Copy')
      ),
      React.createElement(RN.TouchableOpacity, {
        style: styles.saveButton,
        onPress: handleSave
      },
        React.createElement(RN.Text, { style: styles.saveButtonText }, 'Save')
      )
    )
  );
}


### New Component
**Widget URL**: `interactive/calculator/basic/light?params=theme:caption,showHistory:boolean,precision:integer`
**Parameters**: `{"theme":"default","showHistory":true,"precision":2}`
- **Status**: ✅ Success
- **Duration**: 32.5s


function Component({ theme, showHistory, precision }) {
  const [displayValue, setDisplayValue] = React.useState('0');
  const [history, setHistory] = React.useState([]);
  const [waitingForOperand, setWaitingForOperand] = React.useState(true);
  const [storedValue, setStoredValue] = React.useState(null);
  const [operator, setOperator] = React.useState(null);

  const precisionValue = precision || 2;
  const calculatorTheme = theme || 'light';

  const colors = {
    light: {
      background: '#F2F2F7',
      display: '#FFFFFF',
      text: '#000000',
      button: '#FFFFFF',
      buttonText: '#000000',
      operatorButton: '#FF9500',
      operatorButtonText: '#FFFFFF',
      equalButton: '#FF9500',
      equalButtonText: '#FFFFFF',
      functionButton: '#D4D4D2',
      functionButtonText: '#000000',
      historyText: '#8E8E93',
    },
    dark: {
      background: '#1C1C1E',
      display: '#2C2C2E',
      text: '#FFFFFF',
      button: '#505050',
      buttonText: '#FFFFFF',
      operatorButton: '#FF9500',
      operatorButtonText: '#FFFFFF',
      equalButton: '#FF9500',
      equalButtonText: '#FFFFFF',
      functionButton: '#3A3A3C',
      functionButtonText: '#FFFFFF',
      historyText: '#8E8E93',
    },
    caption: {
      background: '#E5E5EA',
      display: '#FFFFFF',
      text: '#000000',
      button: '#FFFFFF',
      buttonText: '#007AFF',
      operatorButton: '#007AFF',
      operatorButtonText: '#FFFFFF',
      equalButton: '#34C759',
      equalButtonText: '#FFFFFF',
      functionButton: '#E5E5EA',
      functionButtonText: '#FF3B30',
      historyText: '#8E8E93',
    }
  };

  const currentTheme = colors[calculatorTheme] || colors.light;

  const styles = {
    container: {
      flex: 1,
      backgroundColor: currentTheme.background,
      padding: 16,
    },
    displayContainer: {
      backgroundColor: currentTheme.display,
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
      alignItems: 'flex-end',
    },
    display: {
      fontSize: 40,
      fontWeight: 'bold',
      color: currentTheme.text,
    },
    historyContainer: {
      maxHeight: 100,
      marginBottom: 16,
      overflow: 'hidden',
    },
    historyItem: {
      color: currentTheme.historyText,
      fontSize: 16,
      textAlign: 'right',
      marginBottom: 4,
    },
    buttonsContainer: {
      flex: 1,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    button: {
      backgroundColor: currentTheme.button,
      width: '23%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 40,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    buttonText: {
      fontSize: 24,
      fontWeight: '500',
      color: currentTheme.buttonText,
    },
    operatorButton: {
      backgroundColor: currentTheme.operatorButton,
    },
    operatorButtonText: {
      color: currentTheme.operatorButtonText,
    },
    functionButton: {
      backgroundColor: currentTheme.functionButton,
    },
    functionButtonText: {
      color: currentTheme.functionButtonText,
    },
    equalButton: {
      backgroundColor: currentTheme.equalButton,
    },
    equalButtonText: {
      color: currentTheme.equalButtonText,
    },
    zeroButton: {
      width: '48%',
      aspectRatio: 2.09,
      alignItems: 'flex-start',
      paddingLeft: 32,
    },
  };

  const handleNumberInput = (num) => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
    
    if (waitingForOperand) {
      setDisplayValue(String(num));
      setWaitingForOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? String(num) : displayValue + num);
    }
  };

  const handleOperator = (nextOperator) => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Medium);
    
    const inputValue = parseFloat(displayValue);
    
    if (storedValue === null) {
      setStoredValue(inputValue);
    } else if (operator) {
      const newValue = calculate(storedValue, inputValue, operator);
      setStoredValue(newValue);
      setDisplayValue(String(newValue.toFixed(precisionValue)));
      
      if (showHistory) {
        setHistory([...history, `${storedValue} ${operator} ${inputValue} = ${newValue.toFixed(precisionValue)}`]);
      }
    }
    
    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (firstValue, secondValue, op) => {
    switch (op) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  };

  const handleEqual = () => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Heavy);
    
    if (operator && storedValue !== null) {
      const inputValue = parseFloat(displayValue);
      const result = calculate(storedValue, inputValue, operator);
      
      if (showHistory) {
        setHistory([...history, `${storedValue} ${operator} ${inputValue} = ${result.toFixed(precisionValue)}`]);
      }
      
      setDisplayValue(String(result.toFixed(precisionValue)));
      setStoredValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  const clearAll = () => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Medium);
    setDisplayValue('0');
    setWaitingForOperand(true);
    setStoredValue(null);
    setOperator(null);
  };

  const clearEntry = () => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
    setDisplayValue('0');
    setWaitingForOperand(true);
  };

  const toggleSign = () => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
    const newValue = parseFloat(displayValue) * -1;
    setDisplayValue(String(newValue));
  };

  const inputPercent = () => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
    const newValue = parseFloat(displayValue) / 100;
    setDisplayValue(String(newValue));
  };

  const inputDecimal = () => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
    if (waitingForOperand) {
      setDisplayValue('0.');
      setWaitingForOperand(false);
    } else if (displayValue.indexOf('.') === -1) {
      setDisplayValue(displayValue + '.');
    }
  };

  const renderButton = (text, onPress, buttonStyle, textStyle) => {
    return React.createElement(RN.TouchableOpacity, {
      style: [styles.button, buttonStyle],
      onPress: onPress,
      activeOpacity: 0.7
    }, 
    React.createElement(RN.Text, {
      style: [styles.buttonText, textStyle]
    }, text));
  };

  return React.createElement(RN.View, { style: styles.container },
    // Display
    React.createElement(RN.View, { style: styles.displayContainer },
      React.createElement(RN.Text, { 
        style: styles.display,
        numberOfLines: 1,
        adjustsFontSizeToFit: true
      }, displayValue)
    ),
    
    // History
    showHistory && React.createElement(RN.ScrollView, { 
      style: styles.historyContainer,
      contentContainerStyle: { flexGrow: 1, justifyContent: 'flex-end' }
    },
      history.slice(-5).map((item, index) => 
        React.createElement(RN.Text, { 
          key: index,
          style: styles.historyItem
        }, item)
      )
    ),
    
    // Buttons
    React.createElement(RN.View, { style: styles.buttonsContainer },
      // Row 1
      React.createElement(RN.View, { style: styles.buttonRow },
        renderButton('AC', clearAll, styles.functionButton, styles.functionButtonText),
        renderButton('C', clearEntry, styles.functionButton, styles.functionButtonText),
        renderButton('%', inputPercent, styles.functionButton, styles.functionButtonText),
        renderButton('÷', () => handleOperator('÷'), styles.operatorButton, styles.operatorButtonText)
      ),
      
      // Row 2
      React.createElement(RN.View, { style: styles.buttonRow },
        renderButton('7', () => handleNumberInput('7')),
        renderButton('8', () => handleNumberInput('8')),
        renderButton('9', () => handleNumberInput('9')),
        renderButton('×', () => handleOperator('×'), styles.operatorButton, styles.operatorButtonText)
      ),
      
      // Row 3
      React.createElement(RN.View, { style: styles.buttonRow },
        renderButton('4', () => handleNumberInput('4')),
        renderButton('5', () => handleNumberInput('5')),
        renderButton('6', () => handleNumberInput('6')),
        renderButton('-', () => handleOperator('-'), styles.operatorButton, styles.operatorButtonText)
      ),
      
      // Row 4
      React.createElement(RN.View, { style: styles.buttonRow },
        renderButton('1', () => handleNumberInput('1')),
        renderButton('2', () => handleNumberInput('2')),
        renderButton('3', () => handleNumberInput('3')),
        renderButton('+', () => handleOperator('+'), styles.operatorButton, styles.operatorButtonText)
      ),
      
      // Row 5
      React.createElement(RN.View, { style: styles.buttonRow },
        renderButton('+/-', toggleSign),
        renderButton('0', () => handleNumberInput('0'), styles.zeroButton),
        renderButton('.', inputDecimal),
        renderButton('=', handleEqual, styles.equalButton, styles.equalButtonText)
      )
    )
  );
}


### New Component
**Widget URL**: `display/fitness/steps/light?with_progress=yes&params=goal:integer,current:integer,unit:caption`
**Parameters**: `{"goal":10000,"current":0,"unit":"steps"}`
- **Status**: ✅ Success
- **Duration**: 11.6s


function Component({ goal, current, unit }) {
  const [progressAnim] = React.useState(new RN.Animated.Value(0));
  
  React.useEffect(() => {
    RN.Animated.timing(progressAnim, {
      toValue: Math.min(current / goal, 1),
      duration: 1000,
      useNativeDriver: false
    }).start();
  }, [current, goal]);

  const progressPercent = Math.min(Math.round((current / goal) * 100), 100);
  
  const styles = {
    container: {
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333'
    },
    progressContainer: {
      height: 8,
      backgroundColor: '#E5E7EB',
      borderRadius: 4,
      marginBottom: 12,
      overflow: 'hidden'
    },
    progressBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: '#3B82F6',
      borderRadius: 4
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    currentValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#111'
    },
    goalContainer: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    goalLabel: {
      fontSize: 14,
      color: '#6B7280',
      marginRight: 4
    },
    goalValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151'
    },
    unit: {
      fontSize: 14,
      color: '#6B7280',
      marginLeft: 4
    }
  };

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.View, { style: styles.header },
      React.createElement(RN.Text, { style: styles.title }, "Steps"),
      React.createElement(RN.Text, { style: styles.goalLabel }, `${progressPercent}%`)
    ),
    React.createElement(RN.View, { style: styles.progressContainer },
      React.createElement(RN.Animated.View, { 
        style: [
          styles.progressBar,
          { width: progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%']
          })}
        ]
      })
    ),
    React.createElement(RN.View, { style: styles.statsContainer },
      React.createElement(RN.Text, { style: styles.currentValue }, 
        current,
        React.createElement(RN.Text, { style: styles.unit }, ` ${unit}`)
      ),
      React.createElement(RN.View, { style: styles.goalContainer },
        React.createElement(RN.Text, { style: styles.goalLabel }, "Goal:"),
        React.createElement(RN.Text, { style: styles.goalValue }, `${goal} ${unit}`)
      )
    )
  );
}


### New Component
**Widget URL**: `input/todo/list/light?with_dates=yes&params=title:caption,items:object[],showDates:boolean`
**Parameters**: `{"title":"Today's Tasks","items":[],"showDates":true}`
- **Status**: ✅ Success
- **Duration**: 17.7s


function Component({ title, items, showDates }) {
  const [todoItems, setTodoItems] = React.useState(items || []);
  const [newTodoText, setNewTodoText] = React.useState('');

  const addTodoItem = () => {
    if (newTodoText.trim() === '') return;
    
    const newItem = {
      id: Date.now().toString(),
      text: newTodoText,
      completed: false,
      date: new Date().toISOString().split('T')[0]
    };
    
    setTodoItems([...todoItems, newItem]);
    setNewTodoText('');
  };

  const toggleTodoItem = (id) => {
    setTodoItems(todoItems.map(item => 
      item.id === id ? {...item, completed: !item.completed} : item
    ));
  };

  const deleteTodoItem = (id) => {
    setTodoItems(todoItems.filter(item => item.id !== id));
  };

  const styles = {
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#FFFFFF'
    },
    header: {
      marginBottom: 24
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333333',
      marginBottom: 8
    },
    inputContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      borderRadius: 8,
      overflow: 'hidden'
    },
    input: {
      flex: 1,
      padding: 12,
      fontSize: 16,
      color: '#333333'
    },
    addButton: {
      backgroundColor: '#4A90E2',
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center'
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '600'
    },
    todoList: {
      flex: 1
    },
    todoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0'
    },
    todoCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#4A90E2',
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center'
    },
    todoCheckboxChecked: {
      backgroundColor: '#4A90E2'
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold'
    },
    todoTextContainer: {
      flex: 1
    },
    todoText: {
      fontSize: 16,
      color: '#333333'
    },
    todoTextCompleted: {
      textDecorationLine: 'line-through',
      color: '#888888'
    },
    todoDate: {
      fontSize: 12,
      color: '#888888',
      marginTop: 4
    },
    deleteButton: {
      padding: 8
    },
    deleteButtonText: {
      color: '#FF3B30',
      fontSize: 16,
      fontWeight: '600'
    },
    emptyList: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24
    },
    emptyListText: {
      fontSize: 16,
      color: '#888888',
      textAlign: 'center'
    }
  };

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.View, { style: styles.header },
      React.createElement(RN.Text, { style: styles.title }, title || "Todo List")
    ),
    
    React.createElement(RN.View, { style: styles.inputContainer },
      React.createElement(RN.TextInput, {
        style: styles.input,
        placeholder: "Add a new task...",
        value: newTodoText,
        onChangeText: setNewTodoText,
        onSubmitEditing: addTodoItem
      }),
      React.createElement(RN.TouchableOpacity, { 
        style: styles.addButton,
        onPress: addTodoItem
      },
        React.createElement(RN.Text, { style: styles.addButtonText }, "Add")
      )
    ),
    
    React.createElement(RN.ScrollView, { style: styles.todoList },
      todoItems.length === 0 ?
        React.createElement(RN.View, { style: styles.emptyList },
          React.createElement(RN.Text, { style: styles.emptyListText }, "No tasks yet. Add a new task to get started!")
        ) :
        todoItems.map(item => 
          React.createElement(RN.View, { key: item.id, style: styles.todoItem },
            React.createElement(RN.TouchableOpacity, { 
              style: [styles.todoCheckbox, item.completed && styles.todoCheckboxChecked],
              onPress: () => toggleTodoItem(item.id)
            },
              item.completed && React.createElement(RN.Text, { style: styles.checkmark }, "✓")
            ),
            React.createElement(RN.View, { style: styles.todoTextContainer },
              React.createElement(RN.Text, { 
                style: [styles.todoText, item.completed && styles.todoTextCompleted]
              }, item.text),
              (showDates && item.date) && React.createElement(RN.Text, { style: styles.todoDate }, item.date)
            ),
            React.createElement(RN.TouchableOpacity, { 
              style: styles.deleteButton,
              onPress: () => deleteTodoItem(item.id)
            },
              React.createElement(RN.Text, { style: styles.deleteButtonText }, "×")
            )
          )
        )
    )
  );
}


### New Component
**Widget URL**: `test/error/render/light?params=triggerError:boolean`
**Parameters**: `{"triggerError":true}`
- **Status**: ✅ Success
- **Duration**: 7.5s


function Component({ triggerError }) {
  const [error, setError] = React.useState(null);
  
  React.useEffect(() => {
    if (triggerError) {
      setError(new Error("This is a simulated render error"));
    }
  }, [triggerError]);

  if (error) {
    // This will intentionally cause a render error
    throw error;
  }

  const styles = {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: '#f8f9fa'
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center'
    },
    description: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 30,
      color: '#555'
    },
    button: {
      backgroundColor: '#dc3545',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold'
    },
    status: {
      marginTop: 20,
      fontSize: 14,
      color: triggerError ? '#dc3545' : '#28a745'
    }
  };

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.Text, { style: styles.title }, "Error Testing Component"),
    React.createElement(RN.Text, { style: styles.description }, 
      "This component can simulate a render error when triggered."
    ),
    React.createElement(RN.TouchableOpacity, {
      style: styles.button,
      onPress: () => setError(new Error("Manually triggered render error"))
    },
      React.createElement(RN.Text, { style: styles.buttonText }, "Trigger Error Now")
    ),
    React.createElement(RN.Text, { style: styles.status }, 
      triggerError ? "Error mode is ON" : "Error mode is OFF"
    )
  );
}


### New Component
**Widget URL**: `test/error/useErrorBoundaryHook/light?params=throwError:boolean,delay:integer`
**Parameters**: `{"throwError":true,"delay":1000}`
- **Status**: ✅ Success
- **Duration**: 15.4s


function Component({ throwError, delay }) {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [countdown, setCountdown] = React.useState(delay || 3);
  const throwErrorFn = useErrorBoundary();
  
  React.useEffect(() => {
    let timer;
    let countdownTimer;
    
    if (throwError && !hasError && !isLoading) {
      setIsLoading(true);
      
      // Start countdown
      setCountdown(delay || 3);
      countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Throw error after delay
      timer = setTimeout(() => {
        throwErrorFn(new Error("This is a test error thrown by the error boundary test component"));
        setHasError(true);
        setIsLoading(false);
      }, (delay || 3) * 1000);
    }
    
    return () => {
      clearTimeout(timer);
      clearInterval(countdownTimer);
    };
  }, [throwError, delay, hasError, isLoading]);
  
  const styles = {
    container: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8f9fa'
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center'
    },
    description: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 30,
      lineHeight: 24,
      color: '#4a5568'
    },
    button: {
      backgroundColor: throwError ? '#ef4444' : '#3b82f6',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginVertical: 10,
      width: 250,
      alignItems: 'center'
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600'
    },
    loadingText: {
      marginTop: 20,
      fontSize: 18,
      color: '#ef4444',
      fontWeight: '600'
    },
    countdownContainer: {
      marginTop: 20,
      alignItems: 'center'
    },
    countdownText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ef4444'
    },
    countdownLabel: {
      fontSize: 14,
      color: '#4a5568',
      marginTop: 5
    },
    infoContainer: {
      marginTop: 30,
      padding: 15,
      backgroundColor: '#e2e8f0',
      borderRadius: 8,
      width: '100%'
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8
    },
    infoText: {
      fontSize: 14,
      color: '#4a5568',
      lineHeight: 20
    }
  };
  
  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.Text, { style: styles.title }, "Error Boundary Test Component"),
    
    React.createElement(RN.Text, { style: styles.description }, 
      "This component tests the error boundary by intentionally throwing an error " + 
      (delay ? `after a ${delay} second delay.` : "after a short delay.")
    ),
    
    React.createElement(RN.TouchableOpacity, {
      style: styles.button,
      onPress: () => {
        if (throwError) {
          setHasError(false);
        } else {
          throwErrorFn(new Error("Immediate error thrown from button press"));
        }
      },
      disabled: throwError && isLoading
    },
      React.createElement(RN.Text, { style: styles.buttonText }, 
        throwError ? "Reset Error State" : "Throw Error Immediately"
      )
    ),
    
    isLoading && React.createElement(RN.View, { style: styles.countdownContainer },
      React.createElement(RN.Text, { style: styles.countdownText }, countdown),
      React.createElement(RN.Text, { style: styles.countdownLabel }, "seconds until error")
    ),
    
    React.createElement(RN.View, { style: styles.infoContainer },
      React.createElement(RN.Text, { style: styles.infoTitle }, "About Error Boundaries"),
      React.createElement(RN.Text, { style: styles.infoText }, 
        "Error boundaries are React components that catch JavaScript errors in their child component tree, " +
        "log those errors, and display a fallback UI instead of the component tree that crashed."
      )
    )
  );
}
