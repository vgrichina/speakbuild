# Component Generation Evaluation Results

## Summary
- **Model**: anthropic/claude-3.5-sonnet
- **Date**: 2025-02-12T00:01:14.201Z
- **Success Rate**: 100.0%
- **Average Generation Time**: 13.9s per component
- **Total Duration**: 138.9s

## Test Cases


### New Component
**Widget URL**: `display/clock/digital/light?params=format:caption,size:integer`
**Parameters**: `{"format":"HH:mm","size":48}`
- **Status**: ✅ Success
- **Duration**: 7.9s


function Component({format, size}) {
  const [time, setTime] = React.useState('');
  
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let timeString = '';
      
      if (format === '12h') {
        timeString = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      } else {
        timeString = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit', 
          second: '2-digit',
          hour12: false
        });
      }
      
      setTime(timeString);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    
    return () => clearInterval(timer);
  }, [format]);

  const styles = {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFFFFF'
    },
    timeText: {
      fontSize: size || 48,
      fontWeight: 'bold',
      color: '#000000',
      fontVariant: ['tabular-nums']
    }
  };

  return React.createElement(RN.View, {style: styles.container},
    React.createElement(RN.Text, {style: styles.timeText}, time)
  );
}


### New Component
**Widget URL**: `interactive/timer/countdown/light?with_controls=yes&params=duration:integer,size:integer,showControls:boolean`
**Parameters**: `{"duration":180,"size":48,"showControls":true}`
- **Status**: ✅ Success
- **Duration**: 14.8s


