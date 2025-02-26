import { View } from 'react-native';
import { ViewCode } from '../src/components/ViewCode';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function CodeViewerScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const code = params.code || '';

    return (
        <View style={{ flex: 1 }}>
            <ViewCode
                onClose={() => router.dismiss()}
                code={code}
                showHeader={false}
            />
        </View>
    );
}
