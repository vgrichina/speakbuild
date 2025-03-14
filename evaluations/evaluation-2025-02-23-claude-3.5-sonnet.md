# Component Generation Evaluation Results

## Summary
- **Model**: anthropic/claude-3.5-sonnet
- **Date**: 2025-02-23T21:52:47.777Z
- **Success Rate**: 100.0%
- **Average Generation Time**: 11.3s per component
- **Total Duration**: 113.3s

## Test Cases


### New Component
**Widget URL**: `display/clock/digital/light?params=format:caption,size:integer`
**Parameters**: `{"format":"HH:mm","size":48}`
- **Status**: ✅ Success
- **Duration**: 9.5s


function Component({format, size}) {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const styles = {
    container: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF'
    },
    timeText: {
      fontSize: size || 48,
      fontWeight: '600',
      color: '#000000',
      fontFamily: RN.Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
      letterSpacing: 2
    },
    caption: {
      fontSize: size ? size/3 : 16,
      color: '#666666',
      marginTop: 8
    }
  };

  const formatTime = (date) => {
    if (format === '24h') {
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return React.createElement(RN.View, {style: styles.container},
    React.createElement(RN.Text, {style: styles.timeText},
      formatTime(time)
    ),
    format === 'caption' && React.createElement(RN.Text, {style: styles.caption},
      time.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    )
  );
}


### New Component
**Widget URL**: `interactive/timer/countdown/light?with_controls=yes&params=duration:integer,size:integer,showControls:boolean`
**Parameters**: `{"duration":180,"size":48,"showControls":true}`
- **Status**: ✅ Success
- **Duration**: 10.5s


function Component({ duration, size, showControls }) {
  const [timeLeft, setTimeLeft] = React.useState(duration);
  const [isActive, setIsActive] = React.useState(false);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            clearInterval(timerRef.current);
            setIsActive(false);
            Expo.Haptics.notificationAsync(Expo.Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => setIsActive(true);
  const pauseTimer = () => setIsActive(false);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(duration);
  };

  const styles = {
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
    },
    timeText: {
      fontSize: size || 48,
      fontWeight: 'bold',
      color: '#333333',
      marginBottom: 20,
    },
    controlsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
    },
    button: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: '#e0e0e0',
      minWidth: 100,
    },
    buttonText: {
      fontSize: 16,
      textAlign: 'center',
      color: '#333333',
    },
    activeButton: {
      backgroundColor: '#4CAF50',
    },
    activeButtonText: {
      color: '#ffffff',
    }
  };

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.Text, { style: styles.timeText }, 
      formatTime(timeLeft)
    ),
    showControls && React.createElement(RN.View, { style: styles.controlsContainer },
      React.createElement(RN.TouchableOpacity, {
        style: [styles.button, isActive && styles.activeButton],
        onPress: isActive ? pauseTimer : startTimer
      },
        React.createElement(RN.Text, {
          style: [styles.buttonText, isActive && styles.activeButtonText]
        }, isActive ? 'Pause' : 'Start')
      ),
      React.createElement(RN.TouchableOpacity, {
        style: styles.button,
        onPress: resetTimer
      },
        React.createElement(RN.Text, { style: styles.buttonText }, 
          'Reset'
        )
      )
    )
  );
}


### New Component
**Widget URL**: `input/list/editable/light?with_checkboxes=yes&params=title:caption,items:caption[],enableChecks:boolean`
**Parameters**: `{"title":"Shopping List","items":["Milk","Eggs"],"enableChecks":true}`
- **Status**: ✅ Success
- **Duration**: 8.5s


