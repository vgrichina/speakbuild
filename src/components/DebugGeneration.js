import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'expo-router';
import * as RN from 'react-native';
import { widgetStorage } from '../services/widgetStorage';
import { createComponentGeneration } from '../services/componentGeneration';
import { formatExamples } from '../services/componentExamples';
import testCases from '../evaluation/generationTestCases.json';
import { ExpoModules } from '../expo-modules';
import { ViewCode } from './ViewCode';
import { ErrorBoundary } from './ErrorBoundary';

import { createComponent, renderComponent } from '../utils/componentUtils';

const DebugGeneration = forwardRef(({ onClose, selectedModel, apiKey }, ref) => {
  const router = useRouter();
  const [widgets, setWidgets] = useState([]);
  const [generating, setGenerating] = useState(null);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

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
      const abortController = new AbortController();
      
      // Get formatted examples
      const examplesText = await formatExamples();
      
      // Create component generation with callbacks
      const generation = createComponentGeneration(testCase, {
        examplesText,
        onComplete: async (result) => {
          if (result?.code) {
            await widgetStorage.store(testCase.widgetUrl, result.code);
          }
        },
        onError: (error) => {
          console.error('Error generating component:', error);
        },
        selectedModel,
        apiKey
      });
      
      // Start generation
      await generation.start();
      await loadWidgets();
    } finally {
      setGenerating(null);
    }
  };

  const styles = {
    container: {
      flex: 1,
      backgroundColor: '#1a1a1a',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000
    },
    list: {
      flex: 1
    },
    item: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#333'
    },
    description: {
      fontSize: 16,
      marginBottom: 4,
      color: '#fff'
    },
    url: {
      fontSize: 12,
      color: '#999',
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
      color: '#999',
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

  const generateAllWidgets = async () => {
    // If already generating, don't start again
    if (isGeneratingAll) {
      console.log('Already generating all widgets, ignoring request');
      return false;
    }

    console.log('Starting generation of all widgets');
    setIsGeneratingAll(true);
    for (const widget of widgets) {
      if (!widget.stored) {
        console.log('Generating widget:', widget.widgetUrl);
        await generateWidget(widget);
      }
    }
    console.log('Finished generating all widgets');
    setIsGeneratingAll(false);
    return true; // Return success to caller
  };

  useImperativeHandle(ref, () => ({
    generateAllWidgets,
    isGeneratingAll: () => isGeneratingAll
  }));

  return React.createElement(RN.View, { style: styles.container },
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
                  backgroundColor: '#ffffff',
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3
                }
              },
                (() => {
                  try {
                    const GeneratedComponent = createComponent(widget.stored.code);
                    return renderComponent(GeneratedComponent, widget.params);
                  } catch (error) {
                    console.error('Component creation error:', error);
                    return React.createElement(RN.Text, {
                      style: { color: '#DC2626' }
                    }, `Error creating component: ${error.message}`);
                  }
                })()
              ),
              React.createElement(RN.TouchableOpacity, {
                style: [
                  styles.generateButton,
                  { 
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8
                  }
                ],
                onPress: () => setSelectedWidget(widget)
              },
                React.createElement(RN.Text, { style: styles.buttonText },
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
    selectedWidget && (() => {
      console.log('ViewSource - code preview:', selectedWidget.stored.code?.slice(0, 100) + '...');
      router.push({
        pathname: 'code-viewer',
        params: { code: selectedWidget.stored.code }
      });
      setSelectedWidget(null);
      return null;
    })()
  );
});

export default DebugGeneration;
