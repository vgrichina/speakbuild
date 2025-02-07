import React, { useState, useEffect } from 'react';
import * as RN from 'react-native';
import { widgetStorage } from '../services/widgetStorage';
import { streamComponent } from '../services/componentGenerator';
import testCases from '../evaluation/generationTestCases.json';
import { ExpoModules } from '../expo-modules';

const createComponentFromCode = (code, params = {}) => {
  try {
    const componentCode = `
      const React = arguments[0];
      const RN = arguments[1];
      const Expo = arguments[2];
      const { useState } = React;
      ${code}
      return Component;
    `;
    const createComponent = new Function(componentCode);
    const GeneratedComponent = createComponent(React, RN, ExpoModules);
    return React.createElement(GeneratedComponent, params);
  } catch (error) {
    console.error('Component render error:', error);
    return React.createElement(RN.Text, {
      style: { color: '#DC2626' }
    }, `Error rendering component: ${error.message}`);
  }
};

function DebugGeneration({ onClose }) {
  const [widgets, setWidgets] = useState([]);
  const [generating, setGenerating] = useState(null);
  const [selectedWidget, setSelectedWidget] = useState(null);

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = async () => {
    const widgetStates = await Promise.all(
      testCases.testCases.map(async testCase => {
        const stored = await widgetStorage.find(testCase.widgetUrl);
        return {
          ...testCase,
          stored: stored ? {
            code: stored.code,
            timestamp: stored.timestamp
          } : null
        };
      })
    );
    setWidgets(widgetStates);
  };

  const generateWidget = async (testCase) => {
    setGenerating(testCase.widgetUrl);
    try {
      let componentCode = '';
      for await (const chunk of streamComponent(
        testCase,
        null,
        'anthropic/claude-3.5-sonnet',
        new AbortController()
      )) {
        if (chunk.content) {
          componentCode += chunk.content;
        }
      }

      // Extract code from markdown code block
      const codeMatch = componentCode.match(/```(?:jsx|javascript|)?\s*([\s\S]*?)```/);
      if (!codeMatch) {
        throw new Error('No code block found in response');
      }
      const code = codeMatch[1].trim();

      await widgetStorage.store(testCase.widgetUrl, code);
      await loadWidgets();
    } finally {
      setGenerating(null);
    }
  };

  const styles = {
    container: {
      flex: 1,
      backgroundColor: '#fff',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee'
    },
    title: {
      fontSize: 18,
      fontWeight: '500'
    },
    closeButton: {
      fontSize: 24,
      padding: 8
    },
    list: {
      flex: 1
    },
    item: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee'
    },
    description: {
      fontSize: 16,
      marginBottom: 4
    },
    url: {
      fontSize: 12,
      color: '#666',
      marginBottom: 8
    },
    generateButton: {
      backgroundColor: '#007AFF',
      padding: 8,
      borderRadius: 6,
      alignSelf: 'flex-start'
    },
    buttonText: {
      color: '#fff',
      fontSize: 14
    },
    timestamp: {
      fontSize: 12,
      color: '#666',
      marginTop: 4
    },
    modalContainer: {
      flex: 1,
      backgroundColor: '#fff'
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee'
    },
    modalContent: {
      flex: 1,
      padding: 16
    },
    code: {
      fontFamily: 'monospace',
      fontSize: 14,
      backgroundColor: '#f5f5f5',
      padding: 12,
      borderRadius: 8
    }
  };

  return React.createElement(RN.View, { style: styles.container },
    React.createElement(RN.View, { style: styles.header },
      React.createElement(RN.Text, { style: styles.title }, "Generated Widgets"),
      React.createElement(RN.View, { style: { flexDirection: 'row', alignItems: 'center', gap: 12 } },
        React.createElement(RN.TouchableOpacity, {
          style: [
            styles.generateButton, 
            generating && { opacity: 0.5 }
          ],
          onPress: async () => {
            if (generating) return;
            const ungenerated = widgets.filter(w => !w.stored);
            if (ungenerated.length === 0) {
              RN.Alert.alert('No widgets to generate', 'All widgets have already been generated.');
              return;
            }
            for (const widget of ungenerated) {
              await generateWidget(widget);
            }
          }
        },
          React.createElement(RN.Text, { style: styles.buttonText },
            generating ? "Generating..." : "Generate All"
          )
        ),
        React.createElement(RN.TouchableOpacity, { onPress: onClose },
          React.createElement(RN.Text, { style: styles.closeButton }, "×")
        )
      )
    ),
    React.createElement(RN.ScrollView, { style: styles.list },
      widgets.map((widget, index) => 
        React.createElement(RN.View, { 
          key: index,
          style: styles.item
        },
          React.createElement(RN.Text, { style: styles.description },
            widget.description
          ),
          React.createElement(RN.Text, { style: styles.url },
            widget.widgetUrl
          ),
          widget.stored ? 
            React.createElement(RN.View, null,
              React.createElement(RN.View, { 
                style: {
                  backgroundColor: '#f5f5f5',
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 8
                }
              },
                createComponentFromCode(widget.stored.code, widget.params)
              ),
              React.createElement(RN.TouchableOpacity, {
                onPress: () => setSelectedWidget(widget)
              },
                React.createElement(RN.Text, { style: styles.generateButton },
                  "View Code"
                )
              ),
              React.createElement(RN.Text, { style: styles.timestamp },
                `Generated: ${new Date(widget.stored.timestamp).toLocaleString()}`
              )
            ) :
            React.createElement(RN.TouchableOpacity, {
              style: [
                styles.generateButton, 
                { 
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8
                },
                generating === widget.widgetUrl && { opacity: 0.5 }
              ],
              onPress: async () => {
                if (generating === widget.widgetUrl) return;
                await generateWidget(widget);
                // Refresh widgets list after generation
                await loadWidgets();
              }
            },
              generating === widget.widgetUrl && 
                React.createElement(RN.ActivityIndicator, { 
                  size: "small",
                  color: "#fff"
                }),
              React.createElement(RN.Text, { style: styles.buttonText },
                generating === widget.widgetUrl ? 
                  "Generating..." : 
                  "Generate Now"
              )
            )
        )
      )
    ),
    selectedWidget && React.createElement(RN.Modal, {
      visible: true,
      animationType: "slide",
      onRequestClose: () => setSelectedWidget(null)
    },
      React.createElement(RN.View, { style: styles.modalContainer },
        React.createElement(RN.View, { style: styles.modalHeader },
          React.createElement(RN.Text, { style: styles.title },
            selectedWidget.description
          ),
          React.createElement(RN.TouchableOpacity, {
            onPress: () => setSelectedWidget(null)
          },
            React.createElement(RN.Text, { style: styles.closeButton }, "×")
          )
        ),
        React.createElement(RN.ScrollView, { style: styles.modalContent },
          React.createElement(RN.Text, { style: styles.code },
            selectedWidget.stored.code
          )
        )
      )
    )
  );
}

export default DebugGeneration;