function Component({ title, items, enableChecks }) {
  const [listItems, setListItems] = React.useState(items.map(item => ({
    text: item,
    checked: false
  })));

  const styles = {
    container: {
      flex: 1,
      backgroundColor: '#fff',
      padding: 16
    },
    header: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#000'
    },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#eee'
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: '#666',
      borderRadius: 4,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center'
    },
    checked: {
      backgroundColor: '#666'
    },
    checkmark: {
      color: '#fff',
      fontSize: 16
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: '#000',
      padding: 0
    }
  };

  const updateItemText = (index, newText) => {
    const newItems = [...listItems];
    newItems[index].text = newText;
    setListItems(newItems);
  };

  const toggleCheck = (index) => {
    if (!enableChecks) return;
    const newItems = [...listItems];
    newItems[index].checked = !newItems[index].checked;
    setListItems(newItems);
    Expo.Haptics.selectionAsync();
  };

  return React.createElement(RN.View, {
    style: styles.container
  },
    React.createElement(RN.Text, {
      style: styles.header
    }, title),
    React.createElement(RN.ScrollView, null,
      listItems.map((item, index) => 
        React.createElement(RN.View, {
          key: index,
          style: styles.itemContainer
        },
          enableChecks && React.createElement(RN.TouchableOpacity, {
            style: [styles.checkbox, item.checked && styles.checked],
            onPress: () => toggleCheck(index)
          },
            item.checked && React.createElement(RN.Text, {
              style: styles.checkmark
            }, "✓")
          ),
          React.createElement(RN.TextInput, {
            style: styles.input,
            value: item.text,
            onChangeText: (text) => updateItemText(index, text),
            placeholder: "Enter text",
            placeholderTextColor: "#999"
          })
        )
      )
    )
  );
}


### New Component
**Widget URL**: `display/weather/forecast/light?with_daily=yes&params=location:caption,unit:caption,date:string,days:integer`
**Parameters**: `{"location":"current","unit":"celsius","date":"2024-02-06","days":7}`
- **Status**: ✅ Success
- **Duration**: 12.6s