function Component({duration, size, showControls}) {
  const [timeLeft, setTimeLeft] = React.useState(duration);
  const [isRunning, setIsRunning] = React.useState(false);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsRunning(false);
            Expo.Haptics.notificationAsync(
              Expo.Haptics.NotificationFeedbackType.Success
            );
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
  }, [isRunning, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const styles = {
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff'
    },
    timerText: {
      fontSize: size || 48,
      fontWeight: 'bold',
      color: '#333333'
    },
    controlsContainer: {
      flexDirection: 'row',
      marginTop: 20,
    },
    button: {
      backgroundColor: '#4B5563',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      marginHorizontal: 10
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16
    },
    resetButton: {
      backgroundColor: '#EF4444'
    }
  };

  return React.createElement(RN.View, {style: styles.container},
    React.createElement(RN.Text, {style: styles.timerText},
      formatTime(timeLeft)
    ),
    showControls && React.createElement(RN.View, {style: styles.controlsContainer},
      React.createElement(RN.TouchableOpacity, {
        style: styles.button,
        onPress: () => setIsRunning(!isRunning)
      },
        React.createElement(RN.Text, {style: styles.buttonText},
          isRunning ? 'Pause' : 'Start'
        )
      ),
      React.createElement(RN.TouchableOpacity, {
        style: [styles.button, styles.resetButton],
        onPress: () => {
          setIsRunning(false);
          setTimeLeft(duration);
        }
      },
        React.createElement(RN.Text, {style: styles.buttonText},
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
- **Duration**: 9.5s


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
      borderColor: '#000',
      borderRadius: 4,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: enableChecks ? 1 : 0.3
    },
    checked: {
      backgroundColor: '#000'
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

  const toggleCheck = (index) => {
    if (!enableChecks) return;
    
    setListItems(prev => prev.map((item, i) => 
      i === index ? {...item, checked: !item.checked} : item
    ));
  };

  const updateItemText = (text, index) => {
    setListItems(prev => prev.map((item, i) => 
      i === index ? {...item, text} : item
    ));
  };

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.Text, { style: styles.header }, title),
    React.createElement(RN.ScrollView, { style: styles.listContainer },
      listItems.map((item, index) => 
        React.createElement(RN.View, {
          key: index,
          style: styles.itemContainer
        },
          React.createElement(RN.TouchableOpacity, {
            style: [styles.checkbox, item.checked && styles.checked],
            onPress: () => toggleCheck(index),
            disabled: !enableChecks
          },
            item.checked && React.createElement(RN.Text, {
              style: styles.checkmark
            }, '✓')
          ),
          React.createElement(RN.TextInput, {
            style: styles.input,
            value: item.text,
            onChangeText: (text) => updateItemText(text, index),
            placeholder: 'Enter text',
            placeholderTextColor: '#999'
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
- **Duration**: 15.3s


function Component({ location, unit, date, days }) {
  const [forecast, setForecast] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate weather API call
    setTimeout(() => {
      setForecast([
        { day: 'Today', temp: '72°F', condition: 'Sunny' },
        { day: 'Tomorrow', temp: '68°F', condition: 'Partly Cloudy' },
        { day: 'Wednesday', temp: '65°F', condition: 'Rain' }
      ].slice(0, days));
      setLoading(false);
    }, 1000);
  }, [days]);

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
      marginBottom: 4
    },
    date: {
      fontSize: 16,
      color: '#666'
    },
    loadingText: {
      textAlign: 'center',
      fontSize: 16,
      color: '#666'
    },
    forecastContainer: {
      borderRadius: 12,
      backgroundColor: '#f5f5f5',
      padding: 16
    },
    forecastItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0'
    },
    day: {
      fontSize: 16,
      fontWeight: '500'
    },
    weather: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    temp: {
      fontSize: 16,
      marginRight: 8
    },
    condition: {
      fontSize: 14,
      color: '#666'
    }
  };

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.View, { style: styles.header },
      React.createElement(RN.Text, { style: styles.location }, location),
      React.createElement(RN.Text, { style: styles.date }, date)
    ),
    loading ? 
      React.createElement(RN.Text, { style: styles.loadingText }, "Loading forecast...") :
      React.createElement(RN.View, { style: styles.forecastContainer },
        forecast.map((day, index) => 
          React.createElement(RN.View, {
            key: index,
            style: [
              styles.forecastItem,
              index === forecast.length - 1 && { borderBottomWidth: 0 }
            ]
          },
            React.createElement(RN.Text, { style: styles.day }, day.day),
            React.createElement(RN.View, { style: styles.weather },
              React.createElement(RN.Text, { style: styles.temp }, 
                unit === 'C' ? 
                  `${Math.round((parseInt(day.temp) - 32) * 5/9)}°C` :
                  day.temp
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
- **Duration**: 8.5s


function Component({title, content, timestamp}) {
  const [text, setText] = React.useState(content || '');
  const [lastEdit, setLastEdit] = React.useState(timestamp ? new Date().toLocaleString() : null);

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
    titleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1f2937'
    },
    input: {
      fontSize: 16,
      color: '#374151',
      minHeight: 100,
      textAlignVertical: 'top',
      padding: 12,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRadius: 6,
      backgroundColor: '#f9fafb'
    },
    timestamp: {
      fontSize: 12,
      color: '#6b7280',
      marginTop: 8,
      textAlign: 'right'
    }
  };

  return React.createElement(RN.View, {style: styles.container},
    React.createElement(RN.View, {style: styles.titleContainer},
      React.createElement(RN.Text, {style: styles.title}, title)
    ),
    React.createElement(RN.TextInput, {
      style: styles.input,
      value: text,
      onChangeText: (newText) => {
        setText(newText);
        if (timestamp) {
          setLastEdit(new Date().toLocaleString());
        }
      },
      multiline: true,
      placeholder: 'Enter your note here...',
      placeholderTextColor: '#9ca3af'
    }),
    timestamp && lastEdit && React.createElement(RN.Text, {style: styles.timestamp},
      `Last edited: ${lastEdit}`
    )
  );
}


### New Component
**Widget URL**: `interactive/calculator/basic/light?params=theme:caption,showHistory:boolean,precision:integer`
**Parameters**: `{"theme":"default","showHistory":true,"precision":2}`
- **Status**: ✅ Success
- **Duration**: 37.3s


function Component({ theme, showHistory, precision }) {
  const [display, setDisplay] = React.useState('0');
  const [history, setHistory] = React.useState([]);
  const [currentOp, setCurrentOp] = React.useState(null);
  const [prevValue, setPrevValue] = React.useState(null);

  const styles = {
    container: {
      flex: 1,
      backgroundColor: theme === 'dark' ? '#1F2937' : '#F9FAFB',
      padding: 16
    },
    display: {
      backgroundColor: theme === 'dark' ? '#374151' : '#FFFFFF',
      padding: 20,
      borderRadius: 8,
      marginBottom: 16
    },
    displayText: {
      fontSize: 36,
      textAlign: 'right',
      color: theme === 'dark' ? '#FFFFFF' : '#111827'
    },
    buttonsContainer: {
      flex: 1,
      gap: 8
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8
    },
    button: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme === 'dark' ? '#374151' : '#FFFFFF'
    },
    buttonText: {
      fontSize: 24,
      color: theme === 'dark' ? '#FFFFFF' : '#111827'
    },
    operatorButton: {
      backgroundColor: '#3B82F6'
    },
    operatorText: {
      color: '#FFFFFF'
    },
    historyContainer: {
      maxHeight: 100,
      marginBottom: 16
    },
    historyText: {
      color: theme === 'dark' ? '#9CA3AF' : '#6B7280',
      fontSize: 16,
      marginBottom: 4
    }
  };

  const handleNumber = (num) => {
    setDisplay(prev => prev === '0' ? num.toString() : prev + num);
  };

  const handleOperator = (op) => {
    if (prevValue === null) {
      setPrevValue(parseFloat(display));
      setDisplay('0');
      setCurrentOp(op);
    } else {
      calculate();
      setCurrentOp(op);
    }
  };

  const calculate = () => {
    const current = parseFloat(display);
    let result = 0;

    switch(currentOp) {
      case '+':
        result = prevValue + current;
        break;
      case '-':
        result = prevValue - current;
        break;
      case '*':
        result = prevValue * current;
        break;
      case '/':
        result = prevValue / current;
        break;
    }

    result = Number(result.toFixed(precision));
    
    if (showHistory) {
      setHistory(prev => [...prev, `${prevValue} ${currentOp} ${current} = ${result}`]);
    }

    setDisplay(result.toString());
    setPrevValue(null);
    setCurrentOp(null);
  };

  const clear = () => {
    setDisplay('0');
    setPrevValue(null);
    setCurrentOp(null);
  };

  return React.createElement(RN.View, { style: styles.container },
    showHistory && React.createElement(RN.ScrollView, { style: styles.historyContainer },
      history.map((item, index) => 
        React.createElement(RN.Text, { 
          key: index,
          style: styles.historyText 
        }, item)
      )
    ),
    React.createElement(RN.View, { style: styles.display },
      React.createElement(RN.Text, { style: styles.displayText }, display)
    ),
    React.createElement(RN.View, { style: styles.buttonsContainer },
      React.createElement(RN.View, { style: styles.buttonRow },
        ['7', '8', '9', '/'].map(btn => 
          React.createElement(RN.TouchableOpacity, {
            key: btn,
            style: [styles.button, btn === '/' && styles.operatorButton],
            onPress: () => btn === '/' ? handleOperator(btn) : handleNumber(btn)
          },
            React.createElement(RN.Text, { 
              style: [styles.buttonText, btn === '/' && styles.operatorText]
            }, btn)
          )
        )
      ),
      React.createElement(RN.View, { style: styles.buttonRow },
        ['4', '5', '6', '*'].map(btn => 
          React.createElement(RN.TouchableOpacity, {
            key: btn,
            style: [styles.button, btn === '*' && styles.operatorButton],
            onPress: () => btn === '*' ? handleOperator(btn) : handleNumber(btn)
          },
            React.createElement(RN.Text, { 
              style: [styles.buttonText, btn === '*' && styles.operatorText]
            }, btn)
          )
        )
      ),
      React.createElement(RN.View, { style: styles.buttonRow },
        ['1', '2', '3', '-'].map(btn => 
          React.createElement(RN.TouchableOpacity, {
            key: btn,
            style: [styles.button, btn === '-' && styles.operatorButton],
            onPress: () => btn === '-' ? handleOperator(btn) : handleNumber(btn)
          },
            React.createElement(RN.Text, { 
              style: [styles.buttonText, btn === '-' && styles.operatorText]
            }, btn)
          )
        )
      ),
      React.createElement(RN.View, { style: styles.buttonRow },
        ['0', '.', '=', '+'].map(btn => 
          React.createElement(RN.TouchableOpacity, {
            key: btn,
            style: [styles.button, (btn === '+' || btn === '=') && styles.operatorButton],
            onPress: () => {
              if (btn === '=') calculate();
              else if (btn === '+') handleOperator(btn);
              else handleNumber(btn);
            }
          },
            React.createElement(RN.Text, { 
              style: [styles.buttonText, (btn === '+' || btn === '=') && styles.operatorText]
            }, btn)
          )
        )
      ),
      React.createElement(RN.View, { style: styles.buttonRow },
        React.createElement(RN.TouchableOpacity, {
          style: [styles.button, { flex: 4 }],
          onPress: clear
        },
          React.createElement(RN.Text, { style: styles.buttonText }, 'Clear')
        )
      )
    )
  );
}


### New Component
**Widget URL**: `display/fitness/steps/light?with_progress=yes&params=goal:integer,current:integer,unit:caption`
**Parameters**: `{"goal":10000,"current":0,"unit":"steps"}`
- **Status**: ✅ Success
- **Duration**: 8.8s


function Component({goal, current, unit}) {
  const progressValue = Math.min(current / goal, 1);

  const styles = {
    container: {
      backgroundColor: '#FFFFFF',
      padding: 20,
      borderRadius: 12,
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
      marginBottom: 15
    },
    stepsText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#1F2937'
    },
    unitText: {
      fontSize: 16,
      color: '#6B7280'
    },
    progressContainer: {
      height: 8,
      backgroundColor: '#E5E7EB',
      borderRadius: 4,
      overflow: 'hidden'
    },
    progressBar: {
      height: '100%',
      width: `${progressValue * 100}%`,
      backgroundColor: '#3B82F6',
      borderRadius: 4
    },
    goalText: {
      marginTop: 8,
      fontSize: 14,
      color: '#6B7280',
      textAlign: 'right'
    }
  };

  return React.createElement(RN.View, {style: styles.container},
    React.createElement(RN.View, {style: styles.header},
      React.createElement(RN.Text, {style: styles.stepsText}, 
        current.toLocaleString()
      ),
      React.createElement(RN.Text, {style: styles.unitText},
        unit
      )
    ),
    React.createElement(RN.View, {style: styles.progressContainer},
      React.createElement(RN.View, {style: styles.progressBar})
    ),
    React.createElement(RN.Text, {style: styles.goalText},
      `Goal: ${goal.toLocaleString()} ${unit}`
    )
  );
}


### New Component
**Widget URL**: `input/todo/list/light?with_dates=yes&params=title:caption,items:object[],showDates:boolean`
**Parameters**: `{"title":"Today's Tasks","items":[],"showDates":true}`
- **Status**: ✅ Success
- **Duration**: 16.1s


function Component({ title, items, showDates }) {
  const [todoItems, setTodoItems] = React.useState(items);

  const styles = {
    container: {
      flex: 1,
      backgroundColor: '#ffffff',
      padding: 16
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#1f2937'
    },
    list: {
      flex: 1
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb'
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: '#9ca3af',
      borderRadius: 4,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center'
    },
    checked: {
      backgroundColor: '#4b5563'
    },
    checkmark: {
      color: '#ffffff',
      fontSize: 16
    },
    itemText: {
      flex: 1,
      fontSize: 16,
      color: '#1f2937'
    },
    date: {
      fontSize: 12,
      color: '#6b7280',
      marginLeft: 8
    },
    completed: {
      textDecorationLine: 'line-through',
      color: '#9ca3af'
    }
  };

  const toggleItem = (index) => {
    const newItems = [...todoItems];
    newItems[index].completed = !newItems[index].completed;
    setTodoItems(newItems);
    Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
  };

  return React.createElement(RN.View, {
    style: styles.container
  }, [
    React.createElement(RN.Text, {
      key: 'header',
      style: styles.header
    }, title),
    
    React.createElement(RN.ScrollView, {
      key: 'list',
      style: styles.list
    }, todoItems.map((item, index) => 
      React.createElement(RN.TouchableOpacity, {
        key: index,
        style: styles.item,
        onPress: () => toggleItem(index)
      }, [
        React.createElement(RN.View, {
          key: 'checkbox',
          style: [styles.checkbox, item.completed && styles.checked]
        }, item.completed && React.createElement(RN.Text, {
          style: styles.checkmark
        }, '✓')),
        
        React.createElement(RN.Text, {
          key: 'text',
          style: [styles.itemText, item.completed && styles.completed]
        }, item.text),
        
        showDates && item.date && React.createElement(RN.Text, {
          key: 'date',
          style: styles.date
        }, new Date(item.date).toLocaleDateString())
      ])
    ))
  ]);
}


### New Component
**Widget URL**: `test/error/render/light?params=triggerError:boolean`
**Parameters**: `{"triggerError":true}`
- **Status**: ✅ Success
- **Duration**: 11.1s


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
      width: '100%'
    },
    errorTitle: {
      color: '#DC2626',
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8
    },
    errorMessage: {
      color: '#7F1D1D',
      fontSize: 14,
      lineHeight: 20
    },
    button: {
      marginTop: 16,
      backgroundColor: '#DC2626',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 6
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center'
    }
  };

  if (error) {
    return React.createElement(RN.View, { style: styles.container },
      React.createElement(RN.View, { style: styles.errorContainer },
        React.createElement(RN.Text, { style: styles.errorTitle }, 
          'Error Occurred'
        ),
        React.createElement(RN.Text, { style: styles.errorMessage }, 
          error.message
        ),
        React.createElement(RN.TouchableOpacity, {
          style: styles.button,
          onPress: () => setError(null)
        },
          React.createElement(RN.Text, { style: styles.buttonText },
            'Reset Error'
          )
        )
      )
    );
  }

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.TouchableOpacity, {
      style: styles.button,
      onPress: () => setError(new Error('Manual error triggered'))
    },
      React.createElement(RN.Text, { style: styles.buttonText },
        'Trigger Error'
      )
    )
  );
}


