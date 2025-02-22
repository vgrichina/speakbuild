import { View } from 'react-native';
import { ViewCode } from '../src/components/ViewCode';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function CodeViewerScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    console.log('CodeViewer - raw params:', params);
    const code = params.code ? decodeURIComponent(params.code) : '';
    console.log('CodeViewer - decoded code:', code?.slice(0, 100) + '...');

    return (
        <View style={{ flex: 1 }}>
            <ViewCode
                isVisible={true}
                onClose={() => router.dismiss()}
                code={code}
            />
        </View>
    );
}