function Component({ location, unit, date, days }) {
  const [forecast, setForecast] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // Simulated weather data fetch
    const mockWeatherData = {
      daily: Array.from({length: days}, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        temp: Math.round(15 + Math.random() * 15),
        condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
      }))
    };

    setTimeout(() => {
      setForecast(mockWeatherData);
      setLoading(false);
    }, 1000);

    return () => {
      setForecast(null);
      setLoading(true);
    };
  }, [location, days]);

  const styles = {
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#fff'
    },
    header: {
      marginBottom: 20
    },
    location: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1f2937'
    },
    date: {
      fontSize: 16,
      color: '#6b7280',
      marginTop: 4
    },
    forecastContainer: {
      flex: 1
    },
    dayContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb'
    },
    dayText: {
      fontSize: 16,
      color: '#374151'
    },
    temperature: {
      fontSize: 16,
      fontWeight: '500',
      color: '#1f2937'
    },
    condition: {
      fontSize: 14,
      color: '#6b7280'
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    loadingText: {
      fontSize: 16,
      color: '#6b7280'
    },
    error: {
      color: '#ef4444',
      textAlign: 'center',
      marginTop: 20
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return React.createElement(RN.View, { style: styles.loading },
      React.createElement(RN.Text, { style: styles.loadingText }, "Loading forecast...")
    );
  }

  if (error) {
    return React.createElement(RN.View, { style: styles.container },
      React.createElement(RN.Text, { style: styles.error }, error)
    );
  }

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.View, { style: styles.header },
      React.createElement(RN.Text, { style: styles.location }, location),
      React.createElement(RN.Text, { style: styles.date }, date)
    ),
    React.createElement(RN.ScrollView, { style: styles.forecastContainer },
      forecast.daily.map((day, index) => 
        React.createElement(RN.View, {
          key: index,
          style: styles.dayContainer
        },
          React.createElement(RN.Text, { style: styles.dayText },
            formatDate(day.date)
          ),
          React.createElement(RN.View, { 
            style: { alignItems: 'flex-end' }
          },
            React.createElement(RN.Text, { style: styles.temperature },
              `${day.temp}°${unit}`
            ),
            React.createElement(RN.Text, { style: styles.condition },
              day.condition
            )
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
- **Duration**: 14.0s


function Component({title, content, timestamp}) {
  const [text, setText] = React.useState(content || '');
  const [showTimestamp, setShowTimestamp] = React.useState(timestamp);
  const [currentTime, setCurrentTime] = React.useState(new Date().toLocaleString());

  React.useEffect(() => {
    let timer;
    if (showTimestamp) {
      timer = setInterval(() => {
        setCurrentTime(new Date().toLocaleString());
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showTimestamp]);

  const styles = {
    container: {
      padding: 16,
      backgroundColor: '#fff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      color: '#1f2937'
    },
    input: {
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRadius: 6,
      padding: 12,
      fontSize: 16,
      color: '#374151',
      minHeight: 100,
      textAlignVertical: 'top'
    },
    timestamp: {
      marginTop: 8,
      fontSize: 12,
      color: '#6b7280',
      fontStyle: 'italic'
    },
    toggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12
    },
    toggleText: {
      fontSize: 14,
      color: '#4b5563',
      marginLeft: 8
    }
  };

  return React.createElement(RN.View, {style: styles.container},
    React.createElement(RN.Text, {style: styles.title}, title),
    React.createElement(RN.TextInput, {
      style: styles.input,
      value: text,
      onChangeText: setText,
      multiline: true,
      placeholder: 'Enter your note here...',
      placeholderTextColor: '#9ca3af'
    }),
    React.createElement(RN.View, {style: styles.toggleContainer},
      React.createElement(RN.TouchableOpacity, {
        onPress: () => {
          setShowTimestamp(!showTimestamp);
          Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
        }
      },
        React.createElement(RN.Text, {style: styles.toggleText},
          `${showTimestamp ? 'Hide' : 'Show'} Timestamp`
        )
      )
    ),
    showTimestamp && React.createElement(RN.Text, {style: styles.timestamp},
      `Last updated: ${currentTime}`
    )
  );
}


### New Component
**Widget URL**: `interactive/calculator/basic/light?params=theme:caption,showHistory:boolean,precision:integer`
**Parameters**: `{"theme":"default","showHistory":true,"precision":2}`
- **Status**: ✅ Success
- **Duration**: 26.8s


function Component({ theme, showHistory, precision }) {
  const [display, setDisplay] = React.useState('0');
  const [history, setHistory] = React.useState([]);
  const [currentOperation, setCurrentOperation] = React.useState(null);
  const [previousNumber, setPreviousNumber] = React.useState(null);

  const styles = {
    container: {
      flex: 1,
      backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
      padding: 16
    },
    display: {
      backgroundColor: theme === 'dark' ? '#374151' : '#F3F4F6',
      padding: 20,
      borderRadius: 8,
      marginBottom: 16
    },
    displayText: {
      fontSize: 36,
      textAlign: 'right',
      color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
    },
    buttonsContainer: {
      flex: 1
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12
    },
    button: {
      flex: 1,
      margin: 4,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme === 'dark' ? '#374151' : '#F3F4F6'
    },
    operatorButton: {
      backgroundColor: '#3B82F6'
    },
    buttonText: {
      fontSize: 24,
      color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
    },
    operatorButtonText: {
      color: '#FFFFFF'
    },
    history: {
      maxHeight: 120,
      marginBottom: 16
    },
    historyItem: {
      padding: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme === 'dark' ? '#374151' : '#E5E7EB'
    },
    historyText: {
      color: theme === 'dark' ? '#9CA3AF' : '#6B7280',
      fontSize: 16
    }
  };

  const calculate = (a, b, operation) => {
    let result;
    switch(operation) {
      case '+':
        result = a + b;
        break;
      case '-':
        result = a - b;
        break;
      case '×':
        result = a * b;
        break;
      case '÷':
        result = a / b;
        break;
      default:
        return b;
    }
    return Number(result.toFixed(precision));
  };

  const handleNumber = (num) => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
    setDisplay(display === '0' ? String(num) : display + num);
  };

  const handleOperation = (operation) => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Medium);
    const current = parseFloat(display);
    
    if (previousNumber !== null) {
      const result = calculate(previousNumber, current, currentOperation);
      setDisplay(String(result));
      if (showHistory) {
        setHistory([`${previousNumber} ${currentOperation} ${current} = ${result}`, ...history]);
      }
      setPreviousNumber(operation === '=' ? null : result);
    } else {
      setPreviousNumber(current);
    }
    
    setCurrentOperation(operation === '=' ? null : operation);
    if (operation !== '=') {
      setDisplay('0');
    }
  };

  const clear = () => {
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Heavy);
    setDisplay('0');
    setPreviousNumber(null);
    setCurrentOperation(null);
  };

  const renderButton = (text, handler, isOperator) => {
    return React.createElement(RN.TouchableOpacity, {
      style: [styles.button, isOperator && styles.operatorButton],
      onPress: handler
    },
      React.createElement(RN.Text, {
        style: [styles.buttonText, isOperator && styles.operatorButtonText]
      }, text)
    );
  };

  return React.createElement(RN.View, { style: styles.container },
    showHistory && React.createElement(RN.ScrollView, { style: styles.history },
      history.map((item, index) => 
        React.createElement(RN.View, { 
          key: index,
          style: styles.historyItem
        },
          React.createElement(RN.Text, { style: styles.historyText }, item)
        )
      )
    ),
    React.createElement(RN.View, { style: styles.display },
      React.createElement(RN.Text, { style: styles.displayText }, display)
    ),
    React.createElement(RN.View, { style: styles.buttonsContainer },
      React.createElement(RN.View, { style: styles.row },
        renderButton('C', clear, true),
        renderButton('±', () => setDisplay(String(parseFloat(display) * -1)), true),
        renderButton('%', () => setDisplay(String(parseFloat(display) / 100)), true),
        renderButton('÷', () => handleOperation('÷'), true)
      ),
      React.createElement(RN.View, { style: styles.row },
        renderButton('7', () => handleNumber(7)),
        renderButton('8', () => handleNumber(8)),
        renderButton('9', () => handleNumber(9)),
        renderButton('×', () => handleOperation('×'), true)
      ),
      React.createElement(RN.View, { style: styles.row },
        renderButton('4', () => handleNumber(4)),
        renderButton('5', () => handleNumber(5)),
        renderButton('6', () => handleNumber(6)),
        renderButton('-', () => handleOperation('-'), true)
      ),
      React.createElement(RN.View, { style: styles.row },
        renderButton('1', () => handleNumber(1)),
        renderButton('2', () => handleNumber(2)),
        renderButton('3', () => handleNumber(3)),
        renderButton('+', () => handleOperation('+'), true)
      ),
      React.createElement(RN.View, { style: styles.row },
        renderButton('0', () => handleNumber(0)),
        renderButton('.', () => {
          if (!display.includes('.')) {
            setDisplay(display + '.');
          }
        }),
        renderButton('⌫', () => setDisplay(display.slice(0, -1) || '0')),
        renderButton('=', () => handleOperation('='), true)
      )
    )
  );
}


### New Component
**Widget URL**: `display/fitness/steps/light?with_progress=yes&params=goal:integer,current:integer,unit:caption`
**Parameters**: `{"goal":10000,"current":0,"unit":"steps"}`
- **Status**: ✅ Success
- **Duration**: 7.6s


function Component({goal, current, unit}) {
  const progress = Math.min((current / goal) * 100, 100);
  
  const styles = {
    container: {
      backgroundColor: '#ffffff',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    },
    title: {
      fontSize: 16,
      color: '#666',
      fontWeight: '500'
    },
    numbers: {
      flexDirection: 'row',
      alignItems: 'baseline'
    },
    current: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#000'
    },
    goal: {
      fontSize: 16,
      color: '#666',
      marginLeft: 8
    },
    progressContainer: {
      height: 4,
      backgroundColor: '#f0f0f0',
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 8
    },
    progressBar: {
      height: '100%',
      width: `${progress}%`,
      backgroundColor: '#4CAF50',
      borderRadius: 2
    },
    unit: {
      fontSize: 14,
      color: '#666',
      marginTop: 8
    }
  };

  return React.createElement(RN.View, {style: styles.container},
    React.createElement(RN.View, {style: styles.header},
      React.createElement(RN.Text, {style: styles.title}, "Steps"),
      React.createElement(RN.View, {style: styles.numbers},
        React.createElement(RN.Text, {style: styles.current}, current),
        React.createElement(RN.Text, {style: styles.goal}, 
          " / " + goal)
      )
    ),
    React.createElement(RN.View, {style: styles.progressContainer},
      React.createElement(RN.View, {style: styles.progressBar})
    ),
    React.createElement(RN.Text, {style: styles.unit}, unit)
  );
}


### New Component
**Widget URL**: `input/todo/list/light?with_dates=yes&params=title:caption,items:object[],showDates:boolean`
**Parameters**: `{"title":"Today's Tasks","items":[],"showDates":true}`
- **Status**: ✅ Success
- **Duration**: 8.6s


function Component({ title, items, showDates }) {
  const [todoItems, setTodoItems] = React.useState(items || []);

  const styles = {
    container: {
      flex: 1,
      backgroundColor: '#fff',
      padding: 16
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#1f2937'
    },
    listContainer: {
      flex: 1
    },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5'
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderRadius: 4,
      borderColor: '#4b5563',
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center'
    },
    checked: {
      backgroundColor: '#4b5563'
    },
    checkmark: {
      color: '#fff',
      fontSize: 16
    },
    itemText: {
      flex: 1,
      fontSize: 16,
      color: '#374151'
    },
    dateText: {
      fontSize: 12,
      color: '#6b7280',
      marginLeft: 8
    },
    completedText: {
      textDecorationLine: 'line-through',
      color: '#9ca3af'
    }
  };

  const toggleItem = (index) => {
    const newItems = [...todoItems];
    newItems[index].completed = !newItems[index].completed;
    setTodoItems(newItems);
  };

  return React.createElement(RN.View, {
    style: styles.container
  },
    React.createElement(RN.Text, {
      style: styles.header
    }, title),
    React.createElement(RN.ScrollView, {
      style: styles.listContainer
    },
      todoItems.map((item, index) => 
        React.createElement(RN.View, {
          key: index,
          style: styles.itemContainer
        },
          React.createElement(RN.TouchableOpacity, {
            style: [styles.checkbox, item.completed && styles.checked],
            onPress: () => toggleItem(index)
          },
            item.completed && React.createElement(RN.Text, {
              style: styles.checkmark
            }, "✓")
          ),
          React.createElement(RN.Text, {
            style: [
              styles.itemText,
              item.completed && styles.completedText
            ]
          }, item.text),
          showDates && item.date && React.createElement(RN.Text, {
            style: styles.dateText
          }, new Date(item.date).toLocaleDateString())
        )
      )
    )
  );
}


