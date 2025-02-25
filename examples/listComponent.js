function Component({ title, items, size }) {
  const throwError = useErrorBoundary();
  
  const styles = {
    container: {
      flex: 1,
      padding: RN.Platform.OS === 'ios' ? 20 : 16
    },
    title: {
      fontSize: size || 24,
      fontWeight: 'bold',
      marginBottom: 16
    },
    list: {
      flex: 1
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderColor: '#e5e5e5'
    },
    itemText: {
      flex: 1,
      fontSize: 16
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: '#4B5563',
      borderRadius: 4,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center'
    },
    checked: {
      backgroundColor: '#4B5563'
    },
    time: {
      fontSize: 14,
      color: '#666'
    },
    errorButton: {
      backgroundColor: '#EF4444',
      padding: 8,
      borderRadius: 4,
      marginTop: 8
    },
    buttonText: {
      color: 'white',
      textAlign: 'center'
    }
  };

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.Text, { style: styles.title }, title),
    React.createElement(RN.ScrollView, { style: styles.list },
      items.map((item, index) => 
        React.createElement(RN.View, { 
          key: index,
          style: styles.item 
        },
          React.createElement(RN.TouchableOpacity, {
            style: [styles.checkbox, item.done && styles.checked],
            onPress: () => {
              item.done = !item.done;
              // Trigger re-render
              React.useState({})[1]({});
            }
          }),
          React.createElement(RN.Text, { 
            style: styles.itemText 
          }, item.text),
          item.time && React.createElement(RN.Text, { 
            style: styles.time 
          }, item.time)
        )
      )
    ),
    React.createElement(RN.TouchableOpacity, {
      style: styles.errorButton,
      onPress: () => throwError(new Error('Button error triggered'))
    },
      React.createElement(RN.Text, { style: styles.buttonText }, 
        'Trigger Error'
      )
    )
  );
}