### New Component
**Widget URL**: `test/error/useErrorBoundaryHook/light?params=throwError:boolean,delay:integer`
**Parameters**: `{"throwError":true,"delay":1000}`
- **Status**: ✅ Success
- **Duration**: 9.6s


function Component({throwError, delay}) {
  const [hasError, setHasError] = React.useState(false);
  const triggerError = useErrorBoundary();

  React.useEffect(() => {
    if (throwError) {
      const timer = setTimeout(() => {
        triggerError(new Error('Test error triggered after delay'));
      }, delay || 1000);

      return () => clearTimeout(timer);
    }
  }, [throwError, delay]);

  const styles = {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20
    },
    button: {
      backgroundColor: '#EF4444',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500'
    },
    text: {
      marginBottom: 20,
      fontSize: 16,
      textAlign: 'center',
      color: '#374151'
    }
  };

  return React.createElement(RN.View, {
    style: styles.container
  },
    React.createElement(RN.Text, {
      style: styles.text
    }, `Error will ${throwError ? '' : 'not '}trigger${throwError ? ` in ${delay}ms` : ''}`),
    
    React.createElement(RN.TouchableOpacity, {
      style: styles.button,
      onPress: () => triggerError(new Error('Manual error triggered'))
    },
      React.createElement(RN.Text, {
        style: styles.buttonText
      }, 'Trigger Error Manually')
    )
  );
}