### New Component
**Widget URL**: `test/error/render/light?params=triggerError:boolean`
**Parameters**: `{"triggerError":true}`
- **Status**: ✅ Success
- **Duration**: 8.9s


function Component({ triggerError }) {
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (triggerError) {
      setError(new Error('Triggered error state'));
    }
  }, [triggerError]);

  const styles = {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: '#fff'
    },
    errorContainer: {
      backgroundColor: '#FEE2E2',
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#EF4444',
      marginBottom: 16
    },
    errorText: {
      color: '#DC2626',
      fontSize: 16,
      textAlign: 'center'
    },
    button: {
      backgroundColor: '#EF4444',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 6
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600'
    }
  };

  if (error) {
    return React.createElement(RN.View, { style: styles.container },
      React.createElement(RN.View, { style: styles.errorContainer },
        React.createElement(RN.Text, { style: styles.errorText },
          error.message
        )
      ),
      React.createElement(RN.TouchableOpacity, {
        style: styles.button,
        onPress: () => setError(null)
      },
        React.createElement(RN.Text, { style: styles.buttonText },
          "Reset Error"
        )
      )
    );
  }

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.TouchableOpacity, {
      style: styles.button,
      onPress: () => setError(new Error('Manual error trigger'))
    },
      React.createElement(RN.Text, { style: styles.buttonText },
        "Trigger Error"
      )
    )
  );
}


