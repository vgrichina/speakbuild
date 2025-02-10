import React from 'react';
import * as RN from 'react-native';
import { ExpoModules } from '../expo-modules';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useErrorBoundary } from '../hooks/useErrorBoundary';

export const createComponent = (code) => {
    const componentCode = `
        const React = arguments[0];
        const RN = arguments[1];
        const Expo = arguments[2];
        const { useState } = React;
        const useErrorBoundary = arguments[3];
        ${code}
        return Component;
    `;
    const createFn = new Function(componentCode);
    return createFn(React, RN, ExpoModules, useErrorBoundary);
};

export const renderComponent = (Component, params) => {
    return React.createElement(ErrorBoundary, null,
        React.createElement(Component, params)
    );
};
