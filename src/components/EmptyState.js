import React from 'react';
import * as RN from 'react-native';

export function EmptyState() {
    return React.createElement(RN.View, 
        { style: { padding: 24, alignItems: 'center', maxWidth: 400 } },
        React.createElement(RN.Text, 
            { style: { fontSize: 24, fontWeight: '600', marginBottom: 12, textAlign: 'center' } },
            "The App"
        ),
        React.createElement(RN.Text,
            { style: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 } },
            "Hold mic and say what you want to do"
        ),
        React.createElement(RN.Text,
            { style: { fontSize: 18, fontWeight: '500', marginBottom: 16, color: '#333' } },
            "Try saying:"
        ),
        React.createElement(RN.View,
            { style: { width: '100%', gap: 16 } },
            [
                "Let's play Tic Tac Toe",
                "Set a 2 minute timer",
                "Show me a lasagna recipe"
            ].map((example, index) =>
                React.createElement(RN.View,
                    { 
                        key: index,
                        style: { flexDirection: 'row', alignItems: 'center', gap: 12 }
                    },
                    React.createElement(RN.View,
                        { 
                            style: { 
                                width: 8, 
                                height: 8, 
                                borderRadius: 4, 
                                backgroundColor: '#3B82F6',
                                opacity: 0.8
                            } 
                        }
                    ),
                    React.createElement(RN.Text,
                        { style: { color: '#333', flex: 1, fontSize: 16 } },
                        `"${example}"`
                    )
                )
            )
        )
    );
}