### New Component
**Widget URL**: `test/error/useErrorBoundaryHook/light?params=throwError:boolean,delay:integer`
**Parameters**: `{"throwError":true,"delay":1000}`
- **Status**: ✅ Success
- **Duration**: 6.1s


function Component({throwError, delay}) {
  const [error, setError] = React.useState(null);
  const errorBoundary = useErrorBoundary();

  React.useEffect(() => {
    let timeoutId;
    
    if (throwError) {
      timeoutId = setTimeout(() => {
        errorBoundary(new Error('Test error thrown after delay'));
      }, delay || 1000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [throwError, delay, errorBoundary]);

  const styles = {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20
    },
    button: {
      backgroundColor: '#EF4444',
      padding: 15,
      borderRadius: 8,
      minWidth: 200
    },
    buttonText: {
      color: 'white',
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600'
    },
    status: {
      marginTop: 20,
      fontSize: 16,
      color: '#374151'
    }
  };

  return React.createElement(RN.View, {
    style: styles.container
  },
    React.createElement(RN.TouchableOpacity, {
      style: styles.button,
      onPress: () => errorBoundary(new Error('Manual error triggered'))
    },
      React.createElement(RN.Text, {
        style: styles.buttonText
      }, "Throw Error Now")
    ),
    React.createElement(RN.Text, {
      style: styles.status
    }, throwError ? `Error will be thrown in ${delay || 1000}ms` : 'No error scheduled')
  );
}
