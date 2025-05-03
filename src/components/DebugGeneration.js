import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
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
  const [generating, setGenerating] = useState([]);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const activeGenerationsRef = useRef(new Map());

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

  const generateWidget = (testCase) => {
    // Add this URL to the generating array
    setGenerating(prev => [...prev, testCase.widgetUrl]);
    try {
      const abortController = new AbortController();
      
      // Get formatted examples
      const examplesText = await formatExamples();
      
      // Create component generation with callbacks
      const generation = createComponentGeneration(testCase, {
        examplesText,
        onComplete: async (result) => {
          if (result?.code) {
            // Store the result
            await widgetStorage.store(testCase.widgetUrl, result.code);
            // Update UI when this specific generation completes
            setGenerating(prev => prev.filter(url => url !== testCase.widgetUrl));
            loadWidgets();
          }
        },
        onError: (error) => {
          console.error('Error generating component:', error);
          setGenerating(prev => prev.filter(url => url !== testCase.widgetUrl));
        },
        selectedModel,
        apiKey
      });

      
      // Start generation
      // Store in our map of active generations
      activeGenerationsRef.current.set(testCase.widgetUrl, generation);

      // Start generation without awaiting
      generation.start();

      // Return the generation for those who want to await
      return generation;
    } catch (error) {
      console.error('Error setting up generation:', error);
      setGenerating(prev => prev.filter(url => url !== testCase.widgetUrl));
      return Promise.reject(error);
    }
  };

  const stopGeneration = () => {
    console.log('Stopping all generations');

    // Abort all active generations
    for (const [url, generation] of activeGenerationsRef.current.entries()) {
      console.log('Aborting generation for:', url);
      generation.abort();
    }

    // Clear the map
    activeGenerationsRef.current.clear();

    // Reset states
    setIsGeneratingAll(false);
    setGenerating([]);
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

    // Get widgets that need generation
    const widgetsToGenerate = widgets.filter(widget => !widget.stored);

    if (widgetsToGenerate.length === 0) {
      setIsGeneratingAll(false);
      return true;
    }

    // Start all generations in parallel
    const generationPromises = widgetsToGenerate.map(widget => {
      console.log('Starting generation for:', widget.widgetUrl);
      return generateWidget(widget);
    });

    // Wait for all to complete
    try {
      await Promise.all(generationPromises);
      console.log('All widget generations completed');
    } finally {
      setIsGeneratingAll(false);
    }

    return true; // Return success to caller
  };

  useImperativeHandle(ref, () => ({
    generateAllWidgets,
    isGeneratingAll: () => isGeneratingAll,
    stopGeneration
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
                generating.includes(widget.widgetUrl) && { opacity: 0.5 }
              ],
              onPress: async () => {
                if (generating.includes(widget.widgetUrl)) return;
                generateWidget(widget);
              }
            },
              generating.includes(widget.widgetUrl) && 
                React.createElement(RN.ActivityIndicator, { 
                  size: "small",
                  color: "#fff"
                }),
              React.createElement(RN.Text, { style: styles.buttonText },
                generating.includes(widget.widgetUrl) ? 
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
